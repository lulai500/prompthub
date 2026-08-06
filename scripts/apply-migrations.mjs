// ============================================================
// 应用 Supabase 迁移（Management API：POST /v1/projects/{ref}/database/query）
// 用法：SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/apply-migrations.mjs
// 生成 token：Supabase Dashboard → 左下角账户 → Account Settings → Access Tokens
//   → Generate new token（sbp_ 开头）
// 幂等：迁移文件均含 IF NOT EXISTS / DROP IF EXISTS，可安全重跑
// ============================================================

import { readFileSync } from 'fs';
import { resolve } from 'path';

const MIGRATIONS = [
  'migration-feedback.sql',
  'migration-client-tasks-error.sql',
  'migration-client-projects-self-create.sql',
  'migration-clients-email.sql',
  'migration-clients-archived.sql',
  'migration-fix-profile-username-collision.sql',
];

function getProjectRef() {
  if (process.env.SUPABASE_PROJECT_REF) return process.env.SUPABASE_PROJECT_REF;
  try {
    const env = readFileSync('.env.local', 'utf8');
    const m = env.match(/NEXT_PUBLIC_SUPABASE_URL="?https:\/\/([a-z0-9]+)\.supabase\.co/i);
    if (m) return m[1];
  } catch {
    // 忽略，交给下方报错
  }
  throw new Error(
    '无法确定项目 ref。请设置 SUPABASE_PROJECT_REF，或确认 .env.local 含 NEXT_PUBLIC_SUPABASE_URL'
  );
}

async function main() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    console.error(
      '缺少 SUPABASE_ACCESS_TOKEN（sbp_ 开头的 personal access token，不是 publishable/secret key）。\n' +
        '生成：Supabase Dashboard → 左下角账户菜单 → Account Settings → Access Tokens → Generate new token'
    );
    process.exit(1);
  }
  const ref = getProjectRef();
  console.log(`目标项目 ref: ${ref}`);

  for (const file of MIGRATIONS) {
    const sql = readFileSync(resolve('supabase/migrations', file), 'utf8');
    console.log(`\n== 执行 ${file} (${sql.length} bytes) ==`);
    try {
      const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
      });
      const text = await res.text();
      console.log(`HTTP ${res.status}`);
      console.log(res.ok ? `OK: ${text.slice(0, 300)}` : `FAIL: ${text.slice(0, 500)}`);
    } catch (e) {
      console.error(`请求失败: ${e.message}`);
    }
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
