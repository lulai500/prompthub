// ============================================================
// 提示词详情页
// 展示完整信息：标题、标签、适配模型、完整 Prompt、
// 调参建议、截图、一键复制、收藏
// ============================================================

import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, Tag, Monitor, Lightbulb, Image, Eye } from 'lucide-react';
import {
  getCachedPromptDetail,
  getCachedPromptStats,
  getCachedVerifyCount,
  getCachedRelatedItems,
  getCachedVersionInfo,
} from '@/lib/query-cache';
import { formatDate } from '@/lib/utils';
import CopyButton from '@/components/prompts/CopyButton';
import FavoriteButton from '@/components/prompts/FavoriteButton';
import RatingStars from '@/components/prompts/RatingStars';
import VerifyButton from '@/components/prompts/VerifyButton';
import ForkButton from '@/components/prompts/ForkButton';
import NewsletterForm from '@/components/newsletter/NewsletterForm';
import PromptTools from '@/components/prompts/PromptTools';
import RelatedPillars, { type RelatedPillarItem } from '@/components/prompts/RelatedPillars';
import type { Prompt } from '@/types';

// ISR：无登录态依赖，整页缓存 120s，公开数据由 unstable_cache 再兜一层
export const revalidate = 120;

interface Props {
  params: { id: string };
}

/** 按 slug 或 id 查询已发布提示词（供 generateMetadata 与页面共用，走 ISR 缓存） */
function fetchPrompt(id: string) {
  return getCachedPromptDetail(id);
}

/** 详情页 SEO 元数据：独立标题/描述 + OG + Twitter Card（分享到 X/Reddit 显示卡片） */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const prompt = await fetchPrompt(params.id);
  if (!prompt) return { title: 'Prompt not found' };

  const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const slug = prompt.slug || String(prompt.id);
  const url = `${site}/prompts/${slug}`;
  const description =
    prompt.description ||
    `A tested ${prompt.model_name || 'AI'} prompt. Copy it for free at PromptHub.`;

  // 动态 OG 图（/api/og 生成 1200x630 卡片）
  const og = new URLSearchParams({
    title: prompt.title,
    category: prompt.category?.name || 'AI Prompt',
    model: prompt.model_name || '',
  });
  const ogImage = `${site}/api/og?${og.toString()}`;

  return {
    title: `${prompt.title} — AI Prompt`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: prompt.title,
      description,
      type: 'article',
      url,
      siteName: 'PromptHub',
      images: [{ url: ogImage, width: 1200, height: 630, alt: prompt.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: prompt.title,
      description,
      images: [ogImage],
    },
  };
}

