// ============================================================
// 用户公开主页（贡献档案）
// 展示用户信息、三支柱贡献统计、验证徽章、公开收藏集、streak
// 目标：让用户主页成为可沉淀、可分享的身份资产（身份依赖）
// ============================================================

import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Calendar,
  Sparkles,
  BadgeCheck,
  FolderOpen,
  Crown,
  Flame,
  Layers,
} from 'lucide-react';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';
import { computeStreakStats } from '@/lib/streaks';
import PromptCard from '@/components/prompts/PromptCard';
import type { ProfilePublic, Prompt } from '@/types';

export const dynamic = 'force-dynamic';

interface Props {
  params: { username: string };
}

// 贡献者等级（按已发布资产总数）
function contributorTier(total: number): {
  label: string;
  cls: string;
  icon: typeof Crown;
} {
  if (total >= 10)
    return { label: 'Top Contributor', cls: 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400', icon: Crown };
  if (total >= 1)
    return { label: 'Contributor', cls: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400', icon: Sparkles };
  return { label: 'New Member', cls: 'bg-slate-100 dark:bg-dark-700 text-slate-500 dark:text-slate-400', icon: User };
}

export default async function UserProfilePage({ params }: Props) {
  const supabase = createServerSupabaseClient();
  const admin = createAdminClient();
  const { username } = params;

  // 查找用户（username 与 id 分开查：PostgREST .or() 对混合类型列不短路，
  // id.eq.字符串 会对 uuid 列报类型错误导致整查询失败）
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let profile = null;
  const byName = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .maybeSingle();
  if (byName.data) profile = byName.data;
  else if (UUID_RE.test(username)) {
    const byId = await supabase
      .from('profiles')
      .select('*')
      .eq('id', username)
      .maybeSingle();
    if (byId.data) profile = byId.data;
  }

  if (!profile) {
    notFound();
  }

  const userInfo: ProfilePublic = {
    id: profile.id,
    username: profile.username,
    avatar_url: profile.avatar_url,
    bio: profile.bio,
    created_at: profile.created_at,
  };

  // 当前登录用户（判断是否本人查看 → streak 可见性）
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isSelf = user?.id === profile.id;

  // ---- 三支柱贡献数（已发布）----
  const [promptsRes, skillsRes, workflowsRes, verifiedRes] = await Promise.all([
    supabase.from('prompts').select('id', { count: 'exact' }).eq('author_id', profile.id).eq('is_published', true),
    admin.from('skills').select('id', { count: 'exact' }).eq('author_id', profile.id).eq('is_published', true),
    admin.from('workflows').select('id', { count: 'exact' }).eq('author_id', profile.id).eq('is_published', true),
    supabase.from('asset_verifications').select('id', { count: 'exact' }).eq('user_id', profile.id),
  ]);
  const promptCount = promptsRes.count || 0;
  const skillCount = skillsRes.count || 0;
  const workflowCount = workflowsRes.count || 0;
  const totalContributions = promptCount + skillCount + workflowCount;
  const verifiedCount = verifiedRes.count || 0;
  const tier = contributorTier(totalContributions);

  // ---- 公开收藏集 + 条目数 ----
  const { data: collections } = await supabase
    .from('collections')
    .select('id, title, slug, description, created_at')
    .eq('user_id', profile.id)
    .eq('is_public', true)
    .order('created_at', { ascending: false });
  const itemCountMap: Record<number, number> = {};
  if (collections && collections.length) {
    const { data: items } = await supabase
      .from('collection_items')
      .select('collection_id')
      .in('collection_id', collections.map((c) => c.id));
    for (const it of items || []) {
      itemCountMap[it.collection_id] = (itemCountMap[it.collection_id] || 0) + 1;
    }
  }

  // ---- streak（仅本人可见：user_activity 为私有 RLS）----
  let streak: { current: number; best: number } | null = null;
  if (isSelf) {
    const { data: activity } = await supabase
      .from('user_activity')
      .select('active_date')
      .eq('user_id', profile.id);
    const dates = (activity || [])
      .map((a) => (a.active_date || '').toString().slice(0, 10))
      .filter(Boolean);
    streak = computeStreakStats(dates);
  }

  // 获取用户的提示词
  const { data: prompts } = await supabase
    .from('prompts')
    .select('*, category:categories(*)', { count: 'exact' })
    .eq('author_id', profile.id)
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  const userPrompts: Prompt[] = prompts || [];

  return (
    <div className="container-page py-10">
      <Link
        href="/prompts"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-brand-600 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to prompts
      </Link>

      {/* 用户信息卡片 */}
      <div className="card p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
            <span className="text-2xl font-bold text-brand-600 dark:text-brand-400">
              {(userInfo.username || 'A')[0].toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                {userInfo.username || 'Anonymous'}
              </h1>
              {totalContributions > 0 && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${tier.cls}`}
                >
                  <tier.icon className="w-3 h-3" />
                  {tier.label}
                </span>
              )}
            </div>
            {userInfo.bio && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {userInfo.bio}
              </p>
            )}
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-400 dark:text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Joined {formatDate(userInfo.created_at)}
              </span>
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                {totalContributions} contribution{totalContributions !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 贡献档案统计 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card p-5">
          <Layers className="w-6 h-6 text-brand-500 mb-3" />
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalContributions}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            assets{promptCount > 0 && ` · ${promptCount}p`}
            {skillCount > 0 && ` · ${skillCount}s`}
            {workflowCount > 0 && ` · ${workflowCount}w`}
          </p>
        </div>
        <div className="card p-5">
          <BadgeCheck className="w-6 h-6 text-green-500 mb-3" />
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{verifiedCount}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">verified prompts</p>
        </div>
        <div className="card p-5">
          <FolderOpen className="w-6 h-6 text-amber-500 mb-3" />
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {collections?.length || 0}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">public collections</p>
        </div>
        {isSelf && streak ? (
          <div className="card p-5">
            <Flame className={`w-6 h-6 mb-3 ${streak.current > 0 ? 'text-orange-500' : 'text-slate-400'}`} />
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {streak.current}
              <span className="text-sm font-normal text-slate-400 ml-1">
                day{streak.best > 0 ? ` · best ${streak.best}` : ''}
              </span>
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              your streak (private)
            </p>
          </div>
        ) : (
          <div className="card p-5 flex flex-col justify-center">
            <p className="text-sm text-slate-400 dark:text-slate-500">
              {isSelf ? 'Start using prompts to build your streak.' : 'Streak is private.'}
            </p>
          </div>
        )}
      </div>

      {/* 公开收藏集 */}
      {collections && collections.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <FolderOpen className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Public collections
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {collections.map((c) => (
              <Link
                key={c.id}
                href={`/collections/${c.slug || c.id}`}
                className="card p-5 group hover:border-brand-300 dark:hover:border-brand-700 transition-all"
              >
                <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-2">
                  {c.title}
                </h3>
                {c.description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {c.description}
                  </p>
                )}
                <p className="text-xs text-slate-400 mt-3">
                  {itemCountMap[c.id] || 0} item{(itemCountMap[c.id] || 0) !== 1 ? 's' : ''}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 用户的提示词列表 */}
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        Contributions
      </h2>

      {userPrompts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {userPrompts.map((prompt) => (
            <PromptCard key={prompt.id} prompt={prompt} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <User className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">
            No prompts published yet.
          </p>
        </div>
      )}
    </div>
  );
}
