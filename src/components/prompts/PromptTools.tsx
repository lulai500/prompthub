'use client';
// ============================================================
// PromptTools — 提示词工具面板
// 1. Token / 成本估算（始终显示）
// 2. 变量填充器（提示词含 {var} / {{var}} 时显示）
//    填完后可一键复制填充后的完整提示词
// ============================================================

import { useMemo, useState } from 'react';
import { SlidersHorizontal, Copy, Check } from 'lucide-react';
import { extractVariables, fillVariables, estimateTokens } from '@/lib/prompt-utils';
import { estimateCost } from '@/lib/model-pricing';
import { copyToClipboard } from '@/lib/utils';

interface PromptToolsProps {
  text: string;
  modelName?: string | null;
  /** 传入 promptId 时，复制填充版也会递增使用计数 */
  promptId?: number;
}

export default function PromptTools({ text, modelName, promptId }: PromptToolsProps) {
  const variables = useMemo(() => extractVariables(text), [text]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  const filledText = variables.length > 0 ? fillVariables(text, values) : text;
  const tokens = estimateTokens(filledText);
  const cost = estimateCost(modelName || '', tokens);
  const costDisplay = cost < 0.01 ? cost.toFixed(4) : cost.toFixed(2);

  async function handleCopy() {
    const ok = await copyToClipboard(filledText);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      // fire-and-forget：递增使用计数，与顶部 CopyButton 一致
      if (promptId) {
        fetch(`/api/prompts/${promptId}/usage`, { method: 'POST' }).catch(() => {});
      }
    }
  }

  return (
    <div className="mt-4 p-4 rounded-xl bg-slate-100 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 space-y-3">
      {/* Token / 成本估算 */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>
          ~{tokens.toLocaleString()} tokens · ~${costDisplay} / run (input)
        </span>
        <span className="text-slate-400 dark:text-slate-500">estimate</span>
      </div>

      {/* 变量填充器 */}
      {variables.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-brand-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Fill variables
            </h3>
          </div>
          <div className="space-y-2">
            {variables.map((v) => (
              <div key={v}>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1 capitalize">
                  {v.replace(/_/g, ' ')}
                </label>
                <input
                  type="text"
                  value={values[v] || ''}
                  onChange={(e) => setValues({ ...values, [v]: e.target.value })}
                  placeholder={v.replace(/_/g, ' ')}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-white dark:bg-dark-950 border border-slate-300 dark:border-dark-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors"
                />
              </div>
            ))}
          </div>
          <button
            onClick={handleCopy}
            disabled={copied}
            className="btn-primary w-full text-sm"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" /> Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" /> Copy Filled Prompt
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
}
