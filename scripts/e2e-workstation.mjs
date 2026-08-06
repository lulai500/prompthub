// ============================================================
// 客户工作站 E2E（对 dev server + 真实 Supabase/DeepSeek）
// 步骤：建临时 client → start → run → 轮询 → 交付物 → 客户自建项目(RLS)
//       → 配额核对 → 删除临时用户（级联清理）
// 前置：dev server 已启动（http://localhost:3000），.env.local 含真实 key
// 用法：node scripts/e2e-workstation.mjs
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
const svc = (extra = {}) => ({
  apikey: SERVICE,
  Authorization: `Bearer ${SERVICE}`,
  'Content-Type': 'application/json',
  ...extra,
});
const anon = (extra = {}) => ({
  apikey: ANON,
  'Content-Type': 'application/json',
  ...extra,
});

async function main() {
  const email = `e2e-${Date.now()}@workstation.test`;
  const password = 'E2ePass!12345';
  let userId = null;

  try {
    // 1. 建临时 auth 用户（admin，email 直接确认）
    log('1. 创建临时客户账号');
    let r = await api(`${SUPABASE_URL}/auth/v1/admin/users`, { method: 'POST', headers: svc(), body: { email, password, email_confirm: true } });
    if (!r.json?.id) throw new Error(`创建用户失败: ${r.text}`);
    userId = r.json.id;
    console.log(`用户: ${email} (${userId})`);

    // 2. profile role=client（upsert，防 handle_new_user 已建）
    log('2. 设置 profile role=client');
    r = await api(`${SUPABASE_URL}/rest/v1/profiles?on_conflict=id`, {
      method: 'POST', headers: { ...svc(), Prefer: 'resolution=merge-duplicates' },
      body: { id: userId, username: 'e2e-client', role: 'client', must_change_password: false },
    });
    console.log(`profile: HTTP ${r.status}`);

    // 3. 找真实 owner，建 clients 行 + 默认项目
    log('3. 建 clients 行 + 项目');
    r = await api(`${SUPABASE_URL}/rest/v1/profiles?select=id&role=eq.owner&limit=1`, { headers: svc() });
    const ownerId = r.json?.[0]?.id;
    if (!ownerId) throw new Error('找不到 owner 账号');
    r = await api(`${SUPABASE_URL}/rest/v1/clients`, { method: 'POST', headers: { ...svc(), Prefer: 'return=representation' }, body: { account_id: userId, name: 'E2E Client', owner_id: ownerId } });
    const clientId = r.json?.[0]?.id;
    if (!clientId) throw new Error(`建 clients 失败: ${r.status} ${r.text}`);
    r = await api(`${SUPABASE_URL}/rest/v1/client_projects`, { method: 'POST', headers: { ...svc(), Prefer: 'return=representation' }, body: { client_id: clientId, name: 'E2E Project' } });
    const projectId = r.json?.[0]?.id;
    if (!projectId) throw new Error(`建项目失败: ${r.text}`);
    console.log(`client #${clientId}, project #${projectId}`);

    // 4. 登录拿 session → 构造 SSR cookie
    log('4. 登录 + 构造 SSR cookie');
    r = await api(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: 'POST', headers: anon(), body: { email, password } });
    if (!r.json?.access_token) throw new Error(`登录失败: ${r.text}`);
    const cookie = `${cookieName}=${'base64-' + b64url(JSON.stringify(r.json))}`;
    console.log(`cookie: ${cookie.slice(0, 60)}…`);

    // 5. 客户自建项目（RLS INSERT 策略 — 核心验证点）
    log('5. 客户自建项目（走 dev server / RLS）');
    r = await api(`${APP}/api/workstation/projects`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: { name: 'Client-Created Project' } });
    if (r.status !== 201) throw new Error(`客户建项目失败: ${r.status} ${r.text}`);
    const proj2 = r.json.project;
    console.log(`→ 201, project #${proj2.id} "${proj2.name}"（RLS INSERT 通过 ✅）`);

    // 6. start 建任务
    log('6. start 建任务');
    r = await api(`${APP}/api/workstation/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: { projectId, query: 'write a short blog post about coffee' } });
    if (r.status !== 200 || !r.json.taskId) throw new Error(`start 失败: ${r.status} ${r.text}`);
    const taskId = r.json.taskId;
    console.log(`→ task #${taskId}, matched: ${r.json.matchedTask?.slug}`);

    // 7. run 生成（真实 DeepSeek，最长 70s）
    log('7. run 生成（真实 DeepSeek）');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 70_000);
    try {
      r = await api(`${APP}/api/workstation/tasks/${taskId}/run`, { method: 'POST', headers: { Cookie: cookie }, ...({ signal: ctrl.signal }) });
      console.log(`→ HTTP ${r.status} ${r.json?.ok ? 'ok' : r.json?.error || r.text}`);
    } catch (e) {
      console.log(`→ run 请求异常: ${e.message}（任务可能仍在执行）`);
    } finally {
      clearTimeout(timer);
    }

    // 8. 轮询终态
    log('8. 轮询终态');
    let state = null;
    for (let i = 0; i < 20; i++) {
      await new Promise((res) => setTimeout(res, 2500));
      r = await api(`${APP}/api/workstation/tasks/${taskId}`, { headers: { Cookie: cookie } });
      state = r.json;
      if (state?.status === 'completed' || state?.status === 'failed') break;
    }
    console.log(`→ status=${state?.status}, tokens=${state?.result ? '…' : state?.tokens ?? '—'}`);
    console.log(`  result 长度: ${state?.result?.length ?? 0} 字符`);
    console.log(`  error: ${state?.error ?? '(none)'}`);

    // 9. 配额核对（GET billing：used 应 ≥1 且不含 failed）
    log('9. 配额核对');
    r = await api(`${APP}/api/workstation/billing`, { headers: { Cookie: cookie } });
    console.log(`→ ${r.status} ${r.json ? JSON.stringify(r.json) : r.text}`);

    // 10. 工作站页面 SSR（应 200，非 307）
    log('10. /workstation 页面（client 会话应 200）');
    const page = await fetch(`${APP}/workstation`, { headers: { Cookie: cookie }, redirect: 'manual' });
    console.log(`→ HTTP ${page.status}${page.status === 307 ? ' (意外重定向)' : ''}`);

    console.log('\n✅ E2E 完成');
  } finally {
    // 清理：删临时用户 → 级联删 clients/projects/tasks
    if (userId) {
      log('清理临时用户');
      const d = await api(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, { method: 'DELETE', headers: svc() });
      console.log(`→ DELETE ${d.status} ${d.text.slice(0, 120)}`);
    }
  }
}

main().catch((e) => {
  console.error('\n❌ E2E 失败:', e.message);
  process.exit(1);
});
