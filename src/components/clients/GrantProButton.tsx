'use client';
// ============================================================
// 站主手动授/取消客户 Pro 额度（B2B，免支付）
// 授 Pro 默认 +1 年；PATCH /api/dashboard/clients/[id] → 刷新
// ============================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Crown, XCircle } from 'lucide-react';

export default function GrantProButton({
  clientId,
  tier,
}: {
  clientId: number;
  tier: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPro = tier === 'pro';

  async function toggle() {
    setLoading(true);
    setError(null);
    try {
      const body = isPro
        ? { tier: 'free' }
        : { tier: 'pro', pro_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() };
      const res = await fetch(`/api/dashboard/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to update tier.');
        setLoading(false);
        return;
      }
      router.refresh();
    } catch {
      setError('Network error.');
    }
    setLoading(false);
  }

  return (
    <div>
      <button
        onClick={toggle}
        disabled={loading}
        className={isPro ? 'btn-secondary text-sm' : 'btn-primary text-sm'}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isPro ? (
          <>
            <XCircle className="w-4 h-4" />
            Revoke Pro
          </>
        ) : (
          <>
            <Crown className="w-4 h-4" />
            Grant Pro (1 year)
          </>
        )}
      </button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
