// ============================================================
// 首页（Home Page）
// SSR 渲染，从 Supabase 获取热门提示词和分类数据
// ============================================================

import Link from 'next/link';
import {
  ArrowRight,
  Code2,
  BookOpen,
  Bot,
  Sparkles,
  Search,
  Heart,
  FolderOpen,
} from 'lucide-react';
import { createServerSupabaseClient, getCurrentUser } from '@/lib/supabase/server';
import { isCrawlerRequest } from '@/lib/crawler';
import {
  getCachedCategories,
  getCachedPromptCount,
  getCachedPopularPrompts,
  getCachedPopularFillers,
  getCachedDailyPick,
  getCachedVerifyCountsBatch,
} from '@/lib/query-cache';
import { getRecommendationsForUser, assetHref } from '@/lib/recommendations';
import PromptCard from '@/components/prompts/PromptCard';
import FirstVisitOnboarding from '@/components/onboarding/FirstVisitOnboarding';
import type { Category, Prompt } from '@/types';

export const dynamic = 'force-dynamic'; // 禁止静态缓存，确保数据实时

const GUEST_LIMIT = 10;

export default async function HomePage() {
  const currentUser = await getCurrentUser();
  const isAuthenticated = !!currentUser;
  // 爬虫（Googlebot / Bingbot / AI 摘要爬虫）视为"已登录"，
  // 确保首页展示真实总数与全量内容，可被搜索引擎索引
  const canViewAll = isAuthenticated || isCrawlerRequest();

  // 个性化推荐（登录用户）：基于 user_usage 历史标签
  let recommendations: Awaited<ReturnType<typeof getRecommendationsForUser>> = [];
  if (currentUser) {
    const supabase = createServerSupabaseClient();
    recommendations = await getRecommendationsForUser(supabase, currentUser.id);
  }

  // 并行获取数据（公开查询走 ISR 缓存，降低 Supabase 请求量与 TTFB）
  const [totalPrompts, categories] = await Promise.all([
    getCachedPromptCount(),
    getCachedCategories(),
  ]);

  // Guests see capped count
  const displayCount = canViewAll ? totalPrompts : Math.min(totalPrompts, GUEST_LIMIT);

  // 从每个分类各取热门提示词，确保首页展示多样性（缓存 key 含分类与条数）
  let popularPrompts: Prompt[] = [];
  if (categories.length > 0) {
    const perCategory = Math.max(1, Math.floor(6 / categories.length));
    const remainder = 6 - perCategory * categories.length;
    const maxPer = perCategory + (remainder > 0 ? 1 : 0);
    const cached = await getCachedPopularPrompts(
      categories.map((c) => c.id),
      maxPer
    );

    // 缓存结果按分类顺序分组，按原规则截取
    let idx = 0;
    for (let i = 0; i < categories.length; i++) {
      const need = i < remainder ? perCategory + 1 : perCategory;
      popularPrompts.push(...cached.slice(idx, idx + need));
      idx += need;
    }

    // 如果某分类下没有提示词，用全局热门补足到6条
    if (popularPrompts.length < 6) {
      const fillers = await getCachedPopularFillers(
        popularPrompts.map((p) => p.id),
        6 - popularPrompts.length
      );
      popularPrompts.push(...fillers);
    }
    popularPrompts = popularPrompts.slice(0, 6);
  }

  const prompts = popularPrompts;

  // 每日精选（按日期确定性轮换，驱动每日回访）
  const dateKey = new Date().toISOString().slice(0, 10);
  const dailyPick = await getCachedDailyPick(dateKey);

  // 热门提示词验证数（"我测试过"，卡片可信徽标）
  let homeVerifyMap: Record<number, number> = {};
  if (prompts.length > 0) {
    const verifyData = await getCachedVerifyCountsBatch('prompt', prompts.map((p) => p.id));
    for (const v of verifyData) homeVerifyMap[v.asset_id] = v.count;
  }

  // 英雄区统计 — 始终显示真实数据，未登录用户看到预览提示
  const stats = [
    { label: 'Prompts', value: totalPrompts, icon: Sparkles },
    { label: 'Categories', value: categories.length, icon: FolderOpen },
    { label: 'Free Forever', value: '100%', icon: Heart },
  ];

  return (
    <div>
      {/* ---- 英雄区 ---- */}
      <section className="relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-50/50 dark:from-brand-950/20 to-transparent" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-400/10 rounded-full blur-3xl" />

        <div className="container-page relative py-20 sm:py-28 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Prompts free forever · Skills &amp; workflows for members
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-3xl mx-auto leading-tight">
            Discover & Share the Best{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-cyan-400">
              AI Prompts
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            A community-driven platform of tested prompts, skills, and workflows.
            Prompts are free forever — members unlock full skills &amp; workflows.
          </p>

          {/* CTA 按钮 */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/prompts" className="btn-primary text-base px-8 py-3">
              <Search className="w-5 h-5" />
              Explore Prompts
            </Link>
            <Link href="/auth/register" className="btn-secondary text-base px-8 py-3">
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          {/* 统计 */}
          <div className="mt-12 flex items-center justify-center gap-8 sm:gap-12">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <stat.icon className="w-5 h-5 text-brand-500 mx-auto mb-1.5" />
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stat.value}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          {/* 未登录用户提示 */}
          {!canViewAll && (
            <p className="mt-4 text-sm text-amber-600 dark:text-amber-400">
              <Link href="/auth/login" className="font-medium underline hover:text-amber-700 dark:hover:text-amber-300">
                Sign in
              </Link>
              {' '}to browse, search, and save all {totalPrompts}+ prompts
            </p>
          )}
        </div>
      </section>

      {/* ---- 首次访问引导（未登录新访客）---- */}
      {!isAuthenticated && <FirstVisitOnboarding show={!isAuthenticated} />}

      {/* ---- 分类区 ---- */}
      <section className="py-16 bg-slate-50 dark:bg-dark-950">
        <div className="container-page">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Browse by Category
            </h2>
            <p className="mt-3 text-slate-500 dark:text-slate-400">
              Find the perfect prompt for your use case
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/prompts?category=${cat.slug}`}
                className="card p-6 group hover:border-brand-300 dark:hover:border-brand-700 transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center mb-3">
                  <CategoryIcon slug={cat.slug} />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                  {cat.name}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  {cat.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---- 为你推荐（登录用户专属）---- */}
      {recommendations.length > 0 && (
        <section className="py-10">
          <div className="container-page">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                Recommended for you
              </h2>
              <span className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                based on your recent activity
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {recommendations.map((r) => (
                <Link
                  key={`${r.type}:${r.id}`}
                  href={assetHref(r.type, r.slug, r.id)}
                  className="card p-5 group hover:border-brand-300 dark:hover:border-brand-700 transition-all"
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
        </section>
      )}

      {/* ---- 热门提示词区 ---- */}
      <section className="py-16">
        <div className="container-page">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                Popular Prompts
              </h2>
              <p className="mt-2 text-slate-500 dark:text-slate-400">
                Most used prompts by the community
              </p>
            </div>
            <Link
              href="/prompts"
              className="btn-ghost text-sm text-brand-600 dark:text-brand-400"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {prompts.map((prompt) => (
              <PromptCard key={prompt.id} prompt={prompt} verifyCount={homeVerifyMap[prompt.id] || 0} />
            ))}
          </div>

          {prompts.length === 0 && (
            <p className="text-center text-slate-400 dark:text-slate-500 py-12">
              No prompts yet. Be the first to contribute!
            </p>
          )}
        </div>
      </section>

      {/* ---- 每日精选 ---- */}
      {dailyPick && (
        <section className="py-10">
          <div className="card p-6 bg-gradient-to-r from-brand-50 to-cyan-50 dark:from-brand-950/20 dark:to-cyan-950/10 border-brand-200 dark:border-brand-800">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-brand-500" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Today&apos;s Pick
              </h2>
              <span className="text-xs text-slate-400 dark:text-slate-500">refreshes daily</span>
            </div>
            <Link
              href={`/prompts/${dailyPick.slug || dailyPick.id}`}
              className="block group"
            >
              <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                {dailyPick.title}
              </h3>
              {dailyPick.description && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  {dailyPick.description}
                </p>
              )}
              <div className="flex items-center gap-2 mt-3 text-xs">
                {dailyPick.categoryName && (
                  <span className="badge-primary">{dailyPick.categoryName}</span>
                )}
                {dailyPick.model_name && (
                  <span className="badge-default">{dailyPick.model_name}</span>
                )}
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* ---- CTA 区 ---- */}
      <section className="py-16 bg-slate-50 dark:bg-dark-950">
        <div className="container-page text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Ready to supercharge your AI workflow?
          </h2>
          <p className="mt-3 text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
            Join PromptHub today. Prompts are free forever. Members unlock full
            skills &amp; workflows — save favorites, organize, and never lose a great prompt.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link href="/auth/register" className="btn-primary px-8 py-3">
              Sign Up Free
            </Link>
            <Link href="/prompts" className="btn-secondary px-8 py-3">
              Browse Prompts
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/** 分类图标映射 */
function CategoryIcon({ slug }: { slug: string }) {
  const iconClass = 'w-5 h-5 text-brand-600 dark:text-brand-400';
  switch (slug) {
    case 'code-prompt':
      return <Code2 className={iconClass} />;
    case 'novel-writing':
      return <BookOpen className={iconClass} />;
    case 'agent-llm':
      return <Bot className={iconClass} />;
    default:
      return <Sparkles className={iconClass} />;
  }
}
