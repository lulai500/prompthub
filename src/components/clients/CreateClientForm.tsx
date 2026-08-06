'use client';
// ============================================================
// 站主创建客户表单
// 提交后展示一次性临时密码卡（站主转交客户）
// ============================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, UserPlus, Copy, Check, KeyRound } from 'lucide-react';
import { copyToClipboard } from '@/lib/utils';

interface TempCreds {
  clientId: number;
  email: string;
  tempPassword: string;
}

export default function CreateClientForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creds, setCreds] = useState<TempCreds | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCopied(false);
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create client.');
        setLoading(false);
        return;
      }
      setCreds({ clientId: data.clientId, email: data.email, tempPassword: data.tempPassword });
      setName('');
      setEmail('');
      router.refresh();
    } catch {
      setError('Network error. Try again.');
    }
    setLoading(false);
  }

  async function handleCopy() {
    if (creds && (await copyToClipboard(`${creds.email}\n${creds.tempPassword}`))) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="card p-6">
      <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
        <UserPlus className="w-4 h-4 text-brand-600 dark:text-brand-400" />
        Create client account
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-4">
        A login account is created with a temporary password. The client must change it on first login.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Client name (e.g. Acme Studio)"
          className="input flex-1"
          required
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="client@email.com"
          className="input flex-1"
          required
        />
        <button type="submit" disabled={loading} className="btn-primary shrink-0">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
        </button>
      </form>

      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* 一次性临时密码 */}
      {creds && (
        <div className="mt-5 border border-brand-300/50 dark:border-brand-700/50 bg-brand-50 dark:bg-brand-950/30 rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white mb-3">
            <KeyRound className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            Client created — share these credentials once
          </div>
          <div className="space-y-1.5 font-mono text-sm bg-white dark:bg-dark-950/60 border border-slate-200 dark:border-slate-700/60 rounded-md p-3">
            <p className="text-slate-600 dark:text-slate-300">
              login: <span className="text-slate-900 dark:text-white">{creds.email}</span>
            </p>
            <p className="text-slate-600 dark:text-slate-300">
              password: <span className="text-slate-900 dark:text-white">{creds.tempPassword}</span>
            </p>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button onClick={handleCopy} className="btn-secondary text-sm">
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy credentials'}
            </button>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              The password shows only once.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
