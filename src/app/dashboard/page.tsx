// ============================================================
// 用户仪表盘（Dashboard）
// 展示用户基本信息、收藏统计、会员状态
// ============================================================

import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Heart,
  FolderOpen,
  Settings,
  Crown,
  Clock,
  ArrowRight,
  Flame,
  CheckCircle2,
  BarChart3,
} from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { formatDate, getMembershipLabel } from '@/lib/utils';
import { computeStreakStats } from '@/lib/streaks';
import CollectionsPanel from '@/components/collections/CollectionsPanel';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient();

  // 获取当前用户
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // 并行获取数据
  const [profileResult, favoritesResult, foldersResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('favorites').select('id', { count: 'exact' }).eq('user_id', user.id),
    supabase.from('folders').select('*').eq('user_id', user.id).order('sort_order'),
  ]);

  const profile = profileResult.data;
  const favoriteCount = favoritesResult.count || 0;
  const folders = foldersResult.data || [];

  // 最近使用（数据沉淀 → 复访理由）
  const { data: usage } = await supabase
    .from('user_usage')
    .select('asset_type, asset_id, use_count, last_used_at')
    .eq('user_id', user.id)
    .order('last_used_at', { ascending: false })
    .limit(8);
  const usageList = usage || [];
  const titleMap: Record<string, string> = {};
  const linkMap: Record<string, string> = {};
  if (usageList.length) {
    const byType: Record<string, number[]> = {};
    for (const u of usageList) {
      (byType[u.asset_type] = byType[u.asset_type] || []).push(u.asset_id);
    }
    const tableMap: Record<string, string> = {
      prompt: 'prompts',
      skill: 'skills',
      workflow: 'workflows',
    };
    for (const [type, ids] of Object.entries(byType)) {
      const table = tableMap[type];
      if (!table) continue;
      const { data: rows } = await supabase.from(table).select('id, title, slug').in('id', ids);
      for (const r of rows || []) {
        const key = `${type}:${r.id}`;
        titleMap[key] = r.title;
        linkMap[key] = `/${table}/${r.slug || r.id}`;
      }
    }
  }

  // 每日活跃日期（用于 streak 连续使用计算）
  const { data: activity } = await supabase
    .from('user_activity')
    .select('active_date')
    .eq('user_id', user.id)
    .order('active_date', { ascending: false })
    .limit(366);
  const dates = (activity || [])
    .map((a) => (a.active_date || '').toString().slice(0, 10))
    .filter(Boolean);
  const streak = computeStreakStats(dates);
  const todayStr = new Date().toISOString().slice(0, 10);
  const checkedInToday = dates.includes(todayStr);

  return (
    <div className="container-page py-10">
      {/* 欢迎区 */}
      <div className="card p-6 mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* 头像 */}
          <div className="w-16 h-16 rounded-full bg-brand-600 flex items-center justify-center text-white text-2xl font-bold shrink-0">
            {(profile?.username || user.email?.[0] || 'U').toUpperCase()[0]}
          </div>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Welcome, {profile?.username || 'User'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {user.email}
            </p>
          </div>

          {/* 会员状态 */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
            profile?.membership_tier === 'free'
              ? 'bg-slate-100 dark:bg-dark-700 text-slate-600 dark:text-slate-400'
              : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
          }`}>
            {profile?.membership_tier === 'free' ? (
              <Clock className="w-4 h-4" />
            ) : (
              <Crown className="w-4 h-4" />
            )}
            {getMembershipLabel(profile?.membership_tier || 'free')}
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Link href="/dashboard/favorites" className="card p-5 group hover:border-brand-300 dark:hover:border-brand-700 transition-all">
          <Heart className="w-8 h-8 text-red-500 mb-3" />
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {favoriteCount}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Favorite Prompts
          </p>
        </Link>

        <Link href="/dashboard/favorites" className="card p-5 group hover:border-brand-300 dark:hover:border-brand-700 transition-all">
          <FolderOpen className="w-8 h-8 text-amber-500 mb-3" />
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {folders.length}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Folders
          </p>
        </Link>

        <Link href="/pricing" className="card p-5 group hover:border-brand-300 dark:hover:border-brand-700 transition-all">
          <Crown className="w-8 h-8 text-yellow-500 mb-3" />
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {profile?.membership_tier === 'free' ? 'Free' : 'Pro'}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Current Plan
          </p>
        </Link>
      </div>

      {/* Streak 连续使用 */}
      <div className="card p-6 mb-8 border-amber-200 dark:border-amber-900/40 bg-gradient-to-r from-amber-50/80 via-orange-50/70 to-rose-50/60 dark:from-amber-950/40 dark:via-orange-950/25 dark:to-rose-950/20">
        <div className="flex items-center gap-5 flex-wrap">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
            streak.current > 0
              ? 'bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/30'
              : 'bg-slate-200 dark:bg-dark-700 text-slate-400'
          }`}>
            <Flame className="w-7 h-7" />
          </div>
          <div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white leading-none">
              {streak.current}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              day streak{streak.best > 0 && (
                <span className="text-slate-400 dark:text-slate-500"> · best {streak.best}</span>
              )}
            </p>
          </div>
          <div className="flex-1 min-w-[220px]">
            {checkedInToday ? (
              <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" /> Checked in today — keep it going!
              </p>
            ) : streak.current > 0 ? (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Copy a prompt today to keep your streak alive.
              </p>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Copy or use a prompt every day to build your streak.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 最近使用 */}
      {usageList.length > 0 && (
        <div className="card p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-brand-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Recently used
            </h2>
          </div>
          <div className="space-y-2">
            {usageList.map((u) => {
              const key = `${u.asset_type}:${u.asset_id}`;
              const title = titleMap[key] || `${u.asset_type} #${u.asset_id}`;
              const href = linkMap[key];
              if (!href) return null;
              return (
                <Link
                  key={key}
                  href={href}
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
      )}

      {/* 收藏集 */}
      <div className="mb-8">
        <CollectionsPanel />
      </div>

      {/* 快捷入口 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/dashboard/reports" className="card p-5 group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-brand-500" />
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                  Weekly Report
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Your activity &amp; recommendations
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-brand-500 transition-colors" />
          </div>
        </Link>

        <Link href="/dashboard/favorites" className="card p-5 group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Heart className="w-5 h-5 text-red-500" />
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                  My Favorites
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {favoriteCount} saved prompts
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-brand-500 transition-colors" />
          </div>
        </Link>

        <Link href="/dashboard/settings" className="card p-5 group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-slate-500" />
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                  Account Settings
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Update profile information
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-brand-500 transition-colors" />
          </div>
        </Link>
      </div>
    </div>
  );
}
