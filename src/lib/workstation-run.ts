// ============================================================
// 客户工作站 - 任务执行共享逻辑
// run / retry / regenerate 三入口共用的生成函数：
// 由任务行重聚合资产 → 拼消息 → DeepSeek 生成 → 写回结果。
// 仅服务端（service_role / admin）调用，客户不可直接触达。
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import { TASKS } from '@/lib/tasks';
import { getCachedTaskAssets } from '@/lib/query-cache';
import {
  callDeepSeek,
  buildAiMessages,
  buildProAiMessages,
  getProAssetContents,
  mapDeepSeekError,
} from '@/lib/workstation';
import { effectiveTier } from '@/lib/client-quota';
import type { ClientTask } from '@/types';

export interface RunTaskResult {
  ok: boolean;
  text?: string;
  tokens?: number;
  error?: string;
}

/**
 * 执行一次 AI 生成并写回任务行。
 * - 按 matched_task_slug 重聚合资产（不依赖行内快照，确定性）
 * - Pro 客户拼接 skills/workflows 全文；free 仅用提示词
 * - 成功写 completed + result + tokens；失败写 failed（重试免费，失败不耗配额）
 * - 记录客户活跃（streak / 周报数据源）
 *
 * 前置条件：任务行的 status 已由调用方原子地置为 in_progress。
 */
export async function runTaskGeneration(
  admin: SupabaseClient,
  task: Pick<ClientTask, 'id' | 'client_id' | 'input' | 'matched_task_slug' | 'title'>,
  opts: { userInput?: string } = {}
): Promise<RunTaskResult> {
  const input = opts.userInput ?? task.input ?? '';

  // 1. 客户分档 + 状态（决定是否拼接 skills/workflows 全文）
  const { data: client } = await admin
    .from('clients')
    .select('id, account_id, status, tier, pro_expires_at')
    .eq('id', task.client_id)
    .maybeSingle();
  if (!client) {
    await markFailed(admin, task.id, 'Client account not found.');
    return { ok: false, error: 'Client account not found.' };
  }
  if (client.status === 'paused' || client.status === 'archived') {
    await markFailed(admin, task.id, 'This client account is not active.');
    return { ok: false, error: 'This client account is not active.' };
  }
  const isPro = effectiveTier(client.tier, client.pro_expires_at) === 'pro';

  // 2. 由任务 slug 重聚合资产（匹配键确定性，不依赖行内快照）
  const def = TASKS.find((t) => t.slug === task.matched_task_slug);
  const slug = task.matched_task_slug ?? def?.slug ?? '';
  const { prompts, skills, workflows } = await getCachedTaskAssets(slug, def?.tags ?? []);
  const bestPrompt = prompts[0] as { id?: number; content?: string } | undefined;

  // 3. Pro 拉取技能/工作流全文
  const proAssets = isPro
    ? await getProAssetContents(
        admin,
        (skills as { id: number }[]).slice(0, 3),
        (workflows as { id: number }[]).slice(0, 3)
      )
    : { skills: [], workflows: [] };

  // 4. 生成
  try {
    const messages = isPro
      ? buildProAiMessages({
          promptContent: bestPrompt?.content,
          taskTitle: def?.title ?? task.title ?? 'Task',
          taskDescription: def?.description ?? '',
          userInput: input,
          skills: proAssets.skills,
          workflows: proAssets.workflows,
        })
      : buildAiMessages(
          bestPrompt?.content,
          def?.title ?? task.title ?? 'Task',
          def?.description ?? '',
          input
        );
    const { text, tokens } = await callDeepSeek(messages);

    // 5. 写回结果（completed，清掉历史 error）
    const { error: updateErr } = await admin
      .from('client_tasks')
      .update({
        status: 'completed',
        result: text,
        tokens,
        prompt_id: bestPrompt?.id ?? null,
        error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', task.id);
    if (updateErr) {
      await markFailed(admin, task.id, 'Generated but failed to save the result.');
      return { ok: false, error: 'Generated but failed to save the result.' };
    }

    // 6. 客户活跃记录（streak / 周报数据源）
    if (client.account_id) {
      await admin
        .from('user_activity')
        .upsert({ user_id: client.account_id, active_date: new Date().toISOString().slice(0, 10) });
    }

    return { ok: true, text, tokens };
  } catch (err) {
    // 7. 失败：标记 failed（重试免费，失败不耗配额），写入友好文案
    const friendly = mapDeepSeekError(err);
    await markFailed(admin, task.id, friendly);
    return { ok: false, error: friendly };
  }
}

/** 把任务标记为 failed 并写入友好错误文案（失败不耗配额，重试免费） */
async function markFailed(admin: SupabaseClient, taskId: number, error: string): Promise<void> {
  await admin
    .from('client_tasks')
    .update({ status: 'failed', error, updated_at: new Date().toISOString() })
    .eq('id', taskId);
}
