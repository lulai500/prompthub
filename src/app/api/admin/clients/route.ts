// ============================================================
// POST /api/admin/clients
// 站主创建客户账号：admin.createUser 生成登录账号 + 临时密码，
// 建 clients 档案 + 默认项目。仅 owner 可调用。
// ============================================================

import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient, getCurrentRole } from '@/lib/supabase/server';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { generateTempPassword } from '@/lib/client-utils';

export async function POST(request: Request) {
  // 1. 限流（按站主用户 id）
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const rl = checkRateLimit(`clients-create:${user.id}`, RATE_LIMITS.SUBMIT.maxRequests, RATE_LIMITS.SUBMIT.windowMs);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests, try again later.' }, { status: 429 });
  }

  // 2. 仅 owner 可创建客户
  const role = await getCurrentRole();
  if (role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 3. 参数校验
  const body = await request.json().catch(() => ({}));
  const name = (body.name || '').toString().trim();
  const email = (body.email || '').toString().trim().toLowerCase();
  if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Name and a valid email are required.' }, { status: 400 });
  }

  const admin = createAdminClient();

  // 4. 创建登录账号（免邮箱验证，临时密码立即可用）
  const tempPassword = generateTempPassword();
  const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { username: name }, // handle_new_user 触发器用此建 profiles.username
  });

  if (createErr) {
    // 邮箱已占用等
    const status = createErr.message?.toLowerCase().includes('already') ? 409 : 500;
    return NextResponse.json(
      { error: status === 409 ? 'That email is already registered.' : 'Failed to create account.' },
      { status }
    );
  }

  const newUserId = newUser.user.id;

  // 5. 设置 role=client + 首改密标记（current_user=service_role，保护触发器放行）
  const { error: roleErr } = await admin
    .from('profiles')
    .update({ role: 'client', must_change_password: true })
    .eq('id', newUserId);
  if (roleErr) {
    await admin.auth.admin.deleteUser(newUserId);
    return NextResponse.json({ error: 'Failed to finalize account.' }, { status: 500 });
  }

  // 6. 建 clients 档案（含 denormalized email）+ 默认项目
  const { data: clientRow, error: clientErr } = await admin
    .from('clients')
    .insert({ account_id: newUserId, name, email, owner_id: user.id, status: 'active' })
    .select('id')
    .single();
  if (clientErr || !clientRow) {
    await admin.auth.admin.deleteUser(newUserId);
    return NextResponse.json({ error: 'Failed to create client record.' }, { status: 500 });
  }

  const { error: projectErr } = await admin
    .from('client_projects')
    .insert({ client_id: clientRow.id, name: 'General', description: '' });
  if (projectErr) {
    await admin.from('clients').delete().eq('id', clientRow.id);
    await admin.auth.admin.deleteUser(newUserId);
    return NextResponse.json({ error: 'Failed to create default project.' }, { status: 500 });
  }

  // 7. 临时密码只在本次响应出现一次（站主转交客户）
  return NextResponse.json(
    {
      clientId: clientRow.id,
      email,
      tempPassword,
      note: 'Share the temporary password with the client. They must change it on first login.',
    },
    { status: 201 }
  );
}
