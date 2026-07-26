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
} from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { formatDate, getMembershipLabel } from '@/lib/utils';

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

      {/* 快捷入口 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
