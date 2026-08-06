// ============================================================
// PATCH /api/admin/clients/batch
// 站主批量操作客户：pause / resume / grant_pro / revoke_pro。仅 owner。
// ============================================================

import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient, getCurrentRole } from '@/lib/supabase/server';

const DAY = 86400000;

const ACTIONS = ['pause', 'resume', 'grant_pro', 'revoke_pro'] as const;
type Action = (typeof ACTIONS)[number];

export async function PATCH(request: Request) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = await getCurrentRole();
  if (role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const ids: number[] = Array.isArray(body.ids) ? body.ids.map(Number).filter((n: number) => Number.isInteger(n)) : [];
  const action: Action = body.action;
  if (ids.length === 0) return NextResponse.json({ error: 'ids are required.' }, { status: 400 });
  if (ids.length > 100) return NextResponse.json({ error: 'Too many ids (max 100).' }, { status: 400 });
  if (!ACTIONS.includes(action)) return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });

  const admin = createAdminClient();

  // 校验所有 id 归属当前 owner（防越权操作他人客户）
  const { data: owned } = await admin
    .from('clients')
    .select('id')
    .eq('owner_id', user.id)
    .in('id', ids);
  const ownedIds = new Set((owned ?? []).map((c) => c.id));
  const validIds = ids.filter((id) => ownedIds.has(id));

  if (validIds.length === 0) return NextResponse.json({ error: 'No matching clients.' }, { status: 404 });

  const now = new Date().toISOString();
  let update: Record<string, unknown> = { updated_at: now };
  if (action === 'pause') update.status = 'paused';
  else if (action === 'resume') update.status = 'active';
  else if (action === 'grant_pro') {
    update = { ...update, tier: 'pro', pro_expires_at: new Date(Date.now() + 365 * DAY).toISOString() };
  } else if (action === 'revoke_pro') {
    update = { ...update, tier: 'free', pro_expires_at: null };
  }

  const { error } = await admin.from('clients').update(update).in('id', validIds);
  if (error) return NextResponse.json({ error: 'Batch update failed.' }, { status: 500 });

  return NextResponse.json({ updated: validIds.length, total: ids.length });
}
