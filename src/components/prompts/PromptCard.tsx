// ============================================================
// 提示词卡片组件
// 用于列表页展示提示词摘要信息
// ============================================================

import Link from 'next/link';
import { Copy, Tag } from 'lucide-react';
import type { Prompt } from '@/types';
import { truncateText, formatDate } from '@/lib/utils';

interface PromptCardProps {
  prompt: Prompt;
}

export default function PromptCard({ prompt }: PromptCardProps) {
  return (
    <Link
      href={`/prompts/${prompt.slug || prompt.id}`}
      className="card p-5 group block"
    >
      {/* 分类标签 */}
      {prompt.category && (
        <span className="badge-primary mb-3 inline-block">
          {prompt.category.name}
        </span>
      )}

      {/* 标题 */}
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
        {prompt.title}
      </h3>

      {/* 描述 */}
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
        {prompt.description || 'No description provided.'}
      </p>

      {/* 适配模型 */}
      {prompt.model_name && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
          Compatible with:{' '}
          <span className="text-slate-600 dark:text-slate-300">
            {prompt.model_name}
          </span>
        </p>
      )}

      {/* 标签列表 */}
      {prompt.tags && prompt.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {prompt.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="badge-default text-xs">
              {tag}
            </span>
          ))}
          {prompt.tags.length > 4 && (
            <span className="badge-default text-xs">
              +{prompt.tags.length - 4}
            </span>
          )}
        </div>
      )}

      {/* 底部信息 */}
      <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
        <span>{formatDate(prompt.created_at)}</span>
        <span className="flex items-center gap-1">
          <Copy className="w-3 h-3" />
          {prompt.usage_count} uses
        </span>
      </div>
    </Link>
  );
}
