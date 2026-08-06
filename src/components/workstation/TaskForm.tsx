'use client';
// ============================================================
// 客户工作站 - 新建任务表单（异步）
// 提交流程：POST /api/workstation/tasks 建任务(秒回) →
//           fire-and-forget POST .../tasks/[id]/run →
//           轮询 GET .../tasks/[id] 直至终态 → router.refresh()
// 页面不阻塞；失败/超时在表单内提示，并可从看板 Retry。
// ============================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import UpgradeButton from '@/components/workstation/UpgradeButton';
import { pollTaskStatus } from '@/lib/workstation-poll';

const SUGGESTIONS = ['write a blog post', 'draft a marketing email', 'debug my API code', 'analyze sales data'];

interface TaskFormProps {
  projects: { id: number; name: string }[];
  canUpgrade?: boolean;
  quotaReached?: boolean;
}

export default function TaskForm({ projects, canUpgrade = false, quotaReached = false }: TaskFormProps) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? 0);
  const [localProjects, setLocalProjects] = useState(projects);
  const [showNewProject, setShowNewProject] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [quotaHit, setQuotaHit] = useState(false);

  /** 内联新建项目 → 创建成功后选中新项目 */
  async function handleCreateProject() {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/workstation/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create project.');
        return;
      }
      const p = data.project;
      setLocalProjects((prev) => [...prev, p]);
      setProjectId(p.id);
      setNewName('');
      setShowNewProject(false);
      router.refresh();
    } catch {
      setError('Network error. Try again.');
    } finally {
      setCreating(false);
    }
  }

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
      // 1. start：快速建任务（pending）
      const startRes = await fetch('/api/workstation/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, query: q.trim() }),
      });
      const startData = await startRes.json();
      if (!startRes.ok) {
        if (startData.quota) {
          setQuotaHit(true);
          setError(startData.error || 'Monthly limit reached.');
        } else {
          setError(startData.error || 'Failed to run the task.');
        }
        return;
      }
      if (!startData.generated) {
        // 降级（无 AI key）：明确告知组装包，不假装成功
        setError(startData.note || 'AI generation is not available right now. Try again shortly.');
        return;
      }

      const taskId = startData.taskId as number;
      setQuery('');
      setSuccess(null);

      // 2. run：fire-and-forget（keepalive 尽量在页面关闭前送达）
      fetch(`/api/workstation/tasks/${taskId}/run`, {
        method: 'POST',
        keepalive: true,
      }).catch(() => {});

      // 3. 轮询直至终态（页面不阻塞，按钮保持 loading 态）
      const state = await pollTaskStatus(taskId);
      if (state.status === 'completed') {
        setSuccess('Task completed — the deliverable is in your board below.');
      } else if (state.status === 'failed') {
        setError(state.error || 'Generation failed. Click Retry on the task to try again.');
      } else {
        // timeout：run 未正常启动或超长运行
        setError('The task is taking longer than expected. Open the board and click Retry to try again.');
      }
      router.refresh();
    } catch {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
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
          onChange={(e) => {
            const v = Number(e.target.value);
            if (v === -1) {
              setShowNewProject(true);
            } else {
              setProjectId(v);
              setShowNewProject(false);
            }
          }}
          className="input sm:w-48 shrink-0"
        >
          {localProjects.length === 0 ? (
            <option value={0}>No project</option>
          ) : (
            localProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))
          )}
          <option value={-1}>+ New project…</option>
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

      {/* 内联新建项目 */}
      {showNewProject && (
        <div className="flex gap-2 mt-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreateProject();
              }
            }}
            placeholder="Project name (e.g. Blog writing)"
            className="input flex-1"
            autoFocus
          />
          <button
            onClick={handleCreateProject}
            disabled={creating || !newName.trim()}
            className="btn-primary shrink-0"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
          </button>
        </div>
      )}

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
          Task queued — generating with AI… this can take up to a minute.
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
