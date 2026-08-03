// ============================================================
// 支持页：打赏位 + AI 工具推荐（联盟链接位）
// 低成本验证付费意愿；链接由环境变量/占位控制
// ============================================================

import Link from 'next/link';
import type { Metadata } from 'next';
import { Heart, Coffee, Github, Sparkles } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Support PromptHub',
  description:
    'PromptHub is free and open-source. Support it with a donation, or through our AI tool recommendations.',
};

// 打赏链接（换成你的真实链接）
const SPONSOR_URL = process.env.NEXT_PUBLIC_GITHUB_URL || 'https://github.com/sponsors/your-org';
const COFFEE_URL = process.env.NEXT_PUBLIC_COFFEE_URL || 'https://www.buymeacoffee.com/your-name';

// 联盟推荐位（换成带你的 affiliate 参数的链接）
const RECOMMENDED_TOOLS = [
  { name: 'Claude', desc: 'Our favorite model for tested prompts.', url: 'https://claude.ai' },
  { name: 'Supabase', desc: 'The open-source backend powering PromptHub.', url: 'https://supabase.com' },
  { name: 'Vercel', desc: 'Deploys this site on the free tier.', url: 'https://vercel.com' },
];

export default function SupportPage() {
  return (
    <div className="container-page py-10 max-w-3xl">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 text-sm font-medium mb-4">
          <Heart className="w-4 h-4" />
          Support
        </div>
        <h1 className="page-title">Keep PromptHub Free</h1>
        <p className="page-subtitle">
          Every prompt, skill, and workflow here is free. Your support covers hosting,
          testing, and the time we spend curating. Thank you.
        </p>
      </div>

      {/* 打赏 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        <a
          href={SPONSOR_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="card p-6 text-center hover:border-brand-300 dark:hover:border-brand-700 transition-all"
        >
          <Github className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <h2 className="font-semibold text-slate-900 dark:text-white mb-1">GitHub Sponsor</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Recurring support that keeps the project sustainable.
          </p>
        </a>
        <a
          href={COFFEE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="card p-6 text-center hover:border-brand-300 dark:hover:border-brand-700 transition-all"
        >
          <Coffee className="w-8 h-8 text-amber-500 mx-auto mb-3" />
          <h2 className="font-semibold text-slate-900 dark:text-white mb-1">Buy Me a Coffee</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            One-time donation — fuel the next batch of tested prompts.
          </p>
        </a>
      </div>

      {/* 联盟推荐 */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-brand-500" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Tools We Use &amp; Recommend
          </h2>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Buying through these links helps support PromptHub at no extra cost to you.
        </p>
        <div className="space-y-2">
          {RECOMMENDED_TOOLS.map((tool) => (
            <a
              key={tool.name}
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-dark-700 hover:border-brand-300 dark:hover:border-brand-700 transition-all group"
            >
              <div>
                <p className="font-medium text-sm text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400">
                  {tool.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{tool.desc}</p>
              </div>
              <span className="text-xs text-brand-600 dark:text-brand-400">Visit →</span>
            </a>
          ))}
        </div>
      </div>

      <p className="text-center text-sm text-slate-400 dark:text-slate-500 mt-8">
        Prefer to contribute content instead?{' '}
        <Link href="/submit" className="text-brand-600 dark:text-brand-400 hover:underline">
          Share a prompt, skill, or workflow
        </Link>
        .
      </p>
    </div>
  );
}
