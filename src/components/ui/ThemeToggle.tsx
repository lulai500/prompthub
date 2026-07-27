'use client';
// ============================================================
// 明暗主题切换按钮
// 通过 cookie 传递主题偏好给服务端，确保 SSR 水合一致
// ============================================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Moon, Sun } from 'lucide-react';

/** 从 cookie 读取当前主题（不依赖 document.documentElement） */
function getInitialTheme(): boolean {
  if (typeof document === 'undefined') return true; // SSR fallback
  const match = document.cookie.match(/(?:^|;\s*)theme=([^;]*)/);
  // cookie 值为 "light" → 浅色模式 → isDark = false
  return match?.[1] !== 'light';
}

/** 写入主题到 cookie 和 localStorage，然后刷新页面让服务端接管 */
function applyTheme(isDark: boolean) {
  // 设置 cookie（SameSite=Lax，path=/）
  const theme = isDark ? 'dark' : 'light';
  document.cookie = `theme=${theme};path=/;max-age=31536000;SameSite=Lax`;
  // 同步 localStorage（给内联脚本用）
  try {
    localStorage.setItem('theme', theme);
  } catch {}
}

export default function ThemeToggle() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(true); // SSR 默认，客户端 mount 后修正
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setIsDark(getInitialTheme());
    setMounted(true);
  }, []);

  /** 切换主题 */
  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    applyTheme(next);
    // 刷新路由让服务端用新 cookie 渲染，彻底消除水合不一致
    router.refresh();
  };

  // 未 mount 时不渲染图标，避免 SSR/CSR 图标不一致
  if (!mounted) {
    return <div className="w-9 h-9" />;
  }

  return (
    <button
      onClick={toggleTheme}
      className="btn-ghost p-2 rounded-lg"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-yellow-400" />
      ) : (
        <Moon className="w-5 h-5 text-slate-600" />
      )}
    </button>
  );
}
