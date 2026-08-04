// 临时脚本：用 DeepSeek 批量生成新技能/工作流（内容扩量），并写入数据库
// 用法：DEEPSEEK_KEY=sk-... SUPABASE_PAT=sbp-... node scripts/generate-content.mjs
import fs from 'fs';

const KEY = process.env.DEEPSEEK_KEY;
const PAT = process.env.SUPABASE_PAT;
const REF = 'azwbgluryvlstsxcdvje';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callDeepSeek(prompt, attempt = 0) {
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'deepseek-v4-flash',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 8000,
      temperature: 0.8,
    }),
  });
  if (res.status === 429 || res.status >= 500) {
    if (attempt < 3) { await sleep(3000 * (attempt + 1)); return callDeepSeek(prompt, attempt + 1); }
    throw new Error('rate/5xx ' + res.status);
  }
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const j = await res.json();
  return j.choices?.[0]?.message?.content || '';
}

function extractJson(text) {
  // 去掉 ```json 围栏，取第一个 [ ... ]
  const cleaned = text.replace(/```json|```/g, '');
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start === -1 || end === -1) throw new Error('未找到 JSON 数组');
  return JSON.parse(cleaned.slice(start, end + 1));
}

const SKILL_PROMPT = (n, existingSlugs) => `Generate ${n} distinct AI skills as a JSON array. Each object:
{"title":"...","slug":"kebab-case-unique","description":"one sentence","content":"SKILL.md body: YAML frontmatter (name, description) then \\n---\\n then concrete instructions: when to use, workflow steps, output format, best practices","skill_format":"claude-skill","compatible_models":["Claude 3.7 Sonnet","GPT-4o"],"install_instructions":"2-3 install steps","example_output":"short representative output","category":"coding|writing|research-agents|general","tags":["tag1","tag2","tag3"]}

Requirements:
- Content must be a complete, genuinely useful skill in English, 150-350 words
- Slugs must NOT be any of: ${existingSlugs.join(', ') || '(none)'}
- Spread across all four categories evenly
- Tags lowercase, 3-5 per skill
- Return ONLY the JSON array, no markdown, no commentary`;

const WORKFLOW_PROMPT = (n, existingSlugs) => `Generate ${n} distinct AI workflows as a JSON array. Each object:
{"title":"...","slug":"kebab-case-unique","description":"one sentence","steps":[{"step":1,"title":"...","tool":"...","action":"...","config":"..."}],"workflow_type":"agent-orchestration|automation-template|dev-scaffold","tools_required":["Tool1","Tool2"],"config_content":"a short config/DSL snippet","expected_output":"what the workflow produces","tips":"one practical tip","category":"content-pipeline|dev-workflow|data-research|general","tags":["tag1","tag2"]}

Requirements:
- 4-7 steps each, realistic and actionable
- Slugs must NOT be any of: ${existingSlugs.join(', ') || '(none)'}
- Spread across all four categories
- Tags lowercase, 3-5
- Return ONLY the JSON array, no markdown, no commentary`;

async function apiQuery(sql) {
  const res = await fetch('https://api.supabase.com/v1/projects/' + REF + '/database/query', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + PAT, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (res.status !== 201 && res.status !== 200) throw new Error(res.status + ': ' + text.slice(0, 200));
  return text;
}

// 读取已有 slug，避免重复
const existingRes = await fetch('https://api.supabase.com/v1/projects/' + REF + '/database/query', {
  method: 'POST',
  headers: { Authorization: 'Bearer ' + PAT, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: "SELECT slug FROM public.skills UNION SELECT slug FROM public.workflows;" }),
});
const existing = JSON.parse(await existingRes.text()).map((r) => r.slug).filter(Boolean);
console.log('已有 slug:', existing.length);

// ---- 生成技能（小批量：5/批，12 批 = 60）----
const skills = [];
for (let i = 0; i < 12; i++) {
  const used = [...existing, ...skills.map((s) => s.slug)];
  try {
    const text = await callDeepSeek(SKILL_PROMPT(5, used));
    const batch = extractJson(text);
    skills.push(...batch);
    console.log('技能批 ' + (i + 1) + ': +' + batch.length + ' (累计 ' + skills.length + ')');
  } catch (e) {
    console.log('技能批 ' + (i + 1) + ' 失败: ' + e.message.slice(0, 120));
  }
  await sleep(1500);
}

