// ============================================================
// POST /api/workstation/projects — 客户自建项目
// 鉴权 → 确认为客户（经 RLS my_client_id() 放行）→ 校验 name → 插入
// 用用户级客户端插入，RLS 强制 client_id = my_client_id()，非客户自动 403
// ============================================================

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const MAX_NAME = 80;

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const name = (body.name || '').toString().trim();
  if (!name) {
    return NextResponse.json({ error: 'Project name is required.' }, { status: 400 });
  }
  if (name.length > MAX_NAME) {
    return NextResponse.json({ error: `Project name is too long (max ${MAX_NAME} chars).` }, { status: 400 });
  }

  // 客户的 client_id（RLS：clients 表只返回自己的行）
  const { data: myClient } = await supabase.from('clients').select('id').maybeSingle();
  if (!myClient) {
    return NextResponse.json({ error: 'Only client accounts can create projects.' }, { status: 403 });
  }

  // 用户级客户端插入 → RLS 校验 client_id = my_client_id()
  const { data, error } = await supabase
    .from('client_projects')
    .insert({ client_id: myClient.id, name })
    .select('id, name, description')
    .single();
  if (error) {
    return NextResponse.json({ error: 'Failed to create project.' }, { status: 403 });
  }

  return NextResponse.json({ project: data }, { status: 201 });
}
