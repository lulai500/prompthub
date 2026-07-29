'use client';
// ============================================================
// 全局页头组件
// 包含：Logo、导航菜单、搜索入口、主题切换、用户菜单
// ============================================================

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  Search,
  Menu,
  X,
  User,
  LogOut,
  Heart,
  Settings,
  LogIn,
  UserPlus,
  MessageSquare,
} from 'lucide-react';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types';

export default function Header() {
  const router = useRouter();
  const supabase = createClient();

  // 用户状态
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  // 移动端菜单
  const [mobileOpen, setMobileOpen] = useState(false);
  // 用户下拉菜单
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  // 搜索关键词
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // 获取当前登录用户
    checkUser();
    // 监听认证状态变化
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          fetchProfile(session.user.id);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  /** 检查用户登录状态 */
  async function checkUser() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      await fetchProfile(session.user.id);
    } else {
      setLoading(false);
    }
  }

  /** 获取用户 profile */
  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setUser(data);
    setLoading(false);
  }

  /** 退出登录 */
  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    setUserMenuOpen(false);
    router.refresh();
    router.push('/');
  }

  /** 搜索提交 */
  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/prompts?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-dark-900/80 backdrop-blur-md border-b border-slate-200 dark:border-dark-700">
      <div className="container-page">
        <div className="flex items-center justify-between h-16">
          {/* ---- 左侧：Logo + 导航 ---- */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">PH</span>
              </div>
              <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">
                PromptHub
              </span>
            </Link>

            {/* 桌面端导航 */}
            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/"
                className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-700 transition-colors"
              >
                Home
              </Link>
              <Link
                href="/prompts"
                className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-700 transition-colors"
              >
                Explore
              </Link>
              <Link
                href="/pricing"
                className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-700 transition-colors"
              >
                Pricing
              </Link>
              <Link
                href="/about"
                className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-700 transition-colors"
              >
                About
              </Link>
              <Link
                href="/feedback"
                className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-700 transition-colors"
              >
                Feedback
              </Link>
              {user && (
                <Link
                  href="/submit"
                  className="px-3 py-2 rounded-lg text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors"
                >
                  + Submit
                </Link>
              )}
            </nav>
          </div>

          {/* ---- 右侧：搜索 + 主题切换 + 用户菜单 ---- */}
          <div className="flex items-center gap-2">
            {/* 搜索框（桌面端） */}
            <form
              onSubmit={handleSearch}
              className="hidden sm:flex items-center relative"
            >
              <Search className="absolute left-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search prompts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 lg:w-64 pl-9 pr-3 py-2 rounded-lg text-sm
                           bg-slate-100 dark:bg-dark-800
                           border border-transparent
                           text-slate-900 dark:text-slate-100
                           placeholder:text-slate-400
                           focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white dark:focus:bg-dark-700
                           transition-all duration-200"
              />
            </form>

            <ThemeToggle />

            {/* ---- 用户菜单 ---- */}
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-dark-700 animate-pulse" />
            ) : user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-dark-700 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-sm font-medium">
                    {(user.username || 'U')[0].toUpperCase()}
                  </div>
                </button>

                {/* 下拉菜单 */}
                {userMenuOpen && (
                  <>
                    {/* 点击遮罩关闭 */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl shadow-xl z-20 animate-fade-in">
                      <div className="px-4 py-3 border-b border-slate-200 dark:border-dark-700">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {user.username || 'User'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {user.membership_tier === 'free'
                            ? 'Free Plan'
                            : 'Pro Member'}
                        </p>
                      </div>
                      <div className="p-1.5">
                        <Link
                          href="/dashboard"
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-700 transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <User className="w-4 h-4" />
                          Dashboard
                        </Link>
                        <Link
                          href="/dashboard/favorites"
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-700 transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Heart className="w-4 h-4" />
                          My Favorites
                        </Link>
                        <Link
                          href="/dashboard/settings"
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-700 transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Settings className="w-4 h-4" />
                          Settings
                        </Link>
                        <hr className="my-1.5 border-slate-200 dark:border-dark-700" />
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link href="/auth/login" className="btn-ghost text-sm">
                  <LogIn className="w-4 h-4" />
                  Sign In
                </Link>
                <Link href="/auth/register" className="btn-primary text-sm">
                  <UserPlus className="w-4 h-4" />
                  Sign Up
                </Link>
              </div>
            )}

            {/* 移动端菜单按钮 */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden btn-ghost p-2"
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* 移动端菜单 */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-dark-700 py-3 animate-fade-in">
            <nav className="flex flex-col gap-1">
              <Link
                href="/"
                className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-700"
                onClick={() => setMobileOpen(false)}
              >
                Home
              </Link>
              <Link
                href="/prompts"
                className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-700"
                onClick={() => setMobileOpen(false)}
              >
                Explore Prompts
              </Link>
              <Link
                href="/pricing"
                className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-700"
                onClick={() => setMobileOpen(false)}
              >
                Pricing
              </Link>
              <Link
                href="/about"
                className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-700"
                onClick={() => setMobileOpen(false)}
              >
                About
              </Link>
              <Link
                href="/feedback"
                className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-700"
                onClick={() => setMobileOpen(false)}
              >
                Feedback
              </Link>
              {/* 移动端搜索 */}
              <form onSubmit={handleSearch} className="px-4 py-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search prompts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input pl-9"
                  />
                </div>
              </form>
              {!user && (
                <div className="flex flex-col gap-2 px-4 pt-2">
                  <Link
                    href="/auth/login"
                    className="btn-secondary text-sm"
                    onClick={() => setMobileOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/register"
                    className="btn-primary text-sm"
                    onClick={() => setMobileOpen(false)}
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
