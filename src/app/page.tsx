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
  Copy,
  Heart,
  FolderOpen,
} from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Category, Prompt } from '@/types';

export const dynamic = 'force-dynamic'; // 禁止静态缓存，确保数据实时

export default async function HomePage() {
  const supabase = createServerSupabaseClient();

  // 并行获取数据：全部分类 + 热门提示词（按使用次数排序，前6条）
  const [categoriesResult, promptsResult] = await Promise.all([
    supabase.from('categories').select('*').order('sort_order', { ascending: true }),
    supabase
      .from('prompts')
      .select('*, category:categories(*)')
      .eq('is_published', true)
      .order('usage_count', { ascending: false })
      .limit(6),
  ]);

  const categories: Category[] = categoriesResult.data || [];
  const prompts: Prompt[] = promptsResult.data || [];

  // 英雄区统计
  const stats = [
    { label: 'Prompts', value: promptsResult.data?.length || 0, icon: Sparkles },
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
            Free & Open Source
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-3xl mx-auto leading-tight">
            Discover & Share the Best{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-cyan-400">
              AI Prompts
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            A community-driven platform where developers, writers, and AI enthusiasts
            share powerful prompts. All free, no paywalls.
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
        </div>
      </section>

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
              <Link
                key={prompt.id}
                href={`/prompts/${prompt.slug || prompt.id}`}
                className="card p-5 group block"
              >
                {prompt.category && (
                  <span className="badge-primary mb-3 inline-block text-xs">
                    {prompt.category.name}
                  </span>
                )}
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                  {prompt.title}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">
                  {prompt.description}
                </p>
                {prompt.tags && prompt.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {prompt.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="badge-default text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                  <Copy className="w-3 h-3" />
                  {prompt.usage_count} uses
                </div>
              </Link>
            ))}
          </div>

          {prompts.length === 0 && (
            <p className="text-center text-slate-400 dark:text-slate-500 py-12">
              No prompts yet. Be the first to contribute!
            </p>
          )}
        </div>
      </section>

      {/* ---- CTA 区 ---- */}
      <section className="py-16 bg-slate-50 dark:bg-dark-950">
        <div className="container-page text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Ready to supercharge your AI workflow?
          </h2>
          <p className="mt-3 text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
            Join PromptHub today. All prompts are free. Save your favorites,
            organize them, and never lose a great prompt again.
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
