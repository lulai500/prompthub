// ============================================================
// 定价页面：全站内容免费 + 工作站 AI 执行配额
// Free = 全部内容（prompts/skills/workflows）+ 工作站 20 次 AI 执行/月
// Workstation Pro = 工作站 500 次 AI 执行/月 + AI 生成引用完整技能/工作流库
// ============================================================

import { Check, Sparkles, Workflow } from 'lucide-react';
import Link from 'next/link';

const freeFeatures = [
  'All prompts, skills & workflows — full content',
  'Full-text search and category filters',
  'Variable filling & token cost estimates',
  'Unlimited favorites & custom folders',
  'Version history, fork & remix, export any skill',
  'Workstation: 20 AI executions / month',
];

const proFeatures = [
  '500 AI executions / month (25× the free quota)',
  'AI generation references the full skills & workflows library',
  'Projects & delivery history for every task',
  'Pause & resume your account anytime',
  'Priority access to new capabilities',
];

export default function PricingPage() {
  return (
    <div className="container-page py-16">
      {/* 页头 */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium mb-6">
          <Sparkles className="w-4 h-4" />
          Everything free · Workstation AI on quotas
        </div>

        <h1 className="page-title text-slate-900 dark:text-white">
          Free for everyone. AI power on demand.
        </h1>
        <p className="page-subtitle max-w-xl mx-auto">
          Every prompt, skill, and workflow on PromptHub is free forever — no
          paywalls, no membership. The only thing that runs on a quota is the
          Workstation&apos;s AI execution, where we call a real LLM to generate
          your deliverables.
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
                All content, no paywalls
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
          <Link href="/auth/register" className="btn-primary w-full text-center py-3 text-base block">
            Get Started Free
          </Link>
        </div>

        {/* Workstation Pro */}
        <div className="card p-8 border-2 border-brand-400 dark:border-brand-700 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-brand-500 text-white text-xs font-semibold px-4 py-1 rounded-bl-lg">
            Workstation Pro
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
              <Workflow className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Pro</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                More AI execution for your workstation
              </p>
            </div>
          </div>
          <div className="mb-6">
            <span className="text-5xl font-extrabold text-slate-900 dark:text-white">500</span>
            <span className="text-lg text-slate-500 dark:text-slate-400 ml-2">AI runs / month</span>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Upgrade from within your workstation.
            </p>
          </div>
          <ul className="space-y-3 mb-8">
            {proFeatures.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-brand-600 dark:text-brand-400" />
                </div>
                <span className="text-slate-700 dark:text-slate-300">{feature}</span>
              </li>
            ))}
          </ul>
          <Link href="/workstation" className="btn-primary w-full text-center py-3 text-base block">
            Explore the Workstation
          </Link>
        </div>
      </div>

      {/* 底部说明 */}
      <div className="text-center mt-12 max-w-xl mx-auto">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Every prompt, skill, and workflow stays free. Only Workstation AI
          executions are metered — each one calls a real LLM and has a token
          cost. The free quota is 20 executions per month; Pro raises it to 500.
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
