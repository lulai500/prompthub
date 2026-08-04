'use client';
// ============================================================
// 客户首次登录改密面板
// 临时密码 → 新密码（auth.updateUser）+ 清除 must_change_password
// ============================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, KeyRound, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function FirstRunPassword() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.updateUser({ password });
      if (authErr) {
        setError(authErr.message);
        setLoading(false);
        return;
      }
      if (!user) {
        setError('Not signed in. Please log in again.');
        setLoading(false);
        return;
      }
      // 清除首改密标记（现有 RLS 放行用户改自己的 profile）
      await supabase.from('profiles').update({ must_change_password: false }).eq('id', user.id);
      router.refresh();
    } catch {
      setError('Something went wrong. Try again.');
    }
    setLoading(false);
  }

  return (
    <div className="card p-8">
      <div className="flex items-center gap-2 mb-2">
        <KeyRound className="w-5 h-5 text-brand-600 dark:text-brand-400" />
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Set your password
        </h1>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        You&apos;re logging in with a temporary password. Choose a new one to access your workstation.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            New password
          </label>
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input pr-10"
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              aria-label="Toggle password visibility"
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Confirm password
          </label>
          <input
            type={show ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="input"
            autoComplete="new-password"
            required
          />
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save password'}
        </button>
      </form>
    </div>
  );
}
