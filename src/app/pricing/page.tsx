// ============================================================
// 定价页面：Free vs Membership 两档
// Free = Prompts 全免费 + Skills/Workflows 部分预览
// Membership = 完整 Skills/Workflows + 导出/安装/历史
// （付费暂未开启，Membership 卡为预告状态）
// ============================================================

import { Check, Sparkles, Lock } from 'lucide-react';
import PricingCheckout from '@/components/pricing/PricingCheckout';

const freeFeatures = [
  'All prompts across every category — free forever',
  'Full-text search and category filters',
  'Variable filling & token cost estimates',
  'Unlimited favorites & custom folders',
  'One-click copy with usage tracking',
  'Skills & workflows: preview + full Prompts',
];

const memberFeatures = [
  'Full access to all 132 tested skills',
  'Full access to all 58 workflows',
  'Install & export skills (Claude Skill, Cursor, Codex)',
  'Skill & workflow version history',
  'Fork & remix any asset',
  'Priority support & early access',
];

export default function PricingPage() {
  return (
    <div className="container-page py-16">
      {/* 页头 */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium mb-6">
          <Sparkles className="w-4 h-4" />
          Prompts Free · Skills &amp; Workflows for Members
        </div>

        <h1 className="page-title text-slate-900 dark:text-white">
          Free Prompts. Membership for the Full Stack.
        </h1>
        <p className="page-subtitle max-w-xl mx-auto">
          Every prompt is free, forever. Membership unlocks the complete skills and
          workflows library — install, export, and run the full solution.
        </p>
      </div>

      {/* 两档计划 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* Free */}
        <div className="card p-8 ring-2 ring-brand-500 dark:ring-brand-400 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-brand-600 text-white text-xs font-semibold px-4 py-1 rounded-bl-lg">
            Free Forever
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Free</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Everything you need for prompts
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
          <a href="/auth/register" className="btn-primary w-full text-center py-3 text-base block">
            Get Started Free
          </a>
        </div>

        {/* Membership */}
        <div className="card p-8 border-2 border-amber-400 dark:border-amber-600 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-amber-500 text-white text-xs font-semibold px-4 py-1 rounded-bl-lg">
            Members Only
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Membership</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Unlock the full skills &amp; workflows library
              </p>
            </div>
          </div>
          <div className="mb-6">
            <span className="text-5xl font-extrabold text-slate-900 dark:text-white">$9.99</span>
            <span className="text-lg text-slate-500 dark:text-slate-400 ml-2">/month</span>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Choose a plan to unlock the full library.
            </p>
          </div>
          <ul className="space-y-3 mb-8">
            {memberFeatures.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                </div>
                <span className="text-slate-700 dark:text-slate-300">{feature}</span>
              </li>
            ))}
          </ul>
          <PricingCheckout />
        </div>
      </div>

      {/* 底部说明 */}
      <div className="text-center mt-12 max-w-xl mx-auto">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Prompts will always remain free. Membership is additive — it unlocks skills
          and workflows, and never gates anything that is already free today.
        </p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-4">
          Have questions?{' '}
          <a
            href="mailto:hello@prompthub.app"
            className="text-brand-600 dark:text-brand-400 hover:underline"
          >
            Contact us
          </a>
        </p>
      </div>
    </div>
  );
}
