'use client';
// ============================================================
// 首次访问 3 步引导条（未登录新访客，localStorage 持久关闭）
// 防止 SSR 水合不一致：首帧渲染 null，useEffect 中再决定是否显示
// ============================================================

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Search, Heart, Wrench } from 'lucide-react';

const LS_KEY = 'ph_onboarding_done';

export default function FirstVisitOnboarding({ show }: { show: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!show) return;
    try {
      if (localStorage.getItem(LS_KEY)) return; // 已引导过
      setVisible(true);
    } catch {
      /* 隐私模式等，忽略 */
    }
  }, [show]);

  const dismiss = () => {
    try {
      localStorage.setItem(LS_KEY, '1');
    } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="container-page">
      <div className="card p-5 mb-4 relative bg-gradient-to-r from-brand-50 to-cyan-50 dark:from-brand-950/20 dark:to-cyan-950/10 border-brand-200 dark:border-brand-800">
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute top-3 right-3 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-dark-700"
        >
          <X className="w-4 h-4" />
        </button>
        <h3 className="font-semibold text-slate-900 dark:text-white mb-3">
          Welcome to PromptHub — 3 steps to get started
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          {/* 步骤 1：浏览测试过的提示词 */}
          <Link
            href="/prompts"
            className="flex items-start gap-2 p-2 rounded-lg hover:bg-white/60 dark:hover:bg-dark-800/60 transition-colors"
          >
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold shrink-0">
              1
            </span>
            <span>
              <Search className="w-3.5 h-3.5 inline text-brand-500 mr-1" />
              Browse tested prompts
              <br />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Free forever, verified by the community
              </span>
            </span>
          </Link>
          {/* 步骤 2：收藏并整理 */}
          <Link
            href="/auth/register"
            className="flex items-start gap-2 p-2 rounded-lg hover:bg-white/60 dark:hover:bg-dark-800/60 transition-colors"
          >
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold shrink-0">
              2
            </span>
            <span>
              <Heart className="w-3.5 h-3.5 inline text-red-400 mr-1" />
              Favorite &amp; organize
              <br />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Save prompts into collections
              </span>
            </span>
          </Link>
          {/* 步骤 3：安装技能/工作流 */}
          <Link
            href="/skills"
            className="flex items-start gap-2 p-2 rounded-lg hover:bg-white/60 dark:hover:bg-dark-800/60 transition-colors"
          >
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold shrink-0">
              3
            </span>
            <span>
              <Wrench className="w-3.5 h-3.5 inline text-amber-500 mr-1" />
              Install skills &amp; workflows
              <br />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Every skill and workflow is free
              </span>
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
