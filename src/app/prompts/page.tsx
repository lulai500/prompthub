// ============================================================
// 提示词列表页
// 支持：关键词搜索、分类筛选、标签筛选、排序、分页
// ============================================================

import Link from 'next/link';
import { Search, SlidersHorizontal, X, ArrowUpDown } from 'lucide-react';
import { getCurrentUser } from '@/lib/supabase/server';
import { isCrawlerRequest } from '@/lib/crawler';
import {
  getCachedCategories,
  getCachedPromptList,
  getCachedPromptStatsBatch,
} from '@/lib/query-cache';
import { formatDate } from '@/lib/utils';
import TagLinks from '@/components/prompts/TagLinks';
import PromptCard from '@/components/prompts/PromptCard';
import TrackSearch from '@/components/analytics/TrackSearch';
import type { Category, Prompt } from '@/types';

export const dynamic = 'force-dynamic';

/** Max prompts visible to unauthenticated users */
const GUEST_LIMIT = 10;

interface SearchParams {
  search?: string;
  category?: string;
  tag?: string;
  page?: string;
  sort?: string;
}

/** 排序选项配置 */
const SORT_OPTIONS = [
  { value: 'latest', label: 'Latest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'most_used', label: 'Most Used' },
] as const;

export default async function PromptsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const currentUser = await getCurrentUser();
  const isAuthenticated = !!currentUser;
  // 爬虫（Googlebot / Bingbot / AI 摘要爬虫）视为"已登录"，
  // 放开 10 条游客限制与分页，确保全量提示词可被搜索引擎索引
  const canViewAll = isAuthenticated || isCrawlerRequest();

  // 获取搜索参数
  const search = searchParams.search || '';
  const categorySlug = searchParams.category || '';
  const tagFilter = searchParams.tag || '';
  const page = parseInt(searchParams.page || '1', 10);
  const sort = searchParams.sort || 'latest';
  // 统一按 12 条/页缓存（游客再截断到 10 条），登录/游客/爬虫共享同一缓存
  const limit = 12;
  const viewLimit = canViewAll ? limit : GUEST_LIMIT;
  // 分页显示范围（游客固定从 0 开始，仅第 1 页）
  const from = canViewAll ? (page - 1) * limit : 0;
  const to = from + viewLimit - 1;

  // 全部分类（缓存；同时用于解析分类 slug → id）
  const cats = await getCachedCategories();
  const categoryId = categorySlug
    ? cats.find((c) => c.slug === categorySlug)?.id ?? null
    : null;

  // 列表查询（缓存，key 含全部筛选参数）
  const { data: allPrompts, count } = await getCachedPromptList({
    search,
    categoryId,
    tag: tagFilter,
    page,
    sort,
    limit,
  });

  const totalPages = canViewAll ? Math.ceil((count || 0) / limit) : 1;
  // Cap results for unauthenticated users
  const cappedPrompts = canViewAll ? allPrompts : allPrompts.slice(0, GUEST_LIMIT);
  const hiddenCount = !canViewAll && (count || 0) > GUEST_LIMIT ? (count || 0) - GUEST_LIMIT : 0;

  // 预取评分统计（缓存）
  const promptIds = cappedPrompts.map((p) => p.id);
  let statsMap: Record<number, { avg_rating: number; rating_count: number; favorite_count: number }> = {};
  if (promptIds.length > 0) {
    const statsData = await getCachedPromptStatsBatch(promptIds);
    for (const s of statsData) {
      statsMap[s.prompt_id] = s;
    }
  }

  const results: Prompt[] = cappedPrompts.map((p) => ({
    ...p,
    avg_rating: statsMap[p.id]?.avg_rating || 0,
    rating_count: statsMap[p.id]?.rating_count || 0,
    favorite_count: statsMap[p.id]?.favorite_count || 0,
  }));

  /** 构建排序链接的查询参数 */
  function buildSortUrl(targetSort: string) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (categorySlug) params.set('category', categorySlug);
    if (tagFilter) params.set('tag', tagFilter);
    if (targetSort !== 'latest') params.set('sort', targetSort);
    return `/prompts?${params.toString()}`;
  }

  /** 构建分页链接的查询参数 */
  function buildPageUrl(p: number) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (categorySlug) params.set('category', categorySlug);
    if (tagFilter) params.set('tag', tagFilter);
    if (sort !== 'latest') params.set('sort', sort);
    params.set('page', String(p));
    return `/prompts?${params.toString()}`;
  }

  return (
    <div className="container-page py-10">
      {/* 搜索行为埋点 */}
      <TrackSearch query={search} />
      {/* 页头 */}
      <div className="mb-8">
        <h1 className="page-title text-slate-900 dark:text-white">
          {categorySlug
            ? cats.find((c) => c.slug === categorySlug)?.name || 'Prompts'
            : search
            ? `Search: "${search}"`
            : 'Explore Prompts'}
        </h1>
        <p className="page-subtitle">
          {count || 0} prompt{count !== 1 ? 's' : ''} found
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* ---- 侧边栏筛选 ---- */}
        <aside className="w-full lg:w-64 shrink-0">
          <div className="card p-4 lg:sticky lg:top-24">
            <div className="flex items-center gap-2 mb-4">
              <SlidersHorizontal className="w-4 h-4 text-slate-500" />
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                Filters
              </h3>
            </div>

            {/* 关键词搜索 */}
            <form action="/prompts" method="GET" className="mb-4">
              {categorySlug && (
                <input type="hidden" name="category" value={categorySlug} />
              )}
              {tagFilter && (
                <input type="hidden" name="tag" value={tagFilter} />
              )}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  name="search"
                  defaultValue={search}
                  placeholder="Search prompts..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg text-sm
                             bg-white dark:bg-dark-800
                             border border-slate-300 dark:border-dark-600
                             text-slate-900 dark:text-slate-100
                             placeholder:text-slate-400
                             focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
                             transition-colors duration-200"
                />
              </div>
            </form>

            {/* 分类 */}
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">
                Category
              </h4>
              <div className="space-y-1">
                <Link
                  href={`/prompts${search ? `?search=${search}` : ''}`}
                  className={`block px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    !categorySlug
                      ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 font-medium'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-700'
                  }`}
                >
                  All Categories
                </Link>
                {cats.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/prompts?category=${cat.slug}${search ? `&search=${search}` : ''}`}
                    className={`block px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      categorySlug === cat.slug
                        ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 font-medium'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-700'
                    }`}
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* 当前筛选标签 */}
            {(search || categorySlug || tagFilter) && (
              <Link
                href="/prompts"
                className="btn-ghost text-xs text-red-500 w-full justify-center mt-2"
              >
                <X className="w-3 h-3" />
                Clear all filters
              </Link>
            )}
          </div>
        </aside>

        {/* ---- 提示词列表 ---- */}
        <div className="flex-1">
          {/* ---- Guest limit banner ---- */}
          {!canViewAll && (
            <div className="card p-5 mb-5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-amber-800 dark:text-amber-300">
                    Preview Mode — Showing {cappedPrompts.length} of {count || 0} prompts
                  </h3>
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-0.5">
                    Sign in for free to unlock all {count || 0} prompts, favorites, and more.
                  </p>
                </div>
                <Link
                  href="/auth/login"
                  className="btn-primary text-sm whitespace-nowrap shrink-0"
                >
                  Sign In to Unlock
                </Link>
              </div>
            </div>
          )}

          {results.length > 0 ? (
            <>
              {/* 排序控件 */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {canViewAll
                    ? `Showing ${from + 1}–${Math.min(to + 1, count || 0)} of ${count || 0}`
                    : `Showing ${cappedPrompts.length} of ${count || 0} prompts`}
                </p>
                {canViewAll && (
                  <div className="flex items-center gap-1.5">
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    {SORT_OPTIONS.map((opt) => (
                      <Link
                        key={opt.value}
                        href={buildSortUrl(opt.value)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                          sort === opt.value
                            ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-700'
                        }`}
                      >
                        {opt.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* 卡片网格：响应式 1→2→3 列 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map((prompt) => (
                  <PromptCard key={prompt.id} prompt={prompt} />
                ))}
              </div>

              {/* 分页 — 仅登录用户可见 */}
              {canViewAll && totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  {Array.from({ length: totalPages }, (_, i) => {
                    const p = i + 1;
                    return (
                      <Link
                        key={p}
                        href={buildPageUrl(p)}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${
                          p === page
                            ? 'bg-brand-600 text-white'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-700'
                        }`}
                      >
                        {p}
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Locked pagination notice — 未登录用户 */}
              {!canViewAll && hiddenCount > 0 && (
                <div className="mt-8 text-center">
                  <div className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-100 dark:bg-dark-800 border border-slate-200 dark:border-dark-700">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      +{hiddenCount} more prompts locked
                    </span>
                    <Link
                      href="/auth/login"
                      className="text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline"
                    >
                      Sign in to view all →
                    </Link>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20">
              <Search className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                No prompts found
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Try adjusting your search or filters
              </p>
              <Link href="/prompts" className="btn-secondary text-sm">
                Clear filters
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
