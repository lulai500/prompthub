'use client';
// ============================================================
// Newsletter 订阅表单
// - compact：页脚紧凑版（输入框 + 按钮一行）
// - 完整版：详情页侧栏卡片
// 提交到 /api/newsletter/subscribe，成功/重复订阅/失败均有反馈
// ============================================================

import { useState } from 'react';
import { Mail, Check, AlertCircle } from 'lucide-react';

interface NewsletterFormProps {
  /** 订阅来源标识：footer / prompt_detail / skill_detail / workflow_detail */
  source?: string;
  /** 紧凑版（页脚用） */
  compact?: boolean;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function NewsletterForm({
  source = 'footer',
  compact = false,
}: NewsletterFormProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;

    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value, source }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus('success');
        setEmail('');
        setMessage(
          data.message === 'already-subscribed'
            ? "You're already on the list. Talk soon!"
            : "You're on the list — the weekly pick of tested prompts & skills is on its way."
        );
      } else {
        setStatus('error');
        setMessage(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  }

  const inputDisabled = status === 'loading' || status === 'success';
  const inputClass =
    'w-full pl-9 pr-3 py-2 rounded-lg text-sm bg-white dark:bg-dark-800 border border-slate-300 dark:border-dark-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors duration-200';

  // ---- 页脚紧凑版 ----
  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full sm:max-w-sm">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            disabled={inputDisabled}
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          disabled={inputDisabled}
          className="btn-primary text-sm whitespace-nowrap"
        >
          {status === 'success' ? <Check className="w-4 h-4" /> : 'Subscribe'}
        </button>
      </form>
    );
  }

  // ---- 侧栏完整版 ----
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-2">
        <Mail className="w-4 h-4 text-brand-500" />
        <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
          Weekly Pick
        </h3>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
        3 tested prompts &amp; skills, every Monday. Free, no spam.
      </p>
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            disabled={inputDisabled}
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          disabled={inputDisabled}
          className="btn-primary w-full text-sm"
        >
          {status === 'success' ? (
            <>
              <Check className="w-4 h-4" /> Subscribed
            </>
          ) : (
            'Subscribe'
          )}
        </button>
      </form>
      {status === 'success' && (
        <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-start gap-1.5">
          <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          {message}
        </p>
      )}
      {status === 'error' && (
        <p className="text-xs text-red-500 dark:text-red-400 mt-2 flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          {message}
        </p>
      )}
    </div>
  );
}
