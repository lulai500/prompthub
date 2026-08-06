'use client';
// ============================================================
// 站主后台 - 客户交付物列表（可检索）
// 关键词搜索(title+input) + 状态筛选 + 分页
// 显示原始需求 + 失败原因(task.error)；已完成支持预览/下载/复制
// ============================================================

import { useMemo, useState } from 'react';
import { Download, Copy, Check, Search, FileText } from 'lucide-react';
import type { ClientTask } from '@/types';
import { formatDate, copyToClipboard, downloadText, slugify } from '@/lib/utils';

const PAGE_SIZE = 20;

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'in_progress', label: 'Running' },
  { key: 'completed', label: 'Completed' },
  { key: 'failed', label: 'Failed' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

export default function DeliverableList({ tasks }: { tasks: ClientTask[] }) {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = tasks;
    if (filter !== 'all') list = list.filter((t) => t.status === filter);
    if (q) list = list.filter((t) => (t.title + ' ' + (t.input || '')).toLowerCase().includes(q));
    return list;
  }, [tasks, filter, search]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visible.length < filtered.length;

  async function handleCopy(t: ClientTask) {
    if (t.result && (await copyToClipboard(t.result))) {
      setCopiedId(t.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }

  function handleDownload(t: ClientTask) {
    if (t.result) downloadText(`${slugify(t.title) || 'deliverable'}.txt`, t.result);
  }

  /** 导出当前筛选结果（尊重搜索/状态筛选）为 CSV */
  function handleExportCsv() {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['id', 'title', 'status', 'project_id', 'input', 'tokens', 'created_at', 'error', 'result'];
    const lines = filtered.map((t) =>
      [
        t.id,
        t.title,
        t.status,
        t.project_id,
        t.input,
        t.tokens ?? '',
        t.created_at,
        t.error ?? '',
        (t.result ?? '').slice(0, 2000),
      ]
        .map(esc)
        .join(',')
    );
    downloadText(
      `deliverables-${new Date().toISOString().slice(0, 10)}.csv`,
      [header.join(','), ...lines].join('\n')
    );
  }

  return (
    <div>
      {/* 筛选条 */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center gap-1 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => { setFilter(f.key); setVisibleCount(PAGE_SIZE); }}
              className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                filter === f.key
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setVisibleCount(PAGE_SIZE); }}
            placeholder="Search deliverables…"
            className="input pl-9 py-2 text-sm"
          />
        </div>
        <button
          onClick={handleExportCsv}
          disabled={filtered.length === 0}
          className="btn-secondary text-sm shrink-0"
        >
          <Download className="w-4 h-4" />
          Export ({filtered.length})
        </button>
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
        {filtered.length} of {tasks.length} deliverables
      </p>

      {visible.length === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-400 dark:text-slate-500">
          {tasks.length === 0
            ? 'No deliverables yet.'
            : 'No deliverables match your filters.'}
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((t) => (
            <div key={t.id} className="card p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                    <h3 className="font-medium text-slate-900 dark:text-white truncate">{t.title}</h3>
                    <StatusBadge status={t.status} />
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 truncate">
                    {formatDate(t.created_at)}
                    {t.tokens ? ` · ${t.tokens} tokens` : ''}
                    {t.matched_task_slug ? ` · matched: ${t.matched_task_slug.replace(/-/g, ' ')}` : ''}
                  </p>
                  {/* 原始需求 */}
                  {t.input && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 italic line-clamp-2">
                      “{t.input}”
                    </p>
                  )}
                  {/* 失败原因 */}
                  {t.status === 'failed' && t.error && (
                    <p className="text-xs text-red-500/90 dark:text-red-400/90 mt-1">
                      {t.error}
                    </p>
                  )}
                </div>

                {/* 操作 */}
                {t.result && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleCopy(t)}
                      className="btn-ghost p-2 text-xs" title="Copy deliverable"
                    >
                      {copiedId === t.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDownload(t)}
                      className="btn-ghost p-2 text-xs" title="Download .txt"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* 预览 */}
              {t.result && (
                <details className="mt-2">
                  <summary className="text-xs text-brand-600 dark:text-brand-400 font-medium cursor-pointer select-none">
                    Preview result
                  </summary>
                  <pre className="mt-2 text-xs bg-slate-50 dark:bg-dark-950/60 border border-slate-200 dark:border-slate-700/60 rounded-lg p-3 max-h-48 overflow-auto whitespace-pre-wrap">
                    {t.result}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

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

function StatusBadge({ status }: { status: ClientTask['status'] }) {
  const map: Record<ClientTask['status'], string> = {
    pending: 'badge-default',
    in_progress: 'badge-primary',
    completed: 'badge-success',
    failed: 'badge-default text-red-500 dark:text-red-400',
  };
  return <span className={`${map[status] || 'badge-default'} text-[10px]`}>{status.replace('_', ' ')}</span>;
}
