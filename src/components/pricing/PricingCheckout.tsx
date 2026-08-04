'use client';
// ============================================================
// 网站会员订阅购买（Lemon Squeezy）
// 周期切换（Monthly/Quarterly/Yearly）→ 登录检查 → checkout 跳转
// ============================================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Crown, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PRICING_PLANS } from '@/lib/utils';

const VARIANTS = [
  { key: 'monthly' as const, label: 'Monthly', price: PRICING_PLANS.monthly.price, suffix: '/mo' },
  { key: 'quarterly' as const, label: 'Quarterly', price: PRICING_PLANS.quarterly.price, suffix: '/3mo' },
  { key: 'yearly' as const, label: 'Yearly', price: PRICING_PLANS.yearly.price, suffix: '/yr' },
];

export default function PricingCheckout() {
  const router = useRouter();
  const supabase = createClient();
  const [variant, setVariant] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
  }, []);

  async function subscribe() {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/pricing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variant }),
      });
      const data = await res.json();
      if (res.ok && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      setError(data.error || 'Checkout is unavailable right now.');
    } catch {
      setError('Network error. Try again.');
    }
    setLoading(false);
  }

  return (
    <div>
      {/* 周期切换 */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {VARIANTS.map((v) => (
          <button
            key={v.key}
            onClick={() => setVariant(v.key)}
            className={`rounded-lg px-2 py-2 text-center border transition-colors ${
              variant === v.key
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 font-medium'
                : 'border-slate-200 dark:border-dark-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
            }`}
          >
            <span className="block text-sm font-semibold">{v.label}</span>
            <span className="block text-xs mt-0.5">
              ${v.price}
              <span className="text-slate-400">{v.suffix}</span>
            </span>
          </button>
        ))}
      </div>

      <button
        onClick={subscribe}
        disabled={loading}
        className="btn-primary w-full text-center py-3 text-base block"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin inline" />
        ) : (
          <>
            <Crown className="w-5 h-5 inline mr-1" />
            {user ? 'Subscribe to Membership' : 'Sign in to subscribe'}
          </>
        )}
      </button>
      {error && <p className="text-center text-sm text-red-600 dark:text-red-400 mt-3">{error}</p>}
    </div>
  );
}
