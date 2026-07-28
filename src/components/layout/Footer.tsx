// ============================================================
// 全局页脚组件（精简版）
// ============================================================

import Link from 'next/link';
import { MessageSquare } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-950 mt-auto">
      <div className="container-page py-8">
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
              href="/feedback"
              className="inline-flex items-center gap-1.5 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Feedback
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
            >
              GitHub
            </a>
          </div>

          {/* 版权 */}
          <p className="text-xs text-slate-400 dark:text-slate-500">
            &copy; {new Date().getFullYear()} PromptHub. All free & open source.
          </p>
        </div>
      </div>
    </footer>
  );
}
