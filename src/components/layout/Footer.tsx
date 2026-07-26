// ============================================================
// 全局页脚组件
// ============================================================

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-950 mt-auto">
      <div className="container-page py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* 品牌信息 */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">PH</span>
              </div>
              <span className="font-bold text-lg text-slate-900 dark:text-white">
                PromptHub
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
              Discover, share, and collect the best AI prompts.
              A community-driven platform for prompt engineers, developers,
              and AI enthusiasts.
            </p>
          </div>

          {/* 导航链接 */}
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
              Navigation
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-sm text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/prompts" className="text-sm text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                  Explore
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-sm text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-sm text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                  About
                </Link>
              </li>
            </ul>
          </div>

          {/* 分类 */}
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
              Categories
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/prompts?category=code-prompt" className="text-sm text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                  Code Prompt
                </Link>
              </li>
              <li>
                <Link href="/prompts?category=novel-writing" className="text-sm text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                  Novel Writing
                </Link>
              </li>
              <li>
                <Link href="/prompts?category=agent-llm" className="text-sm text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                  Agent LLM
                </Link>
              </li>
              <li>
                <Link href="/prompts?category=general-prompt" className="text-sm text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                  General Prompt
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* 底部版权 */}
        <div className="mt-10 pt-6 border-t border-slate-200 dark:border-dark-700">
          <p className="text-center text-sm text-slate-400 dark:text-slate-500">
            &copy; {new Date().getFullYear()} PromptHub. All prompts are free to use.
            Built with Next.js &amp; Supabase.
          </p>
        </div>
      </div>
    </footer>
  );
}
