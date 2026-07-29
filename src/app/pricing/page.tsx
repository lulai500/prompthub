// ============================================================
// 定价页面（简化版）
// 核心定位：全部免费，未来可选的增值功能预告
// ============================================================

import { Check, Sparkles, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const freeFeatures = [
  'Browse all prompts across every category',
  'Full-text search and category filters',
  'Unlimited favorites & custom folders',
  'One-click copy with usage tracking',
  'Dark mode support',
  'Save and organize your collections',
];

const upcomingFeatures = [
  'Advanced AI-powered semantic search',
  'Custom prompt collections & team sharing',
  'Priority support & early access to new prompts',
  'Pro badge on your profile',
];

export default function PricingPage() {
  return (
    <div className="container-page py-16">
      {/* 页头 */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium mb-6">
          <Sparkles className="w-4 h-4" />
          100% Free — No Credit Card Required
        </div>

        <h1 className="page-title text-slate-900 dark:text-white">
          Free, Now and Always
        </h1>
        <p className="page-subtitle max-w-xl mx-auto">
          PromptHub&apos;s core features are and will always be free.
          We believe great AI prompts should be accessible to everyone,
          without paywalls or hidden costs.
        </p>
      </div>

      {/* Free 计划详情 */}
      <div className="max-w-2xl mx-auto mb-12">
        <div className="card p-8 ring-2 ring-brand-500 dark:ring-brand-400 shadow-lg relative overflow-hidden">
          {/* 装饰角标 */}
          <div className="absolute top-0 right-0 bg-brand-600 text-white text-xs font-semibold px-4 py-1 rounded-bl-lg">
            Free Forever
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Free Plan</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Everything you need to discover and manage prompts
              </p>
            </div>
          </div>

          <div className="mb-6">
            <span className="text-5xl font-extrabold text-slate-900 dark:text-white">$0</span>
            <span className="text-lg text-slate-500 dark:text-slate-400 ml-2">forever</span>
          </div>

          <ul className="space-y-3 mb-8">
            {freeFeatures.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-slate-700 dark:text-slate-300">{feature}</span>
              </li>
            ))}
          </ul>

          <Link
            href="/auth/register"
            className="btn-primary w-full text-center py-3 text-base"
          >
            Get Started Free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* 未来计划预告（轻量） */}
      <div className="max-w-2xl mx-auto">
        <div className="card p-6 border-dashed border-2 border-slate-300 dark:border-dark-600 bg-slate-50/50 dark:bg-dark-900/30">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-slate-900 dark:text-white">
              Premium Features — Coming in the Future
            </h3>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            We&apos;re exploring optional premium features for power users and teams.
            Everything you see today will <strong>remain free</strong>. Premium will
            be additive, never gatekeeping existing functionality.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {upcomingFeatures.map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-brand-400 shrink-0" />
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 底部说明 */}
      <div className="text-center mt-12">
        <p className="text-sm text-slate-400 dark:text-slate-500">
          Have questions?{' '}
          <a
            href="mailto:hello@prompthub.app"
            className="text-brand-600 dark:text-brand-400 hover:underline"
          >
            Contact us
          </a>
          {' '}— we&apos;d love to hear from you.
        </p>
      </div>
    </div>
  );
}
