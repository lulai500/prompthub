// ============================================================
// POST /api/workstation/execute
// 客户工作站 AI 执行：输入任务 → 匹配预置任务 → 取最相关提示词
// → DeepSeek 生成内容 → 存为 client_tasks 交付物。
// 全程 service_role 写结果（客户不可篡改），RLS 保证跨客户隔离。
// ============================================================

import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { matchTask } from '@/lib/task-match';
import { getCachedTaskAssets } from '@/lib/query-cache';
import { callDeepSeek, buildAiMessages, clientTitle } from '@/lib/workstation';
import { getClientQuota } from '@/lib/client-quota';

// Vercel Hobby 默认函数超时 10s，DeepSeek 非流式可能 20-60s
export const maxDuration = 60;
export const runtime = 'nodejs';

const EXECUTE_WINDOW = { maxRequests: 10, windowMs: 5 * 60_000 }; // 10 次/5 分钟

export async function POST(request: Request) {
  // 1. 鉴权 + 限流
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const rl = checkRateLimit(`ws-execute:${user.id}`, EXECUTE_WINDOW.maxRequests, EXECUTE_WINDOW.windowMs);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many executions. Wait a few minutes and retry.' }, { status: 429 });
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
  if (client.status === 'paused') {
    return NextResponse.json({ error: 'This client account is paused.' }, { status: 403 });
  }

  // 4. 匹配预置任务 + 聚合资产
  const match = matchTask(query);
  if (!match) {
    return NextResponse.json({
      error: 'Could not match that to a task. Try describing the outcome — e.g. "write a blog post" or "debug my code".',
    }, { status: 422 });
  }
  const { prompts, skills, workflows } = await getCachedTaskAssets(match.task.slug, match.task.tags);
  const bestPrompt = prompts[0] as { id?: number; content?: string } | undefined;

  // 5. 无 AI key → 降级为"组装方案"（不建任务行）
  if (!(process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_KEY)) {
    return NextResponse.json({
      generated: false,
      note: 'AI generation is not configured yet. Here is the assembled kit for this task.',
      matchedTask: { slug: match.task.slug, title: match.task.title, description: match.task.description },
      prompts,
      skills,
      workflows,
    });
  }

  // 5-b. 配额检查：当月已用 >= 额度 → 402（发起执行即计；无 key 降级不耗额度）
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

  // 6. 建任务（in_progress）
  const { data: taskRow, error: insertErr } = await admin
    .from('client_tasks')
    .insert({
      project_id: projectId,
      client_id: client.id,
      title: clientTitle(query),
      input: query,
      status: 'in_progress',
      matched_task_slug: match.task.slug,
      asset_ids: [
        ...prompts.slice(0, 3).map((p) => ({ type: 'prompt', id: p.id })),
        ...skills.slice(0, 3).map((s) => ({ type: 'skill', id: s.id })),
        ...workflows.slice(0, 3).map((w) => ({ type: 'workflow', id: w.id })),
      ],
    })
    .select('id')
    .single();
  if (insertErr || !taskRow) {
    return NextResponse.json({ error: 'Failed to create task.' }, { status: 500 });
  }
  const taskId = taskRow.id;

  // 7. 调用 DeepSeek 生成
  try {
    const messages = buildAiMessages(
      bestPrompt?.content,
      match.task.title,
      match.task.description,
      query
    );
    const { text, tokens } = await callDeepSeek(messages);

    // 8. 写回结果（completed）+ 审计字段
    const { error: updateErr } = await admin
      .from('client_tasks')
      .update({
        status: 'completed',
        result: text,
        tokens,
        prompt_id: bestPrompt?.id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId);
    if (updateErr) {
      // 结果已生成但写库失败：标记 failed，错误信息仍可返回给客户
      await admin.from('client_tasks').update({ status: 'failed' }).eq('id', taskId);
      return NextResponse.json({ error: 'Generated but failed to save the result.' }, { status: 500 });
    }

    // 9. 客户活跃记录（streak / 周报数据源）
    await admin
      .from('user_activity')
      .upsert({ user_id: client.account_id, active_date: new Date().toISOString().slice(0, 10) });

    return NextResponse.json({
      generated: true,
      taskId,
      result: text,
      matchedTask: { slug: match.task.slug, title: match.task.title },
      prompts,
      skills,
      workflows,
    });
  } catch (err) {
    // 10. 生成失败：任务标记 failed，客户可新建重试
    const message = err instanceof Error ? err.message : 'Generation failed.';
    await admin.from('client_tasks').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', taskId);
    return NextResponse.json({ error: `Generation failed: ${message}` }, { status: 502 });
  }
}
