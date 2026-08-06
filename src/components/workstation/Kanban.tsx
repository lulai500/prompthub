'use client';
// ============================================================
// 客户工作站 - 任务看板
// 状态筛选 + 关键词搜索(title/input) + 项目筛选 + 分页(Load more)
// failed / pending 任务可一键重试；completed 点击查看交付物
// ============================================================

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, Eye, RefreshCw, Search } from 'lucide-react';
import type { ClientTask } from '@/types';
import { formatDate } from '@/lib/utils';
import DeliverableModal from '@/components/workstation/DeliverableModal';
import { pollTaskStatus } from '@/lib/workstation-poll';

const PAGE_SIZE = 20;

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'in_progress', label: 'Running' },
  { key: 'completed', label: 'Completed' },
  { key: 'failed', label: 'Failed' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

interface KanbanProps {
  tasks: ClientTask[];
  projects: { id: number; name: string }[];
}

export default function Kanban({ tasks, projects }: KanbanProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState(0); // 0 = all projects
  const [selected, setSelected] = useState<ClientTask | null>(null);
  const [retryingId, setRetryingId] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // 状态筛选 + 项目筛选 + 关键词搜索
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = tasks;
    if (filter !== 'all') list = list.filter((t) => t.status === filter);
    if (projectFilter !== 0) list = list.filter((t) => t.project_id === projectFilter);
    if (q) {
      list = list.filter((t) => (t.title + ' ' + (t.input || '')).toLowerCase().includes(q));
    }
    return list;
  }, [tasks, filter, search, projectFilter]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visible.length < filtered.length;

  function resetPaging() {
    setVisibleCount(PAGE_SIZE);
  }

  async function handleRetry(task: ClientTask) {
    if (retryingId) return;
    setRetryingId(task.id);
    try {
      // 重跑（pending/failed 均可；原子抢占防并发）
      fetch(`/api/workstation/tasks/${task.id}/run`, { method: 'POST', keepalive: true }).catch(() => {});
      await pollTaskStatus(task.id);
      router.refresh();
    } finally {
      setRetryingId(null);
    }
  }

  return (
    <div>
      {/* 标题 + 状态筛选 */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          Tasks
          {filtered.length > 0 && (
            <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
              {filtered.length}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-1 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => {
                setFilter(f.key);
                resetPaging();
              }}
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
      </div>

      {/* 搜索 + 项目筛选 */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetPaging();
            }}
            placeholder="Search tasks…"
            className="input pl-9 py-2 text-sm"
          />
        </div>
        <select
          value={projectFilter}
          onChange={(e) => {
            setProjectFilter(Number(e.target.value));
            resetPaging();
          }}
          className="input sm:w-48 py-2 text-sm"
        >
          <option value={0}>All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {visible.length === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-400 dark:text-slate-500">
          {filtered.length === 0 && (search || projectFilter !== 0 || filter !== 'all')
            ? 'No tasks match your filters.'
            : 'No tasks here yet. Run a task above to get started.'}
        </div>
      ) : (
        <div className="space-y-2.5">
          {visible.map((task) => (
            <div
              key={task.id}
              className={`card p-4 flex items-center justify-between gap-3 group ${
                task.status === 'completed' && task.result
                  ? 'cursor-pointer hover:border-brand-400/50'
                  : 'cursor-default'
              }`}
              onClick={() => task.status === 'completed' && task.result && setSelected(task)}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-slate-900 dark:text-white truncate">{task.title}</h3>
                  <StatusBadge status={task.status} />
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 truncate">
                  {formatDate(task.created_at)}
                  {task.matched_task_slug ? ` · matched: ${task.matched_task_slug.replace(/-/g, ' ')}` : ''}
                  {task.status === 'failed' && task.error ? (
                    <span className="text-red-500/80 dark:text-red-400/80"> · {task.error}</span>
                  ) : null}
                </p>
              </div>

              {/* 操作区 */}
              <div className="flex items-center gap-2 shrink-0">
                {task.status === 'completed' && task.result && (
                  <span className="flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Eye className="w-3.5 h-3.5" />
                    View
                  </span>
                )}
                {(task.status === 'failed' || task.status === 'pending') && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRetry(task);
                    }}
                    disabled={retryingId !== null}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-slate-300/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 hover:border-brand-400/40 transition-colors"
                  >
                    {retryingId === task.id ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    Retry
                  </button>
                )}
              </div>
            </div>
          ))}
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

      <DeliverableModal
        task={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onRegenerated={() => {
          setSelected(null);
          router.refresh();
        }}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: ClientTask['status'] }) {
  const map: Record<ClientTask['status'], string> = {
    pending: 'bg-slate-100 dark:bg-dark-800 text-slate-500 dark:text-slate-400',
    in_progress: 'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300',
    completed: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    failed: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[10px] leading-none ${map[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