// ---- 生成工作流（小批量：4/批，8 批 = 32）----
const workflows = [];
for (let i = 0; i < 8; i++) {
  const used = [...existing, ...workflows.map((w) => w.slug)];
  try {
    const text = await callDeepSeek(WORKFLOW_PROMPT(4, used));
    const batch = extractJson(text);
    workflows.push(...batch);
    console.log('工作流批 ' + (i + 1) + ': +' + batch.length + ' (累计 ' + workflows.length + ')');
  } catch (e) {
    console.log('工作流批 ' + (i + 1) + ' 失败: ' + e.message.slice(0, 120));
  }
  await sleep(1500);
}

// ---- 校验 + 写入 ----
function esc(s) { return (s || '').replace(/\$\$/g, '$ $'); }
// 开头三个 $ 得到两个字面 $ + 插值，结尾两个 $ 收尾（JS 模板字符串 $ 语义）
function tag(t) { return `$$${esc(t)}$$`; }

let inserted = 0;
for (const s of skills) {
  if (!s.title || !s.content || !s.slug) { console.log('跳过无效技能', JSON.stringify(s).slice(0, 80)); continue; }
  const cat = ['coding', 'writing', 'research-agents', 'general'].includes(s.category) ? s.category : 'general';
  const sql = `INSERT INTO public.skills (title, slug, description, content, skill_format, compatible_models, install_instructions, example_output, category_id, tags, is_published)
  VALUES (${tag(s.title)}, ${tag(s.slug)}, ${tag(s.description)}, ${tag(s.content)}, 'claude-skill',
    ARRAY[${(s.compatible_models || []).map((m) => "'" + esc(m).replace(/'/g, "''") + "'").join(',')}],
    ${tag(s.install_instructions || '')}, ${tag(s.example_output || '')},
    (SELECT id FROM public.skill_categories WHERE slug = '${cat}'), ARRAY[${(s.tags || []).map((t) => "'" + esc(t).replace(/'/g, "''") + "'").join(',')}], true)
  ON CONFLICT (slug) DO NOTHING;`;
  try { await apiQuery(sql); inserted++; } catch (e) { console.log('技能写入失败 [' + s.slug + ']: ' + e.message.slice(0, 100)); }
}
console.log('技能入库:', inserted, '/' + skills.length);

let wfInserted = 0;
for (const w of workflows) {
  if (!w.title || !w.slug) { console.log('跳过无效工作流', JSON.stringify(w).slice(0, 80)); continue; }
  const cat = ['content-pipeline', 'dev-workflow', 'data-research', 'general'].includes(w.category) ? w.category : 'general';
  const steps = JSON.stringify(w.steps || []).replace(/\$\$/g, '$ $');
  const sql = `INSERT INTO public.workflows (title, slug, description, steps, workflow_type, tools_required, config_content, expected_output, tips, category_id, tags, is_published)
  VALUES (${tag(w.title)}, ${tag(w.slug)}, ${tag(w.description)}, $$${steps}$$,
    ${tag(w.workflow_type || 'agent-orchestration')},
    ARRAY[${(w.tools_required || []).map((m) => "'" + esc(m).replace(/'/g, "''") + "'").join(',')}],
    ${tag(w.config_content || '')}, ${tag(w.expected_output || '')}, ${tag(w.tips || '')},
    (SELECT id FROM public.workflow_categories WHERE slug = '${cat}'), ARRAY[${(w.tags || []).map((t) => "'" + esc(t).replace(/'/g, "''") + "'").join(',')}], true)
  ON CONFLICT (slug) DO NOTHING;`;
  try { await apiQuery(sql); wfInserted++; } catch (e) { console.log('工作流写入失败 [' + w.slug + ']: ' + e.message.slice(0, 100)); }
}
console.log('工作流入库:', wfInserted, '/' + workflows.length);
console.log('完成。新增技能 ' + inserted + '，新增工作流 ' + wfInserted);
