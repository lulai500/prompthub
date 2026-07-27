'use client';
// ============================================================
// 明暗主题切换按钮
// ============================================================

import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

/** 写入主题到 cookie 和 localStorage */
function applyTheme(isDark: boolean) {
  const theme = isDark ? 'dark' : 'light';
  document.cookie = `theme=${theme};path=/;max-age=31536000;SameSite=Lax`;
  try { localStorage.setItem('theme', theme); } catch {}
}

export default function ThemeToggle() {
  // SSR 默认深色，客户端 useEffect 中从 cookie 读取修正
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)theme=([^;]*)/);
    const cookieTheme = match?.[1];
    if (cookieTheme === 'light') {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    } else if (cookieTheme === 'dark' || !cookieTheme) {
      // 默认深色
      document.documentElement.classList.add('dark');
    }
  }, []);

  /** 切换主题：直接操作 DOM class + 写 cookie，避免 router.refresh() 导致水合冲突 */
  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    applyTheme(next);
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

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
