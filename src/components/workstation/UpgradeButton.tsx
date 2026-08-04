'use client';
// ============================================================
// 客户工作站 - 升级到 Pro 按钮
// POST /api/workstation/billing → 跳转 Lemon Squeezy checkout
// ============================================================

import { useState } from 'react';
import { Crown, Loader2 } from 'lucide-react';

export default function UpgradeButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpgrade() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/workstation/billing', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      setError(data.error || 'Upgrade is unavailable right now.');
    } catch {
      setError('Network error. Try again.');
    }
    setLoading(false);
  }

  return (
    <div>
      <button onClick={handleUpgrade} disabled={loading} className="btn-primary text-sm">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
        Upgrade to Pro
      </button>
      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
