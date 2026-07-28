'use client';
// ============================================================
// 用户反馈页面
// 支持匿名和登录用户提交建议、Bug 报告、功能请求
// ============================================================

import { useState } from 'react';
import Link from 'next/link';
import {
  Lightbulb,
  Bug,
  Sparkles,
  MessageSquare,
  Send,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const FEEDBACK_TYPES = [
  { value: 'suggestion', label: 'Suggestion', icon: Lightbulb, desc: 'Ideas to improve the platform' },
  { value: 'bug_report', label: 'Bug Report', icon: Bug, desc: 'Something is not working right' },
  { value: 'feature_request', label: 'Feature Request', icon: Sparkles, desc: 'Something new you would like to see' },
  { value: 'other', label: 'Other', icon: MessageSquare, desc: 'Anything else on your mind' },
] as const;

export default function FeedbackPage() {
  const supabase = createClient();

  const [type, setType] = useState<string>('suggestion');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Please enter a title.');
      return;
    }
    if (!message.trim()) {
      setError('Please enter your feedback.');
      return;
    }

    setSubmitting(true);

    // 获取当前用户（可选）
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id || null;

    const { error: insertError } = await supabase
      .from('feedback')
      .insert({
        user_id: userId,
        type,
        title: title.trim(),
        message: message.trim(),
        email: email.trim() || null,
      });

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
    setSubmitting(false);
  }

  if (submitted) {
    return (
      <div className="container-page py-20">
        <div className="max-w-lg mx-auto text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
            Thank You!
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            Your feedback has been submitted. We review every piece of feedback
            and use it to make PromptHub better.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/prompts" className="btn-primary">
              Browse Prompts
            </Link>
            <Link href="/" className="btn-secondary">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-brand-600 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to home
      </Link>

      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Share Your Feedback
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8">
          We&apos;d love to hear from you. Tell us what&apos;s working, what&apos;s broken,
          or what you&apos;d like to see next.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* 反馈类型选择 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              What type of feedback?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {FEEDBACK_TYPES.map((ft) => (
                <button
                  key={ft.value}
                  type="button"
                  onClick={() => setType(ft.value)}
                  className={`flex items-start gap-2.5 p-3 rounded-lg border-2 text-left transition-all ${
                    type === ft.value
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                      : 'border-slate-200 dark:border-dark-700 hover:border-slate-300 dark:hover:border-dark-600'
                  }`}
                >
                  <ft.icon
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      type === ft.value
                        ? 'text-brand-600 dark:text-brand-400'
                        : 'text-slate-400'
                    }`}
                  />
                  <div>
                    <p
                      className={`text-sm font-medium ${
                        type === ft.value
                          ? 'text-brand-700 dark:text-brand-300'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {ft.label}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      {ft.desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 标题 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Add dark mode toggle to mobile menu"
              className="input"
              required
              maxLength={200}
            />
          </div>

          {/* 详细描述 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Details <span className="text-red-500">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your idea, bug, or request in detail..."
              className="input min-h-[150px]"
              rows={6}
              required
            />
          </div>

          {/* 邮箱（可选） */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Email <span className="text-slate-400 font-normal">(optional — so we can follow up)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input"
            />
          </div>

          {/* 提交 */}
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full py-3 text-base"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Submit Feedback
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
