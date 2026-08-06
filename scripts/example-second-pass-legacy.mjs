// 临时脚本：二轮补跑"请求输入"类提示词（追加领域示例输入后重新生成）
// 用法：DEEPSEEK_KEY=sk-... node scripts/example-second-pass-legacy.mjs
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const KEY = process.env.DEEPSEEK_KEY;
const OUT_FILE = 'scripts/data/batch-outputs.json';
const IDS_FILE = 'scripts/data/need-input-ids.json';

function getEnv(k) {
  const env = fs.readFileSync('.env.local', 'utf8').split('\n').filter(Boolean).filter(l => !l.startsWith('#'));
  const line = env.find(x => x.startsWith(k + '='));
  return line ? line.slice(k.length + 1).trim().replace(/^"|"$/g, '') : undefined;
}

const ids = JSON.parse(fs.readFileSync(IDS_FILE, 'utf8'));
const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'));
const { data } = await supabase.from('prompts').select('id, title, content').in('id', ids);
const prompts = data || [];
console.log('二轮补跑:', prompts.length, '条');

// 按领域生成示例输入
function sampleInput(title, content) {
  const t = (title + ' ' + (content || '')).toLowerCase();
  if (/(sql|query|database|schema|table)/.test(t)) {
    return `\n\n## Sample data\n\n\`\`\`\nusers(id, name, country, signup_date)\norders(id, user_id, amount, created_at)\n\nSample rows:\n(1, 'Alice', 'US', '2026-01-15'), (2, 'Bob', 'DE', '2026-02-01'),\n(3, 'Carol', 'US', '2026-03-10'), (4, 'Dave', 'FR', '2026-03-22')\n\`\`\``;
  }
  if (/(code|function|script|pr\b|diff|review the|readability|refactor)/.test(t)) {
    return `\n\n## Sample input\n\n\`\`\`javascript\nfunction processOrder(order) {\n  const total = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);\n  if (order.coupon && order.coupon.type === 'percent') {\n    return total * (1 - order.coupon.value / 100);\n  }\n  if (order.coupon && order.coupon.type === 'fixed') {\n    return Math.max(0, total - order.coupon.value);\n  }\n  return total;\n}\n\`\`\``;
  }
  if (/(data|retention|churn|feedback|dataset|metric|analyz|behavior|survey)/.test(t)) {
    return `\n\n## Sample data\n\n| week | signups | retained_w1 | avg_session_min |\n|------|---------|-------------|-----------------|\n| 1    | 1200    | 384         | 14.2            |\n| 2    | 980     | 310         | 15.8            |\n| 3    | 1120    | 361         | 13.9            |\n| 4    | 1050    | 346         | 16.4            |`;
  }
  return `\n\n## Sample input\n\nA representative sample of the kind of input this prompt is designed to process, provided so the full workflow can be demonstrated end to end.`;
}

// DeepSeek 调用（复用重试逻辑）
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function callDeepSeek(content, attempt = 0) {
  try {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'deepseek-v4-flash', messages: [{ role: 'user', content }], max_tokens: 1024, temperature: 0.7 }),
    });
    if (res.status === 429 || res.status >= 500) {
      if (attempt < 3) { await sleep(2000 * (attempt + 1)); return callDeepSeek(content, attempt + 1); }
      throw new Error('rate/5xx (' + res.status + ')');
    }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const j = await res.json();
    const out = j.choices?.[0]?.message?.content;
    if (!out || !out.trim()) throw new Error('empty');
    return out.trim();
  } catch (e) {
    if (attempt < 3) { await sleep(2000 * (attempt + 1)); return callDeepSeek(content, attempt + 1); }
    throw e;
  }
}

// 读现有结果，重跑这 42 条
let results = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
let ok = 0, fail = 0;
for (let i = 0; i < prompts.length; i++) {
  const p = prompts[i];
  try {
    const out = await callDeepSeek(p.content + sampleInput(p.title, p.content));
    results[p.id] = { title: p.title, output: out };
    ok++;
  } catch (e) {
    results[p.id] = { title: p.title, error: 'second-pass: ' + e.message };
    fail++;
  }
  if ((i + 1) % 5 === 0) {
    fs.writeFileSync(OUT_FILE, JSON.stringify(results));
    process.stdout.write(`\r二轮进度 ${i + 1}/${prompts.length} | 成功 ${ok} | 失败 ${fail}`);
  }
}
fs.writeFileSync(OUT_FILE, JSON.stringify(results));
console.log('\n二轮完成 | 成功 ' + ok + ' | 失败 ' + fail);