export default async function PromptDetailPage({ params }: Props) {
  const { id } = params;

  // 通过 slug 或 id 查询（ISR 缓存）
  const p = await fetchPrompt(id);

  if (!p) {
    notFound();
  }

  // 预取评分统计（ISR 缓存）
  const promptStats = await getCachedPromptStats(p.id);

  // "我测试过"验证数（ISR 缓存；verifications 表未建时优雅降级为 0）
  const verifyCount = await getCachedVerifyCount(p.id);

  // 版本信息（asset_versions 表未建时优雅降级为 0）
  const versionInfo = await getCachedVersionInfo('prompt', p.id);

  // ---- 跨板块"搭配使用"推荐（按共享标签匹配，ISR 缓存）----
  let relatedItems: RelatedPillarItem[] = [];
  if (p.tags && p.tags.length > 0) {
    const { skills, workflows } = await getCachedRelatedItems(p.id, p.tags);
    relatedItems = [
      ...(skills || []).map((s) => ({
        type: 'skill' as const,
        id: s.id,
        title: s.title,
        slug: s.slug,
        label: s.skill_format,
      })),
      ...(workflows || []).map((w) => ({
        type: 'workflow' as const,
        id: w.id,
        title: w.title,
        slug: w.slug,
        label: w.workflow_type,
      })),
    ];
  }

  // ---- JSON-LD 结构化数据（CreativeWork，争取富结果与 AI 摘要引用资格）----
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const slug = p.slug || String(p.id);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: p.title,
    description: p.description,
    url: `${site}/prompts/${slug}`,
    ...(p.author?.username
      ? { author: { '@type': 'Person', name: p.author.username } }
      : {}),
    ...(p.model_name
      ? { isBasedOn: { '@type': 'SoftwareApplication', name: p.model_name } }
      : {}),
    ...(p.tags && p.tags.length > 0 ? { keywords: p.tags.join(', ') } : {}),
    datePublished: p.created_at,
    dateModified: p.updated_at,
    ...(promptStats && promptStats.rating_count > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: Number(promptStats.avg_rating).toFixed(1),
            ratingCount: promptStats.rating_count,
          },
        }
      : {}),
  };

  return (
    <div className="container-page py-10">
      {/* JSON-LD 结构化数据 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
                    href={`/tags/${encodeURIComponent(tag)}`}
                    className="badge-default hover:bg-brand-100 dark:hover:bg-brand-900/20 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            )}

            {/* 作者 & 发布时间 */}
            <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
              {p.author && (
                <Link
                  href={`/users/${p.author.username || p.author.id}`}
                  className="flex items-center gap-1.5 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                >
                  <div className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400">
                      {(p.author.username || 'A')[0].toUpperCase()}
                    </span>
                  </div>
                  <span>{p.author.username || 'Anonymous'}</span>
                </Link>
              )}
              <span>
                Published on {formatDate(p.created_at)}
                {p.updated_at !== p.created_at &&
                  ` · Updated ${formatDate(p.updated_at)}`}
              </span>
              {versionInfo.count > 0 && (
                <Link
                  href={`/versions/prompt/${p.id}`}
                  className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                >
                  v{versionInfo.count} · history
                </Link>
              )}
            </div>
          </div>

          {/* Prompt 文本 */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Prompt Text
              </h2>
              <CopyButton text={p.content} label="Copy Prompt" promptId={p.id} />
            </div>
            {/* Prompt 代码块 */}
            <pre className="p-4 rounded-xl bg-slate-950 dark:bg-dark-950 border border-slate-800 overflow-x-auto">
              <code className="text-sm text-slate-200 whitespace-pre-wrap font-mono leading-relaxed">
                {p.content}
              </code>
            </pre>

            {/* 变量填充器 + Token/成本估算 */}
            <PromptTools text={p.content} modelName={p.model_name} promptId={p.id} />
          </div>

          {/* 示例输出 */}
          {p.example_output && (
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="w-5 h-5 text-green-500" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Example Output
                </h2>
              </div>
              <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800">
                <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {p.example_output}
                </div>
              </div>
            </div>
          )}

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
              <CopyButton text={p.content} label="Copy Prompt" promptId={p.id} />
              <FavoriteButton promptId={p.id} />
              <VerifyButton promptId={p.id} initialCount={verifyCount} />
              <ForkButton
                data={{
                  type: 'prompt',
                  title: p.title,
                  description: p.description || '',
                  content: p.content,
                  model_name: p.model_name || '',
                  tips: p.tips || '',
                }}
              />

              {/* 评分 */}
              <div className="pt-3 border-t border-slate-200 dark:border-dark-700">
                <RatingStars
                  promptId={p.id}
                  initialAvgRating={promptStats?.avg_rating || 0}
                  initialRatingCount={promptStats?.rating_count || 0}
                />
              </div>

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
                  {p.usage_count > 0
                    ? `${p.usage_count} cop${p.usage_count !== 1 ? 'ies' : 'y'}`
                    : 'Be the first to try!'}
                </p>
              </div>
            </div>
          </div>

          {/* 周报订阅 */}
          <NewsletterForm source="prompt_detail" />
        </div>
      </div>

      {/* 跨板块"搭配使用"推荐（共享标签匹配） */}
      <RelatedPillars items={relatedItems} />
    </div>
  );
}
