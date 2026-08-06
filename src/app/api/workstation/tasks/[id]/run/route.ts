// ============================================================
// POST /api/workstation/tasks/[id]/run — 执行 AI 生成
// 校验归属 → 原子抢占 in_progress → runTaskGeneration 写回结果。
// 浏览器 fire-and-forget；前端轮询 GET tasks/[id] 获取终态。
// 同一端点服务 retry（failed）/ regenerate（completed）。
// ============================================================

import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { runTaskGeneration } from '@/lib/workstation-run';

export const maxDuration = 60;
export const runtime = 'nodejs';

const RUN_WINDOW = { maxRequests: 10, windowMs: 5 * 60_000 }; // 10 次/5 分钟（防刷 retry）

export async function POST(_request: Request, { params }: { params: { id: string } }) {
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
  const rl = checkRateLimit(`ws-run:${user.id}`, RUN_WINDOW.maxRequests, RUN_WINDOW.windowMs);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many executions. Wait a few minutes and retry.' }, { status: 429 });
  }

  // 1. 校验归属（RLS：客户只见自己的任务）
  const { data: task } = await supabase
    .from('client_tasks')
    .select('id, client_id, input, title, matched_task_slug, status')
    .eq('id', taskId)
    .maybeSingle();
  if (!task) {
    return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
  }

  // 2. 原子抢占：pending/failed/completed → in_progress（防并发重复执行；0 行则已在跑）
  const admin = createAdminClient();
  const { data: claimed, error: claimErr } = await admin
    .from('client_tasks')
    .update({ status: 'in_progress', updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .in('status', ['pending', 'failed', 'completed'])
    .select('id')
    .single();
  if (claimErr || !claimed) {
    return NextResponse.json({ error: 'Task is already running.' }, { status: 409 });
  }

  // 3. 执行生成（runTaskGeneration 内部写回 completed/failed + error）
  const result = await runTaskGeneration(admin, task);
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
