// ============================================================
// 客户工作站 AI 执行额度（按次数/月）
// free=20 次/月，pro=500 次/月；tier 仅展示，pro_expires_at 是权威
// execute / billing / 工作站页面 / 站主后台共用
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';

export const CLIENT_QUOTA = { FREE: 20, PRO: 500 } as const;

/** 配额月边界：统一按 UTC（client_tasks.created_at 为 timestamptz 存 UTC） */
export function monthStartIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

/** 下月 1 号 UTC（配额重置日，供 UI 展示） */
export function nextMonthStartIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
}

/** 有效分档：pro 且未过期才算 pro，否则回落 free */
export function effectiveTier(tier: string, proExpiresAt: string | null): 'free' | 'pro' {
  if (tier === 'pro' && proExpiresAt && new Date(proExpiresAt).getTime() > Date.now()) return 'pro';
  return 'free';
}

export function quotaLimit(tier: 'free' | 'pro'): number {
  return tier === 'pro' ? CLIENT_QUOTA.PRO : CLIENT_QUOTA.FREE;
}

/** 当月已执行次数（仅计真实消耗：in_progress/completed；pending 与 failed 不计，重试免费） */
export async function countMonthlyUsage(admin: SupabaseClient, clientId: number): Promise<number> {
  const { count } = await admin
    .from('client_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .gte('created_at', monthStartIso())
    .in('status', ['in_progress', 'completed']);
  return count ?? 0;
}

export interface ClientQuotaInfo {
  tier: 'free' | 'pro';
  limit: number;
  used: number;
  remaining: number;
  allowed: boolean;
}

export async function getClientQuota(
  admin: SupabaseClient,
  client: { id: number; tier: string; pro_expires_at: string | null }
): Promise<ClientQuotaInfo> {
  const tier = effectiveTier(client.tier, client.pro_expires_at);
  const limit = quotaLimit(tier);
  const used = await countMonthlyUsage(admin, client.id);
  return { tier, limit, used, remaining: Math.max(0, limit - used), allowed: used < limit };
}

/** 从已加载的任务数组算当月用量（工作站/站主后台页面复用，免二次查询；failed 不计） */
export function countMonthlyUsageFromTasks(tasks: { status: string; created_at: string }[]): number {
  const start = monthStartIso();
  return tasks.filter(
    (t) => ['in_progress', 'completed'].includes(t.status) && t.created_at >= start
  ).length;
}
