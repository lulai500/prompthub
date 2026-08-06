// ============================================================
// POST /api/admin/clients/[id]/password
// 站主重置客户密码：生成临时密码 → updateUserById → 置首改密标记
// 返回一次性临时密码（站主转交客户，客户下次登录强制改密）。仅 owner。
// ============================================================

import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient, getCurrentRole } from '@/lib/supabase/server';
import { generateTempPassword } from '@/lib/client-utils';

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const role = await getCurrentRole();
  if (role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const clientId = Number(params.id);
  if (!Number.isInteger(clientId)) {
    return NextResponse.json({ error: 'Invalid client id.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: client } = await admin
    .from('clients')
    .select('id, account_id, name, email')
    .eq('id', clientId)
    .maybeSingle();
  if (!client) {
    return NextResponse.json({ error: 'Client not found.' }, { status: 404 });
  }

  const tempPassword = generateTempPassword();

  // 重置密码（auth.users）
  const { error: pwdErr } = await admin.auth.admin.updateUserById(client.account_id, {
    password: tempPassword,
  });
  if (pwdErr) {
    return NextResponse.json({ error: 'Failed to reset password.' }, { status: 500 });
  }

  // 置首改密标记：客户下次登录走 FirstRunPassword 强制改密
  await admin
    .from('profiles')
    .update({ must_change_password: true })
    .eq('id', client.account_id);

  return NextResponse.json({
    tempPassword,
    email: client.email,
    note: 'Share the new temporary password with the client. They must change it on next login.',
  });
}
