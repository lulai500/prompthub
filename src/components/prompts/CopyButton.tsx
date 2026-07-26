'use client';
// ============================================================
// 一键复制按钮
// 点击将提示词文本复制到剪贴板，带视觉反馈
// ============================================================

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { copyToClipboard } from '@/lib/utils';

interface CopyButtonProps {
  text: string;
  label?: string;
}

export default function CopyButton({ text, label = 'Copy' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // 2秒后复原
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
