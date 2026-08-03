// ============================================================
// 全部标签索引页
// 列出所有标签及提示词数量，方便发现 + 内部链接 SEO
// ============================================================

import Link from 'next/link';
import type { Metadata } from 'next';
import { Tags } from 'lucide-react';
import { getCachedAllTags } from '@/lib/query-cache';

// ISR：整页缓存 300s
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Browse All Prompt Tags — PromptHub',
  description:
    'Browse every tag on PromptHub — find tested AI prompts by topic, tool, or use case.',
};

export default async function TagsIndexPage() {
  const tags = await getCachedAllTags();

  return (
    <div className="container-page py-10">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-sm font-medium mb-3">
          <Tags className="w-4 h-4" />
          {tags.length} tags
        </div>
        <h1 className="page-title">Browse All Tags</h1>
        <p className="page-subtitle">
          Find tested AI prompts by topic, tool, or use case.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tags.map(({ tag, count }) => (
          <Link
            key={tag}
            href={`/tags/${encodeURIComponent(tag)}`}
            className="badge-default text-sm hover:bg-brand-100 dark:hover:bg-brand-900/20 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
          >
            {tag} <span className="text-slate-400">· {count}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
