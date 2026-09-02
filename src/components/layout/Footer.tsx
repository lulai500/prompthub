// ============================================================
// 全局页脚组件（落地页版）
// ============================================================

import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-950 mt-auto">
      <div className="container-page py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* 品牌 */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">小精霊 (Little Spirit)</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                あなたのスマホに住む、AIの話し相手。
              </p>
            </div>
          </div>

          {/* 链接 */}
          <div className="flex items-center gap-6 text-sm">
            <Link href="/privacy" className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
              プライバシーポリシー
            </Link>
            <Link href="/download" className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
              ダウンロード
            </Link>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-dark-700 text-center text-xs text-slate-400 dark:text-slate-500">
          <p>© 2026 Little Spirit</p>
          <p className="mt-1">表示される返答は AI が生成したものです。</p>
        </div>
      </div>
    </footer>
  );
}
