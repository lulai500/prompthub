// ============================================================
// PATCH /api/admin/clients/[id]
// 站主管理客户：status(active|paused) + 手动授/取消 Pro 额度(tier)。仅 owner。
// ============================================================

import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient, getCurrentRole } from '@/lib/supabase/server';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
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

  const body = await request.json().catch(() => ({}));
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  // 暂停/恢复/归档
  if (body.status !== undefined) {
    if (!['active', 'paused', 'archived'].includes(body.status)) {
      return NextResponse.json({ error: 'status must be active, paused or archived.' }, { status: 400 });
    }
    update.status = body.status;
  }

  // 手动授/取消 Pro（B2B 额度会员，免支付）
  if (body.tier !== undefined) {
    if (body.tier === 'pro' && body.pro_expires_at) {
      update.tier = 'pro';
      update.pro_expires_at = new Date(body.pro_expires_at).toISOString();
    } else if (body.tier === 'free') {
      update.tier = 'free';
      update.pro_expires_at = null;
    } else {
      return NextResponse.json({ error: 'tier must be pro (with pro_expires_at) or free.' }, { status: 400 });
    }
  }

  if (Object.keys(update).length === 1) {
    return NextResponse.json({ error: 'No changes to apply.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('clients')
    .update(update)
    .eq('id', clientId)
    .select('id, name, status, tier, pro_expires_at')
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: 'Client not found.' }, { status: 404 });
  }

  return NextResponse.json({ client: data });
}
