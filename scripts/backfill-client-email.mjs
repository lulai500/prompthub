// ============================================================
// 回填 clients.email：从 auth.users 抓邮箱写入（denormalize）
// 用法：node scripts/backfill-client-email.mjs [--dry-run]
// 依赖 .env.local 的 NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
// 幂等：只处理 email 为空的客户
// ============================================================

import { readFileSync } from 'fs';

function envVal(key) {
  const m = readFileSync('.env.local', 'utf8').match(new RegExp(`^${key}\\s*=\\s*"?([^"\\r\\n]*)"?`, 'm'));
  if (!m) throw new Error(`缺少 ${key} in .env.local`);
  return m[1];
}
const URL = envVal('NEXT_PUBLIC_SUPABASE_URL').replace(/\/$/, '');
const SERVICE = envVal('SUPABASE_SERVICE_ROLE_KEY');
const DRY = process.argv.includes('--dry-run');

const h = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' };

async function main() {
  // 1. 取 email 为空的客户
  const res = await fetch(`${URL}/rest/v1/clients?select=id,account_id,name,email&email=is.null&limit=1000`, { headers: h });
  const clients = await res.json();
  console.log(`待回填客户数: ${clients.length}`);
  if (DRY) { console.log('--dry-run，不写入'); clients.slice(0, 5).forEach((c) => console.log(`  #${c.id} ${c.name}`)); return; }

  let ok = 0, fail = 0;
  for (const c of clients) {
    try {
      const r = await fetch(`${URL}/auth/v1/admin/users/${c.account_id}`, { headers: h });
      const u = await r.json();
      const email = u?.email || u?.user?.email || null;
      if (!email) { fail++; console.log(`  跳过 #${c.id}（无邮箱）`); continue; }
      await fetch(`${URL}/rest/v1/clients?id=eq.${c.id}`, {
        method: 'PATCH',
        headers: { ...h, Prefer: 'return=minimal' },
        body: JSON.stringify({ email }),
      });
      ok++;
      console.log(`  #${c.id} ${c.name} → ${email}`);
    } catch (e) {
      fail++;
      console.log(`  #${c.id} 失败: ${e.message}`);
    }
  }
  console.log(`\n完成: 成功 ${ok}, 失败/跳过 ${fail}`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
