// ============================================================
// Tag 落地页（Programmatic SEO）
// 独立可索引 URL：/tags/{tag}，带元数据 + JSON-LD + 提示词列表
// 覆盖 "{tag} prompt" 类长尾关键词
// ============================================================

import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Tag, ArrowUpRight } from 'lucide-react';
import { getCachedTagPrompts, getCachedPromptStatsBatch } from '@/lib/query-cache';
import PromptCard from '@/components/prompts/PromptCard';
import type { Prompt } from '@/types';

// ISR：整页缓存 300s
export const revalidate = 300;

interface Props {
  params: { tag: string };
}

/** 标签展示名（下划线 → 空格，首字母大写） */
function display(tag: string): string {
  const cleaned = tag.replace(/-/g, ' ').replace(/_/g, ' ').trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tag = decodeURIComponent(params.tag);
  const { count } = await getCachedTagPrompts(tag);
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const url = `${site}/tags/${encodeURIComponent(tag)}`;
  const title = `${display(tag)} Prompts — ${count} Tested AI Prompts`;
  const description = `Browse ${count} tested AI prompts tagged "${display(tag)}" — coding, writing, and agent workflows. Free to copy and use.`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'website', siteName: 'PromptHub' },
  };
}

export default async function TagPage({ params }: Props) {
  const tag = decodeURIComponent(params.tag);
  const { data, count } = await getCachedTagPrompts(tag);
  if (count === 0) notFound();

  // 预取统计
  const promptIds = data.map((p) => p.id);
  const statsData = await getCachedPromptStatsBatch(promptIds);
  const results: Prompt[] = data.map((p) => ({
    ...p,
    avg_rating: statsData.find((s) => s.prompt_id === p.id)?.avg_rating || 0,
    rating_count: statsData.find((s) => s.prompt_id === p.id)?.rating_count || 0,
    favorite_count: statsData.find((s) => s.prompt_id === p.id)?.favorite_count || 0,
  }));

  // JSON-LD ItemList
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${display(tag)} prompts`,
    numberOfItems: count,
    itemListElement: results.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: p.title,
      url: `${site}/prompts/${p.slug || p.id}`,
    })),
  };

  return (
    <div className="container-page py-10">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* 页头 */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-sm font-medium mb-3">
          <Tag className="w-4 h-4" />
          Tag
        </div>
        <h1 className="page-title">{display(tag)} Prompts</h1>
        <p className="page-subtitle">
          {count} tested AI prompt{count !== 1 ? 's' : ''} tagged &quot;{tag}&quot; —
          free to browse and copy.
        </p>
      </div>

      {/* 提示词列表 */}
      {results.length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400">No prompts with this tag yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {results.map((prompt) => (
            <PromptCard key={prompt.id} prompt={prompt} />
          ))}
        </div>
      )}

      {/* 浏览全部标签 */}
      <div className="mt-12 text-center">
        <Link href="/tags" className="btn-secondary text-sm">
          Browse all tags
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
