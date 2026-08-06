'use client';
// ============================================================
// 站主重置客户密码按钮
// 二次确认 → POST /api/admin/clients/[id]/password → 一次性显示临时密码
// 客户下次登录强制改密（复用 FirstRunPassword 流程）
// ============================================================

import { useState } from 'react';
import { KeyRound, Loader2, Copy, Check, AlertTriangle } from 'lucide-react';
import { copyToClipboard } from '@/lib/utils';

export default function ResetPasswordButton({ clientId }: { clientId: number }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creds, setCreds] = useState<{ tempPassword: string; email: string | null } | null>(null);
  const [copied, setCopied] = useState(false);

  async function reset() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/password`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to reset password.');
        return;
      }
      setCreds(data);
      setConfirming(false);
    } catch {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (creds && (await copyToClipboard(creds.tempPassword))) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  // 已生成临时密码 → 一次性卡片
  if (creds) {
    return (
      <div className="shrink-0">
        <div className="border border-amber-300/60 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-300 flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-3.5 h-3.5" />
            New temporary password — shows once
          </p>
          <p className="font-mono text-sm bg-white dark:bg-dark-950/60 border border-slate-200 dark:border-slate-700/60 rounded-md p-2 text-slate-900 dark:text-white">
            {creds.tempPassword}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <button onClick={handleCopy} className="btn-secondary text-xs px-2 py-1">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80">
              Client changes it on next login.
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shrink-0">
      {confirming ? (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-amber-600 dark:text-amber-400">
            Reset password? The client must change it on next login.
          </span>
          <button onClick={reset} disabled={loading} className="btn-primary text-sm px-3 py-1.5">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm reset'}
          </button>
          <button onClick={() => setConfirming(false)} className="btn-ghost text-sm px-2 py-1.5">
            Cancel
          </button>
        </div>
      ) : (
        <button onClick={() => setConfirming(true)} className="btn-secondary text-sm">
          <KeyRound className="w-4 h-4" />
          Reset password
        </button>
      )}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
