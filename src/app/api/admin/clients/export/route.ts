// ============================================================
// GET /api/admin/clients/export
// 站主导出客户全量 CSV（名称/email/档位/状态/创建/任务/完成/token）。仅 owner。
// ============================================================

import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient, getCurrentRole } from '@/lib/supabase/server';
import { effectiveTier } from '@/lib/client-quota';

export async function GET() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = await getCurrentRole();
  if (role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = createAdminClient();
  const { data: clients } = await admin.from('clients').select('*').order('created_at', { ascending: false });
  const { data: tasks } = await admin.from('client_tasks').select('client_id, status, tokens');

  const stats = new Map<number, { total: number; completed: number; tokens: number }>();
  for (const t of tasks ?? []) {
    const s = stats.get(t.client_id) || { total: 0, completed: 0, tokens: 0 };
    s.total++;
    if (t.status === 'completed') s.completed++;
    if (t.tokens) s.tokens += t.tokens;
    stats.set(t.client_id, s);
  }

  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [
    ['name', 'email', 'tier', 'status', 'created_at', 'tasks', 'completed', 'tokens'],
    ...(clients ?? []).map((c) => {
      const s = stats.get(c.id) || { total: 0, completed: 0, tokens: 0 };
      return [
        c.name,
        c.email ?? '',
        effectiveTier(c.tier, c.pro_expires_at),
        c.status,
        c.created_at,
        s.total,
        s.completed,
        s.tokens,
      ].map(esc).join(',');
    }),
  ];
  const csv = rows.join('\n');

  return new Response('﻿' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="clients.csv"',
    },
  });
}
