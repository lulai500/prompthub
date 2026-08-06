// ============================================================
// 把 examples/outputs/*.md 写入线上 skills.example_output
// 用法：cd prompthub && node scripts/content-load-examples.mjs
// - 用 SUPABASE_SERVICE_ROLE_KEY（绕过 RLS），不触碰前端 key
// - 更新前把旧 example_output 备份到 examples/skill-examples-backup.json
// - 幂等：重复执行只是覆盖为同一内容
// ============================================================

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---- 解析 .env.local（容忍 `KEY = "value"` / `KEY=value` / CRLF）----
const envText = readFileSync(join(ROOT, '.env.local'), 'utf8');
function getEnv(key) {
  const m = envText.match(new RegExp(`^\\s*${key}\\s*=\\s*(.+)$`, 'm'));
  if (!m) return undefined;
  let v = m[1].trim().replace(/\r$/, '');
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
  return v;
}

const URL = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const SERVICE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY');
if (!URL || !SERVICE_KEY) {
  console.error('✗ 缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(URL, SERVICE_KEY);

// ---- 待入库的技能 ----
const EXAMPLES = [
  { slug: 'senior-code-reviewer', file: 'senior-code-reviewer.md' },
  { slug: 'sql-query-optimizer', file: 'sql-query-optimizer.md' },
  { slug: 'blog-post-writer', file: 'blog-post-writer.md' },
  { slug: 'video-script', file: 'video-script.md' },
  { slug: 'deep-research-assistant', file: 'deep-research-assistant.md' },
];

async function main() {
  const backup = { updated_at: new Date().toISOString(), skills: {} };
  let ok = 0;

  for (const { slug, file } of EXAMPLES) {
    // 1. 查技能，拿 id + 旧值
    const { data, error } = await supabase
      .from('skills')
      .select('id, title, example_output')
      .eq('slug', slug)
      .maybeSingle();
    if (error || !data) {
      console.error(`✗ [${slug}] 查询失败: ${error?.message || '技能不存在'}`);
      continue;
    }

    const content = readFileSync(join(ROOT, 'examples', 'outputs', file), 'utf8');
    backup.skills[slug] = {
      id: data.id,
      title: data.title,
      old_example_output: data.example_output ?? '',
    };

    // 2. 更新
    const { error: upErr } = await supabase
      .from('skills')
      .update({ example_output: content, updated_at: new Date().toISOString() })
      .eq('id', data.id);
    if (upErr) {
      console.error(`✗ [${slug}] 更新失败: ${upErr.message}`);
      continue;
    }

    // 3. 回读校验
    const { data: check } = await supabase
      .from('skills')
      .select('example_output')
      .eq('id', data.id)
      .maybeSingle();
    const newLen = check?.example_output?.length ?? 0;
    console.log(
      `✓ [${slug}] id=${data.id} "${data.title}"  example_output: ${(data.example_output ?? '').length} → ${newLen} chars`
    );
    ok++;
  }

  writeFileSync(
    join(ROOT, 'examples', 'skill-examples-backup.json'),
    JSON.stringify(backup, null, 2),
    'utf8'
  );
  console.log(`\n完成：${ok}/${EXAMPLES.length} 个技能已更新，旧值已备份到 examples/skill-examples-backup.json`);
}

main().catch((e) => {
  console.error('脚本异常:', e);
  process.exit(1);
});
