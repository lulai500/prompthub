// 临时脚本：用 DeepSeek 真实批量测试 561 条提示词
// 流程：拉取提示词 → 填充变量 → DeepSeek 生成 → 输出到 batch-outputs.json（断点续跑）
// 用法：DEEPSEEK_KEY=sk-... node scripts/example-batch-test.mjs
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const KEY = process.env.DEEPSEEK_KEY;
const OUT_FILE = 'scripts/data/batch-outputs.json';

// ---- 读取 .env.local 的 Supabase 配置 ----
function getEnv(k) {
  const env = fs.readFileSync('.env.local', 'utf8').split('\n').filter(Boolean).filter(l => !l.startsWith('#'));
  const line = env.find(x => x.startsWith(k + '='));
  return line ? line.slice(k.length + 1).trim().replace(/^"|"$/g, '') : undefined;
}

// ---- 1. 拉取全部已发布提示词 ----
const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'));
const { data } = await supabase.from('prompts').select('id, title, content').eq('is_published', true);
const prompts = data || [];
console.log('拉取提示词:', prompts.length);

// ---- 2. 断点续跑 ----
let results = {};
if (fs.existsSync(OUT_FILE)) {
  results = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
  console.log('已有检查点:', Object.keys(results).length, '条');
}
const todo = prompts.filter(p => !results[p.id] || (!results[p.id].output && !results[p.id].error));
console.log('待处理:', todo.length);

// ---- 3. 变量填充（常见占位符默认值）----
const DEFAULTS = {
  max_words: '150', max_tokens: '1024', word_count: '150',
  character_name: 'Lira', role: 'protagonist', species: 'elf', age: '200', tone: 'warm and mysterious',
  genre: 'fantasy', magic_level: 'high', world_name: 'Aetheria',
  topic: 'AI coding agents in 2026', depth: 'advanced', format: 'executive summary',
  code: 'function add(a, b) { return a + b; }',
  tech_stack: 'Next.js + Supabase', bug_description: 'API returns 500 on empty payload',
  expected_behavior: 'returns 200 with an empty list', actual_behavior: 'returns 500',
  error_messages: 'TypeError: Cannot read properties of undefined (reading \'data\')',
  source_language: 'English', target_language: 'Spanish', context: 'marketing email',
  audience: 'tech-savvy professionals', text: 'The quick brown fox jumps over the lazy dog.',
  project_path: 'my-project', title: 'My Project', content: 'Sample content goes here.',
  query: 'weekly retention by cohort', template_id: '1', prompt: 'Write a concise summary',
  email: 'user@example.com', name: 'Alex', message: 'Hello, I need help with my order.',
  requirements: 'A REST API with CRUD endpoints', test_context: 'unit tests for the API',
};
function fillVars(text) {
  return text.replace(/\{\{?\s*([a-zA-Z0-9_]+)\s*\}?\}/g, (m, name) => DEFAULTS[name] ?? 'SAMPLE_' + name);
}

// ---- 4. DeepSeek 调用（带重试）----
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function callDeepSeek(content, attempt = 0) {
  try {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        messages: [{ role: 'user', content }],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });
    if (res.status === 429 || res.status >= 500) {
      if (attempt < 3) { await sleep(2000 * (attempt + 1)); return callDeepSeek(content, attempt + 1); }
      throw new Error('rate/5xx after retries (' + res.status + ')');
    }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const j = await res.json();
    const out = j.choices?.[0]?.message?.content;
    if (!out || !out.trim()) throw new Error('empty response');
    return out.trim();
  } catch (e) {
    if (attempt < 3) { await sleep(2000 * (attempt + 1)); return callDeepSeek(content, attempt + 1); }
    throw e;
  }
}

// ---- 5. 并发队列 ----
const CONCURRENCY = 5;
let idx = 0, okCount = 0, failCount = 0, done = 0;
async function worker() {
  while (idx < todo.length) {
    const p = todo[idx++];
    try {
      const out = await callDeepSeek(fillVars(p.content));
      results[p.id] = { title: p.title, output: out };
      okCount++;
    } catch (e) {
      results[p.id] = { title: p.title, error: e.message };
      failCount++;
    }
    done++;
    if (done % 10 === 0) {
      fs.writeFileSync(OUT_FILE, JSON.stringify(results));
      process.stdout.write(`\r进度 ${done}/${todo.length} | 成功 ${okCount} | 失败 ${failCount}`);
    }
  }
}
const workers = Array.from({ length: CONCURRENCY }, worker);
await Promise.all(workers);
fs.writeFileSync(OUT_FILE, JSON.stringify(results));
console.log('\n全部完成 | 成功 ' + okCount + ' | 失败 ' + failCount + ' | 输出: ' + OUT_FILE);
