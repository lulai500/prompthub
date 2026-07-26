'use client';
// ============================================================
// 标签链接组件（客户端组件）
// 用于在父级 Link 卡片内阻止事件冒泡
// ============================================================

import Link from 'next/link';

interface PromptTagsProps {
  tags: string[];
}

export default function PromptTags({ tags }: PromptTagsProps) {
  if (!tags || tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mb-3">
      {tags.slice(0, 4).map((tag) => (
        <Link
          key={tag}
          href={`/prompts?tag=${tag}`}
          className="badge-default text-xs hover:bg-brand-100 dark:hover:bg-brand-900/20 hover:text-brand-600 dark:hover:text-brand-400"
          onClick={(e) => e.stopPropagation()}
        >
          {tag}
        </Link>
      ))}
      {tags.length > 4 && (
        <span className="badge-default text-xs">+{tags.length - 4}</span>
      )}
    </div>
  );
}
