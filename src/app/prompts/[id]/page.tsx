// ============================================================
// 提示词详情页
// 展示完整信息：标题、标签、适配模型、完整 Prompt、
// 调参建议、截图、一键复制、收藏
// ============================================================

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Tag, Monitor, Lightbulb, Image } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';
import CopyButton from '@/components/prompts/CopyButton';
import FavoriteButton from '@/components/prompts/FavoriteButton';
import type { Prompt } from '@/types';

export const dynamic = 'force-dynamic';

interface Props {
  params: { id: string };
}

export default async function PromptDetailPage({ params }: Props) {
  const supabase = createServerSupabaseClient();
  const { id } = params;

  // 通过 slug 或 id 查询
  const isNumericId = /^\d+$/.test(id);
  let query = supabase
    .from('prompts')
    .select('*, category:categories(*)')
    .eq('is_published', true);

  if (isNumericId) {
    query = query.eq('id', parseInt(id, 10));
  } else {
    query = query.eq('slug', id);
  }

  const { data: prompt, error } = await query.single();

  if (error || !prompt) {
    notFound();
  }

  const p: Prompt = prompt;

  return (
    <div className="container-page py-10">
      {/* 返回链接 */}
      <Link
        href="/prompts"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to prompts
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ---- 左侧主内容 ---- */}
        <div className="lg:col-span-2 space-y-6">
          {/* 基本信息卡片 */}
          <div className="card p-6">
            {/* 分类 */}
            {p.category && (
              <Link
                href={`/prompts?category=${p.category.slug}`}
                className="badge-primary mb-4 inline-block hover:opacity-80"
              >
                {p.category.name}
              </Link>
            )}

            {/* 标题 */}
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-3">
              {p.title}
            </h1>

            {/* 描述 */}
            {p.description && (
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                {p.description}
              </p>
            )}

            {/* 适配模型 */}
            {p.model_name && (
              <div className="flex items-center gap-2 mb-4 text-sm">
                <Monitor className="w-4 h-4 text-slate-400" />
                <span className="text-slate-500 dark:text-slate-400">
                  Compatible Model:
                </span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {p.model_name}
                </span>
              </div>
            )}

            {/* 标签 */}
            {p.tags && p.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Tag className="w-4 h-4 text-slate-400" />
                {p.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/prompts?tag=${tag}`}
                    className="badge-default hover:bg-brand-100 dark:hover:bg-brand-900/20 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            )}

            {/* 发布时间 */}
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Published on {formatDate(p.created_at)}
              {p.updated_at !== p.created_at &&
                ` · Updated ${formatDate(p.updated_at)}`}
            </p>
          </div>

          {/* Prompt 文本 */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Prompt Text
              </h2>
              <CopyButton text={p.content} label="Copy Prompt" />
            </div>
            {/* Prompt 代码块 */}
            <pre className="p-4 rounded-xl bg-slate-950 dark:bg-dark-950 border border-slate-800 overflow-x-auto">
              <code className="text-sm text-slate-200 whitespace-pre-wrap font-mono leading-relaxed">
                {p.content}
              </code>
            </pre>
          </div>

          {/* 调参建议 */}
          {p.tips && (
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Tuning Tips
                </h2>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none text-slate-600 dark:text-slate-400">
                {/* 简单渲染 Markdown 风格的调参建议 */}
                {p.tips.split('\n').map((line, i) => {
                  if (line.startsWith('## ')) {
                    return (
                      <h3 key={i} className="text-base font-semibold text-slate-800 dark:text-slate-200 mt-3 mb-1">
                        {line.replace('## ', '')}
                      </h3>
                    );
                  }
                  if (line.startsWith('- ')) {
                    return (
                      <li key={i} className="ml-4 text-sm">
                        {line.replace('- ', '')}
                      </li>
                    );
                  }
                  if (line.trim()) {
                    return (
                      <p key={i} className="text-sm mb-1">
                        {line}
                      </p>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          )}

          {/* 截图区域 */}
          {p.screenshot_urls && p.screenshot_urls.length > 0 && (
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-3">
                <Image className="w-5 h-5 text-slate-500" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Usage Examples
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {p.screenshot_urls.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Example ${i + 1} for ${p.title}`}
                    referrerPolicy="no-referrer"
                    className="rounded-lg border border-slate-200 dark:border-dark-700 w-full h-auto"
                    loading="lazy"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ---- 右侧边栏 ---- */}
        <div className="space-y-4">
          {/* 操作区 */}
          <div className="card p-5 lg:sticky lg:top-24">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
              Actions
            </h3>
            <div className="space-y-3">
              <CopyButton text={p.content} label="Copy Prompt" />
              <FavoriteButton promptId={p.id} />

              {p.model_name && (
                <div className="pt-3 border-t border-slate-200 dark:border-dark-700">
                  <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">
                    Compatible Model
                  </p>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {p.model_name}
                  </p>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 dark:border-dark-700">
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">
                  Usage Count
                </p>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {p.usage_count} copies
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
