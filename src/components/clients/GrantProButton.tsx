'use client';
// ============================================================
// 站主手动授/取消客户 Pro 额度（B2B，免支付）
// 授 Pro 可选时长：1 个月 / 6 个月 / 1 年 / 自定义日期
// PATCH /api/admin/clients/[id] → 刷新
// ============================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Crown, XCircle } from 'lucide-react';

const DAY = 86400000;
const DURATIONS = [
  { label: '1 month', ms: 30 * DAY },
  { label: '6 months', ms: 180 * DAY },
  { label: '1 year', ms: 365 * DAY },
  { label: 'Custom…', ms: null },
] as const;

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
  const [duration, setDuration] = useState<number | null>(365 * DAY);
  const [customDate, setCustomDate] = useState('');

  const isPro = tier === 'pro';

  async function setTier(body: Record<string, unknown>) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to update tier.');
        return;
      }
      router.refresh();
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  }

  function grant() {
    let expires: string;
    if (duration === null) {
      if (!customDate) {
        setError('Pick an end date.');
        return;
      }
      expires = new Date(customDate + 'T23:59:59Z').toISOString();
    } else {
      expires = new Date(Date.now() + duration).toISOString();
    }
    setTier({ tier: 'pro', pro_expires_at: expires });
  }

  return (
    <div>
      {isPro ? (
        <button onClick={() => setTier({ tier: 'free' })} disabled={loading} className="btn-secondary text-sm">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className="w-4 h-4" /> Revoke Pro</>}
        </button>
      ) : (
        <div className="flex items-center gap-1.5 flex-wrap">
          <select
            value={duration === null ? 'custom' : String(duration)}
            onChange={(e) => setDuration(e.target.value === 'custom' ? null : Number(e.target.value))}
            className="input text-sm py-1.5 w-28"
          >
            {DURATIONS.map((d) => (
              <option key={d.label} value={d.ms === null ? 'custom' : String(d.ms)}>
                {d.label}
              </option>
            ))}
          </select>
          <button onClick={grant} disabled={loading} className="btn-primary text-sm">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Crown className="w-4 h-4" /> Grant Pro</>}
          </button>
        </div>
      )}
      {!isPro && duration === null && (
        <input
          type="date"
          value={customDate}
          onChange={(e) => setCustomDate(e.target.value)}
          className="input text-sm py-1.5 mt-1.5"
        />
      )}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
