'use client';
// ============================================================
// 提示词预览弹窗
// 在列表页快速查看完整 Prompt 和示例输出，无需跳转详情页
// ============================================================

import { useEffect, useCallback } from 'react';
import Link from 'next/link';
import { X, Eye, Copy, Monitor, ExternalLink } from 'lucide-react';
import CopyButton from '@/components/prompts/CopyButton';
import type { Prompt } from '@/types';

interface Props {
  prompt: Prompt;
  open: boolean;
  onClose: () => void;
}

export default function PromptPreviewModal({ prompt, open, onClose }: Props) {
  // ESC 关闭
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden'; // 禁止背景滚动
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 遮罩层 */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* 弹窗本体 */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Preview: ${prompt.title}`}
        className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-dark-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-dark-700 overflow-hidden animate-fade-in"
      >
        {/* ---- 头部 ---- */}
        <div className="flex items-start justify-between p-5 border-b border-slate-200 dark:border-dark-700">
          <div className="flex-1 min-w-0 mr-4">
            {prompt.category && (
              <span className="badge-primary mb-2 inline-block text-xs">
                {prompt.category.name}
              </span>
            )}
            <h2 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-2">
              {prompt.title}
            </h2>
            {prompt.model_name && (
              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                <Monitor className="w-3.5 h-3.5" />
                {prompt.model_name}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="btn-ghost p-1.5 rounded-lg shrink-0"
            aria-label="Close preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ---- 内容区（可滚动） ---- */}
        <div className="overflow-y-auto p-5 space-y-5" style={{ maxHeight: 'calc(90vh - 180px)' }}>
          {/* 描述 */}
          {prompt.description && (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {prompt.description}
            </p>
          )}

          {/* Prompt 文本 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Prompt Text
              </h3>
              <CopyButton text={prompt.content} label="Copy" promptId={prompt.id} />
            </div>
            <pre className="p-4 rounded-xl bg-slate-950 dark:bg-dark-950 border border-slate-800 overflow-x-auto max-h-[300px] overflow-y-auto">
              <code className="text-sm text-slate-200 whitespace-pre-wrap font-mono leading-relaxed">
                {prompt.content}
              </code>
            </pre>
          </div>

          {/* 示例输出 */}
          {prompt.example_output && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-green-500" />
                Example Output
              </h3>
              <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 max-h-[300px] overflow-y-auto">
                <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {prompt.example_output}
                </div>
              </div>
            </div>
          )}

          {/* 调参建议（精简版） */}
          {prompt.tips && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Tuning Tips
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3">
                {prompt.tips}
              </p>
            </div>
          )}
        </div>

        {/* ---- 底部操作栏 ---- */}
        <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-900/50">
          <Link
            href={`/prompts/${prompt.slug || prompt.id}`}
            onClick={onClose}
            className="btn-ghost text-sm text-brand-600 dark:text-brand-400"
          >
            <ExternalLink className="w-4 h-4" />
            View Full Details
          </Link>
          <div className="flex items-center gap-2">
            {prompt.tags && prompt.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="badge-default text-xs">{tag}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
