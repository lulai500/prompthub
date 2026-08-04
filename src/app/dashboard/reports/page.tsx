// ============================================================
// /dashboard/reports — 个性化周报
// 聚合本周使用/活跃/收藏 + streak 战报 + 基于使用标签的推荐
// 目标：数据沉淀 → 复访理由（习惯回路）
// ============================================================

import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Flame,
  Clock,
  Heart,
  CalendarDays,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { computeStreakStats } from '@/lib/streaks';
import { formatDate } from '@/lib/utils';
import { getRecommendationsForUser } from '@/lib/recommendations';

export const dynamic = 'force-dynamic';

const TABLE: Record<string, string> = {
  prompt: 'prompts',
  skill: 'skills',
  workflow: 'workflows',
};

const TYPE_LABEL: Record<string, string> = {
  prompt: 'prompt',
  skill: 'skill',
  workflow: 'workflow',
};

export default async function WeeklyReportPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // 本周边界：滚动最近 7 天
  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const weekAgoIso = weekAgo.toISOString();
  const weekAgoDate = weekAgo.toISOString().slice(0, 10);

  // ---- 本周使用记录 ----
  const { data: usage } = await supabase
    .from('user_usage')
    .select('asset_type, asset_id, use_count, last_used_at')
    .eq('user_id', user.id)
    .gte('last_used_at', weekAgoIso)
    .order('last_used_at', { ascending: false })
    .limit(50);
  const usageList = usage || [];

  const totalUses = usageList.reduce((s, u) => s + (u.use_count || 1), 0);
  const byType: Record<string, number> = {};
  for (const u of usageList) byType[u.asset_type] = (byType[u.asset_type] || 0) + (u.use_count || 1);

  // ---- 每日活跃 + streak ----
  const { data: activity } = await supabase
    .from('user_activity')
    .select('active_date')
    .eq('user_id', user.id);
  const dates = (activity || [])
    .map((a) => (a.active_date || '').toString().slice(0, 10))
    .filter(Boolean);
  const activeThisWeek = dates.filter((d) => d >= weekAgoDate).length;
  const streak = computeStreakStats(dates);

  // ---- 本周新增收藏 ----
  const [favRes, colRes] = await Promise.all([
    supabase
      .from('favorites')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .gte('created_at', weekAgoIso),
    supabase
      .from('collections')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .gte('created_at', weekAgoIso),
  ]);
  const newFavorites = favRes.count || 0;
  const newCollections = colRes.count || 0;

  // ---- 本周用过资产的元数据 + 收集标签 ----
  const titleMap: Record<string, string> = {};
  const linkMap: Record<string, string> = {};
  const usedTags: string[] = [];
  const usedIds: Record<string, number[]> = {};
  for (const u of usageList) {
    (usedIds[u.asset_type] = usedIds[u.asset_type] || []).push(u.asset_id);
  }
  for (const [type, ids] of Object.entries(usedIds)) {
    const table = TABLE[type];
    if (!table) continue;
    const { data: rows } = await supabase
      .from(table)
      .select('id, title, slug, tags')
      .in('id', ids);
    for (const r of rows || []) {
      const key = `${type}:${r.id}`;
      titleMap[key] = r.title;
      linkMap[key] = `/${table}/${r.slug || r.id}`;
      usedTags.push(...(r.tags || []));
    }
  }

  // ---- 个性化推荐：基于使用习惯标签，排除已用（复用共享逻辑） ----
  const recommendations = await getRecommendationsForUser(supabase, user.id);

  return (
    <div className="container-page py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Weekly Report
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Your PromptHub activity over the last 7 days
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm text-brand-600 dark:text-brand-400 hover:underline"
        >
          ← Back to dashboard
        </Link>
      </div>

      {/* 概览统计 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card p-5">
          <Clock className="w-7 h-7 text-brand-500 mb-3" />
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalUses}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            times used this week
          </p>
        </div>
        <div className="card p-5">
          <CalendarDays className="w-7 h-7 text-blue-500 mb-3" />
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{activeThisWeek}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            active days this week
          </p>
        </div>
        <div className="card p-5">
          <Heart className="w-7 h-7 text-red-500 mb-3" />
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {newFavorites + newCollections}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            new favorites &amp; collections
          </p>
        </div>
        <div className="card p-5">
          <Flame className={`w-7 h-7 mb-3 ${streak.current > 0 ? 'text-orange-500' : 'text-slate-400'}`} />
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {streak.current}
            <span className="text-sm font-normal text-slate-400 ml-1">
              day{streak.best > 0 ? ` · best ${streak.best}` : ''}
            </span>
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            current streak
          </p>
        </div>
      </div>

      {/* 使用明细 */}
      {usageList.length > 0 ? (
        <div className="card p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-brand-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              What you used this week
            </h2>
            <span className="ml-auto text-xs text-slate-400">
              {['prompt', 'skill', 'workflow']
                .filter((t) => byType[t])
                .map((t) => `${byType[t]}× ${TYPE_LABEL[t]}`)
                .join(' · ')}
            </span>
          </div>
          <div className="space-y-2">
            {usageList.map((u) => {
              const key = `${u.asset_type}:${u.asset_id}`;
              const title = titleMap[key] || `${u.asset_type} #${u.asset_id}`;
              const href = linkMap[key];
              return (
                <Link
                  key={key}
                  href={href || '/prompts'}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 dark:border-dark-700 hover:border-brand-300 dark:hover:border-brand-700 transition-all group"
                >
                  <span className="badge-default text-xs shrink-0">{u.asset_type}</span>
                  <span className="font-medium text-sm text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 truncate flex-1">
                    {title}
                  </span>
                  <span className="text-xs text-slate-400 shrink-0">
                    used {u.use_count}× · {formatDate(u.last_used_at)}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="card p-10 mb-8 text-center">
          <p className="text-slate-600 dark:text-slate-400">
            No activity this week yet — copy a prompt or use a skill to see your report grow.
          </p>
          <Link
            href="/prompts"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            Explore prompts <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* 个性化推荐 */}
      {recommendations.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Based on what you used this week
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.map((r) => (
              <Link
                key={`${r.type}:${r.id}`}
                href={`/${TABLE[r.type]}/${r.slug || r.id}`}
                className="p-4 rounded-lg border border-slate-200 dark:border-dark-700 hover:border-brand-300 dark:hover:border-brand-700 transition-all group"
              >
                <span className="badge-default text-xs">{r.type}</span>
                <h3 className="font-semibold text-slate-900 dark:text-white mt-2 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-2">
                  {r.title}
                </h3>
                {r.description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {r.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
