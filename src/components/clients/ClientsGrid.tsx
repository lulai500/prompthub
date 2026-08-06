'use client';
// ============================================================
// 站主后台 - 客户网格
// 搜索(名称/email) + 状态/档位筛选 + 分页 + 勾选批量操作(pause/resume/授Pro)
// 卡片显示 email、档位徽章 + Pro 到期日、暂停/归档标记、任务统计
// ============================================================

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Building2, ArrowRight, CircleStop, PlayCircle, Crown, XCircle, Square, CheckSquare } from 'lucide-react';
import type { Client, ClientTask } from '@/types';
import { formatDate } from '@/lib/utils';
import { effectiveTier } from '@/lib/client-quota';

const PAGE_SIZE = 20;

interface ClientsGridProps {
  clients: Client[];
  tasks: Pick<ClientTask, 'client_id' | 'status' | 'tokens'>[];
}

export default function ClientsGrid({ clients, tasks }: ClientsGridProps) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'archived'>('all');
  const [tierFilter, setTierFilter] = useState<'all' | 'free' | 'pro'>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 每客户任务统计（tasks 已全量加载，客户端聚合）
  const statsByClient = useMemo(() => {
    const m: Record<number, { total: number; completed: number; tokens: number }> = {};
    for (const t of tasks) {
      const s = (m[t.client_id] ??= { total: 0, completed: 0, tokens: 0 });
      s.total++;
      if (t.status === 'completed') s.completed++;
      if (t.tokens) s.tokens += t.tokens;
    }
    return m;
  }, [tasks]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return clients.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (tierFilter !== 'all' && effectiveTier(c.tier, c.pro_expires_at) !== tierFilter) return false;
      if (query) {
        const name = (c.name || '').toLowerCase();
        const email = (c.email || '').toLowerCase();
        if (!name.includes(query) && !email.includes(query)) return false;
      }
      return true;
    });
  }, [clients, q, statusFilter, tierFilter]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visible.length < filtered.length;

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function batch(action: 'pause' | 'resume' | 'grant_pro' | 'revoke_pro') {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/clients/batch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected), action }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Batch operation failed.'); return; }
      setSelected(new Set());
      router.refresh();
    } catch {
      setError('Network error.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {/* 筛选条 */}
      <div className="flex flex-col md:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => { setQ(e.target.value); setVisibleCount(PAGE_SIZE); }}
            placeholder="Search by name or email…"
            className="input pl-9 py-2 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); setVisibleCount(PAGE_SIZE); }}
          className="input md:w-40 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="archived">Archived</option>
        </select>
        <select
          value={tierFilter}
          onChange={(e) => { setTierFilter(e.target.value as typeof tierFilter); setVisibleCount(PAGE_SIZE); }}
          className="input md:w-40 py-2 text-sm"
        >
          <option value="all">All tiers</option>
          <option value="pro">Pro</option>
          <option value="free">Free</option>
        </select>
      </div>

      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

      {/* 批量操作工具栏 */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 mb-3 bg-brand-50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-800 rounded-lg p-2.5 flex-wrap">
          <span className="text-sm font-medium text-brand-700 dark:text-brand-300">
            {selected.size} selected
          </span>
          <button onClick={() => batch('pause')} disabled={busy} className="btn-secondary text-xs px-2.5 py-1.5">
            <CircleStop className="w-3.5 h-3.5" /> Pause
          </button>
          <button onClick={() => batch('resume')} disabled={busy} className="btn-secondary text-xs px-2.5 py-1.5">
            <PlayCircle className="w-3.5 h-3.5" /> Resume
          </button>
          <button onClick={() => batch('grant_pro')} disabled={busy} className="btn-primary text-xs px-2.5 py-1.5">
            <Crown className="w-3.5 h-3.5" /> Grant Pro
          </button>
          <button onClick={() => batch('revoke_pro')} disabled={busy} className="btn-secondary text-xs px-2.5 py-1.5">
            <XCircle className="w-3.5 h-3.5" /> Revoke Pro
          </button>
          <button onClick={() => setSelected(new Set())} className="btn-ghost text-xs px-2 py-1.5">
            Clear
          </button>
        </div>
      )}

      {/* 匹配数 */}
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
        {filtered.length} of {clients.length} clients
      </p>

      {visible.length === 0 ? (
        <div className="card p-12 text-center text-slate-400 dark:text-slate-500">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>{clients.length === 0 ? 'No clients yet. Create your first client above.' : 'No clients match your filters.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((client) => {
            const s = statsByClient[client.id] || { total: 0, completed: 0, tokens: 0 };
            const isPro = effectiveTier(client.tier, client.pro_expires_at) === 'pro';
            const paused = client.status === 'paused';
            const archived = client.status === 'archived';
            return (
              <Link
                key={client.id}
                href={`/admin/clients/${client.id}`}
                className={`card p-5 group ${archived ? 'opacity-70' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors truncate">
                      {client.name}
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                      {client.email || `Client #${client.id}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isPro ? (
                      <span className="badge-success text-[10px]">
                        <Crown className="w-3 h-3" /> Pro
                      </span>
                    ) : (
                      <span className="badge-default text-[10px]">Free</span>
                    )}
                    {paused ? (
                      <CircleStop className="w-4 h-4 text-amber-500" />
                    ) : archived ? (
                      <Building2 className="w-4 h-4 text-slate-400" />
                    ) : (
                      <PlayCircle className="w-4 h-4 text-emerald-500" />
                    )}
                    <span
                      role="checkbox"
                      aria-checked={selected.has(client.id)}
                      aria-label={`Select ${client.name}`}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSelect(client.id); }}
                      className="cursor-pointer text-slate-400 hover:text-brand-500 transition-colors"
                    >
                      {selected.has(client.id) ? <CheckSquare className="w-4 h-4 text-brand-500" /> : <Square className="w-4 h-4" />}
                    </span>
                  </div>
                </div>

                {isPro && client.pro_expires_at && (
                  <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                    Pro until {formatDate(client.pro_expires_at)}
                  </p>
                )}

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="font-mono text-lg font-medium text-slate-900 dark:text-white">{s.total}</p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">Tasks</p>
                  </div>
                  <div>
                    <p className="font-mono text-lg font-medium text-emerald-600 dark:text-emerald-400">{s.completed}</p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">Done</p>
                  </div>
                  <div>
                    <p className="font-mono text-lg font-medium text-slate-900 dark:text-white">{s.tokens}</p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">Tokens</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 mt-4 text-xs text-brand-600 dark:text-brand-400 font-medium">
                  View details
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* 分页 */}
      {hasMore && (
        <div className="mt-4 text-center">
          <button onClick={() => setVisibleCount((c) => c + PAGE_SIZE)} className="btn-secondary text-sm">
            Load more ({filtered.length - visible.length} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
