// 临时脚本：把 DeepSeek 批量测试结果写入 example_output
// 用法：SUPABASE_PAT=sbp_... node scripts/apply-batch-outputs.mjs
import fs from 'fs';

const PAT = process.env.SUPABASE_PAT;
const REF = 'azwbgluryvlstsxcdvje';
const OUT_FILE = 'scripts/batch-outputs.json';

const results = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
// 用美元引号 $$...$$ 包裹（内容含反斜杠/单引号时无需转义）
const rows = Object.entries(results)
  .filter(([, v]) => v.output)
  .map(([id, v]) => ({ id: Number(id), out: v.output }));

console.log('待写入:', rows.length, '条');

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

const BATCH = 30;
let done = 0;
for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH);
  // 每批用唯一分隔标签 $phN$（内容里几乎不可能出现，避免 $$ 提前终止引号）
  const tag = `$ph${i}$`;
  const values = batch.map((r) => `(${r.id}, ${tag}${r.out}${tag})`).join(',\n');
  const sql = `UPDATE public.prompts p SET example_output = v.out
    FROM (VALUES\n${values}\n) AS v(id, out)
    WHERE p.id = v.id;`;
  try {
    await apiQuery(sql);
    done += batch.length;
    process.stdout.write('\r已写入 ' + done + '/' + rows.length);
  } catch (e) {
    console.log('\n批次失败 (' + i + '):', e.message.slice(0, 150));
  }
}
console.log('\n完成。写入 ' + done + ' 条');
