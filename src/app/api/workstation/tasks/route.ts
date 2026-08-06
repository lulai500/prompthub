// ============================================================
// POST /api/workstation/tasks — 创建任务（快速返回，不阻塞）
// 鉴权→限流→验项目→客户状态→匹配任务→聚合资产→配额检查→插入 pending 任务行
// 返回 taskId + 组装包；AI 生成由 POST /api/workstation/tasks/[id]/run 执行
// ============================================================

import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { matchTask } from '@/lib/task-match';
import { getCachedTaskAssets } from '@/lib/query-cache';
import { clientTitle } from '@/lib/workstation';
import { effectiveTier, getClientQuota } from '@/lib/client-quota';

export const maxDuration = 60;
export const runtime = 'nodejs';

const START_WINDOW = { maxRequests: 10, windowMs: 5 * 60_000 }; // 10 次/5 分钟

export async function POST(request: Request) {
  // 1. 鉴权 + 限流
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const rl = checkRateLimit(`ws-start:${user.id}`, START_WINDOW.maxRequests, START_WINDOW.windowMs);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Wait a few minutes and retry.' }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const projectId = Number(body.projectId);
  const query = (body.query || '').toString().trim();
  if (!Number.isInteger(projectId) || !query) {
    return NextResponse.json({ error: 'projectId and query are required.' }, { status: 400 });
  }

  // 2. 验证项目归属（RLS：客户只见自己的项目；owner 可见全部）
  const { data: project } = await supabase
    .from('client_projects')
    .select('id, client_id')
    .eq('id', projectId)
    .maybeSingle();
  if (!project) {
    return NextResponse.json({ error: 'Project not found.' }, { status: 403 });
  }

  // 3. 客户状态检查（paused 客户不能执行）
  const admin = createAdminClient();
  const { data: client } = await admin
    .from('clients')
    .select('id, name, status, account_id, tier, pro_expires_at')
    .eq('id', project.client_id)
    .maybeSingle();
  if (!client) {
    return NextResponse.json({ error: 'Client not found.' }, { status: 404 });
  }
  if (client.status === 'paused' || client.status === 'archived') {
    return NextResponse.json(
      { error: 'This client account is not active.' },
      { status: 403 }
    );
  }
  // Pro 客户才能调取 skills/workflows 内容；免费客户严格只能用提示词
  const isPro = effectiveTier(client.tier, client.pro_expires_at) === 'pro';

  // 4. 匹配预置任务 + 聚合资产
  const match = matchTask(query);
  if (!match) {
    return NextResponse.json(
      {
        error:
          'Could not match that to a task. Try describing the outcome — e.g. "write a blog post" or "debug my code".',
      },
      { status: 422 }
    );
  }
  const { prompts, skills, workflows } = await getCachedTaskAssets(match.task.slug, match.task.tags);

  // 5. 无 AI key → 降级为"组装方案"（不建任务行，不耗配额）
  if (!(process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_KEY)) {
    return NextResponse.json({
      generated: false,
      note: 'AI generation is not configured yet. Here is the assembled kit for this task.',
      matchedTask: { slug: match.task.slug, title: match.task.title, description: match.task.description },
      prompts,
      skills: isPro ? skills : [],
      workflows: isPro ? workflows : [],
    });
  }

  // 6. 配额检查：当月已用 >= 额度 → 402（pending 不计，发起即占 in_progress/completed）
  const quota = await getClientQuota(admin, client);
  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: `Monthly limit reached (${quota.used}/${quota.limit}). Upgrade to Pro for 500 executions/month.`,
        quota: { tier: quota.tier, used: quota.used, limit: quota.limit },
      },
      { status: 402 }
    );
  }

  // 7. 建任务（pending，快速返回；AI 生成在 run 端点执行）
  const { data: taskRow, error: insertErr } = await admin
    .from('client_tasks')
    .insert({
      project_id: projectId,
      client_id: client.id,
      title: clientTitle(query),
      input: query,
      status: 'pending',
      matched_task_slug: match.task.slug,
      asset_ids: [
        ...prompts.slice(0, 3).map((p) => ({ type: 'prompt', id: p.id })),
        ...(isPro ? skills.slice(0, 3).map((s) => ({ type: 'skill', id: s.id })) : []),
        ...(isPro ? workflows.slice(0, 3).map((w) => ({ type: 'workflow', id: w.id })) : []),
      ],
    })
    .select('id')
    .single();
  if (insertErr || !taskRow) {
    return NextResponse.json({ error: 'Failed to create task.' }, { status: 500 });
  }

  return NextResponse.json({
    generated: true,
    taskId: taskRow.id,
    matchedTask: { slug: match.task.slug, title: match.task.title, description: match.task.description },
    prompts,
    skills: isPro ? skills : [],
    workflows: isPro ? workflows : [],
  });
}
