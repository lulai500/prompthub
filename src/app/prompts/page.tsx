// ============================================================
// 提示词列表页
// 支持：关键词搜索、分类筛选、标签筛选、排序、分页
// ============================================================

import Link from 'next/link';
import { Search, SlidersHorizontal, Copy, X, ArrowUpDown } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';
import TagLinks from '@/components/prompts/TagLinks';
import type { Category, Prompt } from '@/types';

export const dynamic = 'force-dynamic';

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
  const supabase = createServerSupabaseClient();

  // 获取搜索参数
  const search = searchParams.search || '';
  const categorySlug = searchParams.category || '';
  const tagFilter = searchParams.tag || '';
  const page = parseInt(searchParams.page || '1', 10);
  const sort = searchParams.sort || 'latest';
  const limit = 12;

  // 构建查询
  let query = supabase
    .from('prompts')
    .select('*, category:categories(*)', { count: 'exact' })
    .eq('is_published', true);

  // 关键词搜索
  if (search) {
    query = query.or(
      `title.ilike.%${search}%,description.ilike.%${search}%`
    );
  }

  // 分类筛选
  if (categorySlug) {
    const { data: catData } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', categorySlug)
      .single();

    if (catData) {
      query = query.eq('category_id', catData.id);
    }
  }

  // 标签筛选
  if (tagFilter) {
    query = query.contains('tags', [tagFilter]);
  }

  // 排序
  const orderColumn = sort === 'most_used' ? 'usage_count' : 'created_at';
  const orderAscending = sort === 'oldest';

  // 分页
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data: prompts, count } = await query
    .order(orderColumn, { ascending: orderAscending })
    .range(from, to);

  // 获取全部分类（侧边栏筛选用）
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });

  const totalPages = Math.ceil((count || 0) / limit);
  const results: Prompt[] = prompts || [];
  const cats: Category[] = categories || [];

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
          {results.length > 0 ? (
            <>
              {/* 排序控件 */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Showing {from + 1}–{Math.min(to + 1, count || 0)} of {count || 0}
                </p>
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
              </div>

              {/* 卡片网格：响应式 1→2→3 列 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map((prompt) => (
                  <Link
                    key={prompt.id}
                    href={`/prompts/${prompt.slug || prompt.id}`}
                    className="card p-4 group block"
                  >
                    {prompt.category && (
                      <span className="badge-primary mb-2 inline-block text-xs">
                        {prompt.category.name}
                      </span>
                    )}
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1.5 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-1">
                      {prompt.title}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-2 line-clamp-2">
                      {prompt.description || prompt.content.slice(0, 120)}
                    </p>
                    <TagLinks tags={prompt.tags || []} />
                    <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 mt-2">
                      <span>{formatDate(prompt.created_at)}</span>
                      {prompt.usage_count > 0 ? (
                        <span className="flex items-center gap-1">
                          <Copy className="w-3 h-3" />
                          {prompt.usage_count}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                          New
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>

              {/* 分页 */}
              {totalPages > 1 && (
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
