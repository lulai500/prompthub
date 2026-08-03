'use client';
// ============================================================
// 一键复制按钮
// 点击将提示词文本复制到剪贴板，带视觉反馈
// ============================================================

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { track } from '@vercel/analytics';
import { copyToClipboard } from '@/lib/utils';

interface CopyButtonProps {
  text: string;
  label?: string;
  /** 提示词 ID，传入后复制时会递增使用计数 */
  promptId?: number;
}

export default function CopyButton({ text, label = 'Copy', promptId }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      // 行为事件埋点：复制提示词
      track('prompt_copy', promptId ? { prompt_id: promptId } : undefined);
      // fire-and-forget: 递增使用计数，不阻塞 UI
      if (promptId) {
        fetch(`/api/prompts/${promptId}/usage`, { method: 'POST' }).catch(() => {});
      }
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={`btn text-sm ${
        copied
          ? 'bg-green-600 hover:bg-green-700 text-white'
          : 'btn-secondary'
      }`}
    >
      {copied ? (
        <>
          <Check className="w-4 h-4" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="w-4 h-4" />
          {label}
        </>
      )}
    </button>
  );
}
