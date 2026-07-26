'use client';
// ============================================================
// 注册页面
// 支持邮箱 + 密码注册，注册后自动创建 profile
// ============================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, User, Eye, EyeOff, UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import SupabaseMissing from '@/components/ui/SupabaseMissing';

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  if (!supabase) return <SupabaseMissing />;

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /** 处理注册 */
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setError('');

    if (!username.trim() || !email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    // 注册用户，同时传递 username 到 user_metadata
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username.trim(),
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
    } else {
      // 注册成功，跳转到 dashboard
      // 注意：如果开启了邮箱验证，会先显示验证提示
      router.refresh();
      router.push('/dashboard');
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* 页头 */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-brand-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg">PH</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Join PromptHub and start collecting prompts
          </p>
        </div>

        {/* 表单 */}
        <form onSubmit={handleRegister} className="card p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* 用户名 */}
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your display name"
                className="input pl-9"
                required
              />
            </div>
          </div>

          {/* 邮箱 */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Email address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input pl-9"
                required
              />
            </div>
          </div>

          {/* 密码 */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="input pl-9 pr-10"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* 提交 */}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          {/* 跳转登录 */}
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            Already have an account?{' '}
            <Link
              href="/auth/login"
              className="text-brand-600 dark:text-brand-400 font-medium hover:underline"
            >
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
