'use client';
// ============================================================
// 交付物查看弹窗
// 查看 AI 生成结果 + 复制（copyToClipboard）+ 下载（downloadText）
// ============================================================

import { useState } from 'react';
import { X, Copy, Check, Download } from 'lucide-react';
import type { ClientTask } from '@/types';
import { copyToClipboard, downloadText, slugify } from '@/lib/utils';

interface Props {
  task: ClientTask | null;
  open: boolean;
  onClose: () => void;
}

export default function DeliverableModal({ task, open, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  if (!open || !task || !task.result) return null;
  const current = task as ClientTask;
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 遮罩 */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-white dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl shadow-2xl animate-fade-in">
        {/* 头部 */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-200 dark:border-dark-700">
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 dark:text-white truncate">{task.title}</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {task.tokens ? `${task.tokens} tokens` : 'Deliverable'}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
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
        <div className="overflow-auto p-5">
          <pre className="text-sm whitespace-pre-wrap break-words font-sans text-slate-700 dark:text-slate-300 leading-relaxed">
            {task.result}
          </pre>
        </div>
      </div>
    </div>
  );
}
