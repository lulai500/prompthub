// ============================================================
// 全局页脚组件（精简版）
// ============================================================

import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import NewsletterForm from '@/components/newsletter/NewsletterForm';

// 开源仓库链接（可通过环境变量配置）
const githubUrl = process.env.NEXT_PUBLIC_GITHUB_URL || 'https://github.com/lulai500/prompthub';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-950 mt-auto">
      <div className="container-page py-8">
        {/* ---- Newsletter 订阅区 ---- */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-8 mb-8 border-b border-slate-200 dark:border-dark-700">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">
              Get the weekly pick
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              3 tested prompts &amp; skills every Monday. Free, unsubscribe anytime.
            </p>
          </div>
          <NewsletterForm source="footer" compact />
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* 品牌 */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">PH</span>
            </div>
            <span className="font-bold text-slate-900 dark:text-white">
              PromptHub
            </span>
          </div>

          {/* 精简链接 */}
          <div className="flex items-center gap-6 text-sm text-slate-500 dark:text-slate-400">
            <Link
              href="/prompts"
              className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
            >
              Explore
            </Link>
            <Link
              href="/about"
              className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
            >
              About
            </Link>
            <Link
              href="/learn/anti-patterns"
              className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
            >
              Learn
            </Link>
            <Link
              href="/support"
              className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
            >
              Support
            </Link>
            <Link
              href="/docs/api"
              className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
            >
              API
            </Link>
            <Link
              href="/feedback"
              className="inline-flex items-center gap-1.5 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Feedback
            </Link>
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
            >
              GitHub
            </a>
          </div>

          {/* 版权 */}
          <p className="text-xs text-slate-400 dark:text-slate-500">
            &copy; {new Date().getFullYear()} PromptHub. Open source. Everything free —
            prompts, skills &amp; workflows.
          </p>
        </div>
      </div>
    </footer>
  );
}
