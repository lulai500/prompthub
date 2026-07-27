'use client';
// ============================================================
// 标签链接组件（客户端组件）
// 在 Server Component 中使用，处理嵌套 Link 的事件冒泡
// ============================================================

import Link from 'next/link';

interface TagLinksProps {
  tags: string[];
  max?: number;
}

export default function TagLinks({ tags, max = 4 }: TagLinksProps) {
  const visible = tags.slice(0, max);
  const remaining = tags.length - max;

  return (
    <div className="flex flex-wrap gap-1.5 mb-3">
      {visible.map((tag) => (
        <Link
          key={tag}
          href={`/prompts?tag=${tag}`}
          className="badge-default text-xs hover:bg-brand-100 dark:hover:bg-brand-900/20 hover:text-brand-600 dark:hover:text-brand-400"
          onClick={(e) => e.stopPropagation()}
        >
          {tag}
        </Link>
      ))}
      {remaining > 0 && (
        <span className="badge-default text-xs">+{remaining}</span>
      )}
    </div>
  );
}
