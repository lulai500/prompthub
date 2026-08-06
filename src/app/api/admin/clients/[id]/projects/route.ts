// ============================================================
// POST/PATCH /api/admin/clients/[id]/projects
// 站主为客户管理项目：POST 建项目，PATCH 改名/归档(status=archived)
// 仅 owner；RLS owner ALL 已放行 client_projects
// ============================================================

import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient, getCurrentRole } from '@/lib/supabase/server';

const MAX_NAME = 80;

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const guard = await ownerGuard();
  if (guard) return guard;

  const clientId = Number(params.id);
  if (!Number.isInteger(clientId)) {
    return NextResponse.json({ error: 'Invalid client id.' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const name = (body.name || '').toString().trim();
  if (!name) return NextResponse.json({ error: 'Project name is required.' }, { status: 400 });
  if (name.length > MAX_NAME) return NextResponse.json({ error: `Name too long (max ${MAX_NAME}).` }, { status: 400 });
  const description = (body.description || '').toString().slice(0, 300);

  const admin = createAdminClient();
  const { data: client } = await admin.from('clients').select('id').eq('id', clientId).maybeSingle();
  if (!client) return NextResponse.json({ error: 'Client not found.' }, { status: 404 });

  const { data, error } = await admin
    .from('client_projects')
    .insert({ client_id: clientId, name, description })
    .select('id, name, description, status')
    .single();
  if (error) return NextResponse.json({ error: 'Failed to create project.' }, { status: 500 });

  return NextResponse.json({ project: data }, { status: 201 });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const guard = await ownerGuard();
  if (guard) return guard;

  const clientId = Number(params.id);
  if (!Number.isInteger(clientId)) return NextResponse.json({ error: 'Invalid client id.' }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const projectId = Number(body.projectId);
  if (!Number.isInteger(projectId)) return NextResponse.json({ error: 'projectId is required.' }, { status: 400 });

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) {
    const name = (body.name || '').toString().trim();
    if (!name || name.length > MAX_NAME) return NextResponse.json({ error: `Name required (max ${MAX_NAME}).` }, { status: 400 });
    update.name = name;
  }
  if (body.status !== undefined) {
    if (!['active', 'completed', 'archived'].includes(body.status)) {
      return NextResponse.json({ error: 'status must be active, completed or archived.' }, { status: 400 });
    }
    update.status = body.status;
  }
  if (Object.keys(update).length === 1) {
    return NextResponse.json({ error: 'No changes to apply.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('client_projects')
    .update(update)
    .eq('id', projectId)
    .eq('client_id', clientId)
    .select('id, name, description, status')
    .single();
  if (error || !data) return NextResponse.json({ error: 'Project not found.' }, { status: 404 });

  return NextResponse.json({ project: data });
}

/** owner 校验：非 owner 返回响应，通过返回 null */
async function ownerGuard(): Promise<NextResponse | null> {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = await getCurrentRole();
  if (role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return null;
}
