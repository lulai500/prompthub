// ============================================================
// GET /api/workstation/tasks/[id] — 轮询任务状态
// 校验归属后返回 status + result + error（RLS 保证客户只见自己）
// ============================================================

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const taskId = Number(params.id);
  if (!Number.isInteger(taskId)) {
    return NextResponse.json({ error: 'Invalid task id.' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // RLS：客户只见自己的任务
  const { data: task } = await supabase
    .from('client_tasks')
    .select('id, status, result, error')
    .eq('id', taskId)
    .maybeSingle();
  if (!task) {
    return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
  }

  return NextResponse.json(task);
}
