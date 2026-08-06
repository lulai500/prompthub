'use client';
// ============================================================
// 交付物查看弹窗
// 展示原始需求 + AI 生成结果；支持 复制 / 下载 / 重新生成
// Regenerate 复用 POST /api/workstation/tasks/[id]/run（覆盖结果）
// ============================================================

import { useState } from 'react';
import { X, Copy, Check, Download, RefreshCw } from 'lucide-react';
import type { ClientTask } from '@/types';
import { copyToClipboard, downloadText, slugify } from '@/lib/utils';
import { pollTaskStatus } from '@/lib/workstation-poll';

interface Props {
  task: ClientTask | null;
  open: boolean;
  onClose: () => void;
  /** 重新生成完成后回调（通常：关弹窗 + refresh） */
  onRegenerated?: () => void;
}

export default function DeliverableModal({ task, open, onClose, onRegenerated }: Props) {
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  if (!open || !task || !task.result) return null;
  const current = task as ClientTask; // 闭包内 prop 不做收窄，取局部常量
  const deliverable = current.result!;

  async function handleCopy() {
    if (await copyToClipboard(deliverable)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleDownload() {
    downloadText(`${slugify(current.title) || 'deliverable'}.txt`, deliverable);
  }

  async function handleRegenerate() {
    if (regenerating) return;
    setRegenerating(true);
    try {
      fetch(`/api/workstation/tasks/${current.id}/run`, { method: 'POST', keepalive: true }).catch(() => {});
      await pollTaskStatus(current.id);
      onRegenerated?.();
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 遮罩 */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-white dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl shadow-2xl animate-fade-in">
        {/* 头部 */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-200 dark:border-dark-700">
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 dark:text-white truncate">{current.title}</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {current.tokens ? `${current.tokens} tokens` : 'Deliverable'}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={handleRegenerate} disabled={regenerating} className="btn-ghost p-2" title="Regenerate with the same request">
              {regenerating ? <RefreshCw className="w-4 h-4 animate-spin text-brand-500" /> : <RefreshCw className="w-4 h-4" />}
            </button>
            <button onClick={handleCopy} className="btn-ghost p-2" title="Copy">
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
            <button onClick={handleDownload} className="btn-ghost p-2" title="Download .txt">
              <Download className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="btn-ghost p-2" title="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 正文 */}
        <div className="overflow-auto p-5 space-y-4">
          {/* 原始需求 */}
          {current.input && (
            <div className="rounded-lg bg-slate-50 dark:bg-dark-950/60 border border-slate-200 dark:border-slate-700/60 p-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">
                Your request
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap break-words">
                {current.input}
              </p>
            </div>
          )}

          <pre className="text-sm whitespace-pre-wrap break-words font-sans text-slate-700 dark:text-slate-300 leading-relaxed">
            {deliverable}
          </pre>

          {regenerating && (
            <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-brand-500" />
              Regenerating… this can take up to a minute.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
