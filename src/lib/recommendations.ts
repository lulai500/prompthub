// ============================================================
// PromptHub - 个性化推荐
// 基于 user_usage 历史资产标签 → 推荐同标签未看过的资产
// 供首页 "Recommended for you" 与 /dashboard/reports 复用
// ============================================================

import { createServerSupabaseClient } from '@/lib/supabase/server';

export const ASSET_TABLE: Record<string, string> = {
  prompt: 'prompts',
  skill: 'skills',
  workflow: 'workflows',
};

export function assetHref(type: string, slug?: string | null, id?: number): string {
  const table = ASSET_TABLE[type] || 'prompts';
  return `/${table}/${slug || id}`;
}

export interface Recommendation {
  type: string;
  id: number;
  title: string;
  slug?: string | null;
  description?: string | null;
}

export async function getRecommendationsForUser(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  userId: string,
  limit = 6
): Promise<Recommendation[]> {
  // 最近使用的资产（取最近 30 条作为推荐信号）
  const { data: usage } = await supabase
    .from('user_usage')
    .select('asset_type, asset_id')
    .eq('user_id', userId)
    .order('last_used_at', { ascending: false })
    .limit(30);
  if (!usage || usage.length === 0) return [];

  // 按类型分组 + 收集历史标签
  const usedIds: Record<string, number[]> = {};
  for (const u of usage) {
    (usedIds[u.asset_type] = usedIds[u.asset_type] || []).push(u.asset_id);
  }
  const usedTags: string[] = [];
  for (const [type, ids] of Object.entries(usedIds)) {
    const table = ASSET_TABLE[type];
    if (!table) continue;
    const { data: rows } = await supabase
      .from(table)
      .select('tags')
      .in('id', ids);
    for (const r of rows || []) usedTags.push(...(r.tags || []));
  }
  const tags = Array.from(new Set(usedTags));
  if (tags.length === 0) return [];

  // 每类型按标签 overlap 推荐，排除已用资产
  const recs: Recommendation[] = [];
  for (const type of ['prompt', 'skill', 'workflow']) {
    const table = ASSET_TABLE[type];
    if (!table) continue;
    let q = supabase
      .from(table)
      .select('id, title, slug, description')
      .eq('is_published', true)
      .overlaps('tags', tags)
      .limit(3);
    const used = usedIds[type] || [];
    if (used.length) q = q.not('id', 'in', `(${used.join(',')})`);
    const { data: rows } = await q;
    for (const r of rows || []) {
      recs.push({ type, id: r.id, title: r.title, slug: r.slug, description: r.description });
    }
    if (recs.length >= limit) break;
  }
  return recs.slice(0, limit);
}
