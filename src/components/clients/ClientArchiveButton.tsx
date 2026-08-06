'use client';
// ============================================================
// 站主归档/恢复客户按钮
// 归档 = 从默认列表隐藏 + 禁止执行（可随时恢复为 active）
// PATCH /api/admin/clients/[id] → 刷新
// ============================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Archive, RotateCcw } from 'lucide-react';

export default function ClientArchiveButton({
  clientId,
  status,
}: {
  clientId: number;
  status: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const archived = status === 'archived';

  async function setStatus(next: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to update status.');
        setLoading(false);
        return;
      }
      setConfirming(false);
      router.refresh();
    } catch {
      setError('Network error.');
    }
    setLoading(false);
  }

  if (archived) {
    return (
      <div className="shrink-0">
        <button onClick={() => setStatus('active')} disabled={loading} className="btn-secondary text-sm">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RotateCcw className="w-4 h-4" /> Restore client</>}
        </button>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>
    );
  }

  return (
    <div className="shrink-0">
      {confirming ? (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Archive this client? Tasks stay, but the client can&apos;t run AI.
          </span>
          <button onClick={() => setStatus('archived')} disabled={loading} className="btn-primary text-sm px-3 py-1.5">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm archive'}
          </button>
          <button onClick={() => setConfirming(false)} className="btn-ghost text-sm px-2 py-1.5">Cancel</button>
        </div>
      ) : (
        <button onClick={() => setConfirming(true)} className="btn-ghost text-sm text-slate-500 dark:text-slate-400">
          <Archive className="w-4 h-4" />
          Archive
        </button>
      )}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
