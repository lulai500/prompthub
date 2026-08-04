// ============================================================
// PATCH /api/dashboard/clients/[id]
// 站主暂停/恢复客户（status: active | paused）。仅 owner。
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
  const status = body.status;
  if (status !== 'active' && status !== 'paused') {
    return NextResponse.json({ error: 'status must be active or paused.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('clients')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', clientId)
    .select('id, name, status')
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: 'Client not found.' }, { status: 404 });
  }

  return NextResponse.json({ client: data });
}
