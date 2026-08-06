// ============================================================
// 站主后台 E2E（对 dev server + 真实 Supabase）
// 建临时 owner → 建客户(验证 email 写入) → 项目 CRUD → 重置密码
//          → 批量操作 → 导出 CSV → 页面 200 → 删临时 owner（级联清理）
// 前置：dev server 已启动（http://localhost:3000），.env.local 含真实 key
// 用法：node scripts/e2e-owner-backend.mjs
// ============================================================

import { readFileSync } from 'fs';

const REF = 'azwbgluryvlstsxcdvje';
const APP = 'http://localhost:3000';
const cookieName = `sb-${REF}-auth-token`;

function envVal(key) {
  const m = readFileSync('.env.local', 'utf8').match(new RegExp(`^${key}\\s*=\\s*"?([^"\\r\\n]*)"?`, 'm'));
  if (!m) throw new Error(`缺少 ${key} in .env.local`);
  return m[1];
}
const SUPABASE_URL = envVal('NEXT_PUBLIC_SUPABASE_URL').replace(/\/$/, '');
const ANON = envVal('NEXT_PUBLIC_SUPABASE_ANON_KEY');
const SERVICE = envVal('SUPABASE_SERVICE_ROLE_KEY');

const b64url = (s) => Buffer.from(s, 'utf8').toString('base64url');
const log = (msg) => console.log(`\n== ${msg}`);

async function api(path, { method = 'GET', headers = {}, body, signal } = {}) {
  const res = await fetch(path, {
    method,
    headers: { ...headers },
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text };
}
const svc = (extra = {}) => ({ apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json', ...extra });
const anon = (extra = {}) => ({ apikey: ANON, 'Content-Type': 'application/json', ...extra });

async function main() {
  const email = `owner-e2e-${Date.now()}@workstation.test`;
  const password = 'OwnerE2e!12345';
  let ownerId = null;
  let clientUserId = null;

  try {
    // 1. 建临时 owner
    log('1. 创建临时 owner 账号');
    let r = await api(`${SUPABASE_URL}/auth/v1/admin/users`, { method: 'POST', headers: svc(), body: { email, password, email_confirm: true } });
    if (!r.json?.id) throw new Error(`创建 owner 失败: ${r.text}`);
    ownerId = r.json.id;
    r = await api(`${SUPABASE_URL}/rest/v1/profiles?on_conflict=id`, { method: 'POST', headers: { ...svc(), Prefer: 'resolution=merge-duplicates' }, body: { id: ownerId, username: 'owner-e2e', role: 'owner' } });
    console.log(`owner: ${email}`);

    // 2. 登录
    log('2. 登录');
    r = await api(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: 'POST', headers: anon(), body: { email, password } });
    if (!r.json?.access_token) throw new Error(`登录失败: ${r.text}`);
    const cookie = `${cookieName}=${'base64-' + b64url(JSON.stringify(r.json))}`;

    // 3. 页面
    log('3. GET /admin/clients（owner 应 200）');
    const page = await fetch(`${APP}/admin/clients`, { headers: { Cookie: cookie }, redirect: 'manual' });
    console.log(`→ HTTP ${page.status}${page.status === 307 ? ' (意外重定向!)' : ''}`);
    if (page.status !== 200) throw new Error('owner 列表页未 200');

    // 4. 建客户（验证 email 写入）
    log('4. POST 建客户（email 应写入 clients）');
    const clientEmail = `client-e2e-${Date.now()}@workstation.test`;
    r = await api(`${APP}/api/admin/clients`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: { name: `E2E Client ${Date.now()}`, email: clientEmail } });
    if (r.status !== 201) throw new Error(`建客户失败: ${r.status} ${r.text}`);
    const clientId = r.json.clientId;
    const tempPwd = r.json.tempPassword;
    console.log(`→ client #${clientId}, temp pwd: ${tempPwd}`);
    // 验证 email 已写入 clients + 记下客户登录账号（清理用）
    r = await api(`${SUPABASE_URL}/rest/v1/clients?id=eq.${clientId}`, { headers: svc() });
    const savedEmail = r.json?.[0]?.email;
    clientUserId = r.json?.[0]?.account_id ?? null;
    console.log(`→ clients.email = ${savedEmail} ${savedEmail === clientEmail ? '✅' : '❌'}`);

    // 5. 项目 CRUD
    log('5. Owner 项目创建 + 归档');
    r = await api(`${APP}/api/admin/clients/${clientId}/projects`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: { name: 'Owner Project' } });
    if (r.status !== 201) throw new Error(`建项目失败: ${r.status} ${r.text}`);
    const projectId = r.json.project.id;
    console.log(`→ project #${projectId}`);
    r = await api(`${APP}/api/admin/clients/${clientId}/projects`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: { projectId, status: 'archived' } });
    if (r.status !== 200 || r.json.project.status !== 'archived') throw new Error(`归档项目失败: ${r.status} ${r.text}`);
    console.log(`→ 归档 ✅`);

    // 6. 重置密码
    log('6. 重置客户密码');
    r = await api(`${APP}/api/admin/clients/${clientId}/password`, { method: 'POST', headers: { Cookie: cookie } });
    if (r.status !== 200 || !r.json.tempPassword) throw new Error(`重置密码失败: ${r.status} ${r.text}`);
    console.log(`→ 新临时密码: ${r.json.tempPassword}`);

    // 7. 批量授 Pro
    log('7. 批量授 Pro');
    r = await api(`${APP}/api/admin/clients/batch`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: { ids: [clientId], action: 'grant_pro' } });
    if (r.status !== 200 || r.json.updated !== 1) throw new Error(`批量操作失败: ${r.status} ${r.text}`);
    r = await api(`${SUPABASE_URL}/rest/v1/clients?id=eq.${clientId}`, { headers: svc() });
    console.log(`→ tier=${r.json?.[0]?.tier}, pro_expires_at=${r.json?.[0]?.pro_expires_at ? 'set ✅' : '❌'}`);

    // 8. 导出 CSV
    log('8. 导出 CSV');
    const csvRes = await fetch(`${APP}/api/admin/clients/export`, { headers: { Cookie: cookie } });
    const csv = await csvRes.text();
    console.log(`→ HTTP ${csvRes.status}, CSV ${csv.length} 字节, 含 E2E Client: ${csv.includes('E2E Client') ? '✅' : '❌'}`);

    // 9. 客户详情页（200）
    log('9. GET /admin/clients/[id]（owner 应 200）');
    const detail = await fetch(`${APP}/admin/clients/${clientId}`, { headers: { Cookie: cookie }, redirect: 'manual' });
    console.log(`→ HTTP ${detail.status}`);

    console.log('\n✅ Owner 后台 E2E 完成');
  } finally {
    if (clientUserId) {
      log('清理临时客户账号');
      const d = await api(`${SUPABASE_URL}/auth/v1/admin/users/${clientUserId}`, { method: 'DELETE', headers: svc() });
      console.log(`→ DELETE ${d.status}`);
    }
    if (ownerId) {
      log('清理临时 owner（级联删其客户/项目）');
      const d = await api(`${SUPABASE_URL}/auth/v1/admin/users/${ownerId}`, { method: 'DELETE', headers: svc() });
      console.log(`→ DELETE ${d.status}`);
    }
  }
}

main().catch((e) => {
  console.error('\n❌ Owner E2E 失败:', e.message);
  process.exit(1);
});
