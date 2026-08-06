'use client';
// ============================================================
// 站主暂停/恢复客户按钮
// PATCH /api/admin/clients/[id] → 刷新
// ============================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CircleStop, PlayCircle } from 'lucide-react';

export default function ClientStatusButton({
  clientId,
  currentStatus,
}: {
  clientId: number;
  currentStatus: string;
  paused?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paused = currentStatus === 'paused';

  async function toggle() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: paused ? 'active' : 'paused' }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to update status.');
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
    <div className="shrink-0">
      <button
        onClick={toggle}
        disabled={loading}
        className={paused ? 'btn-primary text-sm' : 'btn-secondary text-sm'}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : paused ? (
          <>
            <PlayCircle className="w-4 h-4" />
            Resume client
          </>
        ) : (
          <>
            <CircleStop className="w-4 h-4" />
            Pause client
          </>
        )}
      </button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
