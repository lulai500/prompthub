'use client';
// ============================================================
// 客户工作站 - 任务看板
// 状态筛选（all/pending/in_progress/completed/failed），点击查看交付物
// ============================================================

import { useState } from 'react';
import { ClipboardList, Eye } from 'lucide-react';
import type { ClientTask } from '@/types';
import { formatDate } from '@/lib/utils';
import DeliverableModal from '@/components/workstation/DeliverableModal';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'in_progress', label: 'Running' },
  { key: 'completed', label: 'Completed' },
  { key: 'failed', label: 'Failed' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

export default function Kanban({ tasks }: { tasks: ClientTask[] }) {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [selected, setSelected] = useState<ClientTask | null>(null);

  const visible = filter === 'all' ? tasks : tasks.filter((t) => t.status === filter);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          Tasks
        </h2>
        {/* 状态筛选 */}
        <div className="flex items-center gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
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

      {visible.length === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-400 dark:text-slate-500">
          No tasks here yet. Run a task above to get started.
        </div>
      ) : (
        <div className="space-y-2.5">
          {visible.map((task) => (
            <button
              key={task.id}
              onClick={() => task.status === 'completed' && task.result && setSelected(task)}
              className={`w-full card p-4 text-left group ${
                task.status === 'completed' && task.result
                  ? 'cursor-pointer hover:border-brand-400/50'
                  : 'cursor-default'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-slate-900 dark:text-white truncate">{task.title}</h3>
                    <StatusBadge status={task.status} />
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 truncate">
                    {formatDate(task.created_at)}
                    {task.matched_task_slug ? ` · matched: ${task.matched_task_slug.replace(/-/g, ' ')}` : ''}
                  </p>
                </div>
                {task.status === 'completed' && task.result && (
                  <span className="flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Eye className="w-3.5 h-3.5" />
                    View
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <DeliverableModal task={selected} open={!!selected} onClose={() => setSelected(null)} />
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
