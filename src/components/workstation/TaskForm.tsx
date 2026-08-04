'use client';
// ============================================================
// 客户工作站 - 新建任务表单
// 选项目 + 输入任务 → POST /api/workstation/execute → 刷新
// ============================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import UpgradeButton from '@/components/workstation/UpgradeButton';

const SUGGESTIONS = ['write a blog post', 'draft a marketing email', 'debug my API code', 'analyze sales data'];

interface TaskFormProps {
  projects: { id: number; name: string }[];
  canUpgrade?: boolean;
  quotaReached?: boolean;
}

export default function TaskForm({ projects, canUpgrade = false, quotaReached = false }: TaskFormProps) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? 0);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [quotaHit, setQuotaHit] = useState(false);

  async function run(q: string) {
    if (!projectId) {
      setError('Create a project first, or ask the owner to set one up.');
      return;
    }
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    setQuotaHit(false);
    try {
      const res = await fetch('/api/workstation/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, query: q.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.quota) {
          // 月度配额用尽
          setQuotaHit(true);
          setError(data.error || 'Monthly limit reached.');
        } else {
          setError(data.error || 'Failed to run the task.');
        }
      } else if (data.generated && data.result) {
        // 真生成：任务已完成，看板会出现交付物
        setSuccess('Task completed — the deliverable is in your board below.');
        setQuery('');
      } else {
        // 降级（无 AI key / 未匹配）：明确告知，不假装成功
        setError(
          data.note ||
            'AI generation is not available right now. The task was not created — try again shortly.'
        );
      }
    } catch {
      setError('Network error. Try again.');
    }
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-brand-600 dark:text-brand-400" />
        <h2 className="font-semibold text-slate-900 dark:text-white">Run a new task</h2>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Describe what you need. We&apos;ll match it to a tested prompt and generate the deliverable.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={projectId}
          onChange={(e) => setProjectId(Number(e.target.value))}
          className="input sm:w-48 shrink-0"
        >
          {projects.length === 0 ? (
            <option value={0}>No project</option>
          ) : (
            projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))
          )}
        </select>
        <div className="flex flex-1 gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                run(query);
              }
            }}
            placeholder="e.g. write a 5-part blog post outline for our product launch"
            className="input flex-1"
          />
          <button onClick={() => run(query)} disabled={loading || quotaReached} className="btn-primary shrink-0">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Run'}
          </button>
        </div>
      </div>

      {/* 配额用尽提示 */}
      {quotaReached && !loading && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          You&apos;ve used all your executions this month.
        </p>
      )}

      {/* 建议 */}
      {!loading && (
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => run(s)}
              disabled={loading}
              className="text-xs px-2.5 py-1 rounded-md border border-slate-300/60 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:border-brand-400/40 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
          Generating with AI… this can take up to a minute.
        </p>
      )}
      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </p>
      )}
      {/* 配额用尽时的升级入口 */}
      {quotaHit && (
        <div className="mt-3">
          {canUpgrade ? (
            <UpgradeButton />
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Contact the account owner to enable upgrades.
            </p>
          )}
        </div>
      )}
      {success && (
        <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {success}
        </p>
      )}
    </div>
  );
}
