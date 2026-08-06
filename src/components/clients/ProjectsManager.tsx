'use client';
// ============================================================
// 站主后台 - 客户项目管理
// 新建 / 改名 / 归档(status=archived) / 恢复；POST/PATCH 后 refresh
// ============================================================

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, Archive, RotateCcw, Pencil, X, Check } from 'lucide-react';
import type { ClientProject, ClientTask } from '@/types';

interface ProjectsManagerProps {
  clientId: number;
  projects: ClientProject[];
  tasks: Pick<ClientTask, 'project_id'>[];
}

export default function ProjectsManager({ clientId, projects, tasks }: ProjectsManagerProps) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const countByProject = useMemo(() => {
    const m: Record<number, number> = {};
    for (const t of tasks) m[t.project_id] = (m[t.project_id] || 0) + 1;
    return m;
  }, [tasks]);

  const activeProjects = projects.filter((p) => p.status !== 'archived');
  const archivedProjects = projects.filter((p) => p.status === 'archived');

  async function create() {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to create project.'); return; }
      setNewName('');
      setCreating(false);
      router.refresh();
    } catch { setError('Network error.'); } finally { setBusy(false); }
  }

  async function patch(projectId: number, body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/projects`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, ...body }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to update project.'); return; }
      setRenamingId(null);
      router.refresh();
    } catch { setError('Network error.'); } finally { setBusy(false); }
  }

  function startRename(p: ClientProject) {
    setRenamingId(p.id);
    setRenameValue(p.name);
  }

  return (
    <div>
      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

      {/* 新建项目 */}
      <div className="mb-4">
        {creating ? (
          <div className="flex gap-2 max-w-md">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && create()}
              placeholder="Project name (e.g. Blog writing)"
              className="input flex-1"
              autoFocus
            />
            <button onClick={create} disabled={busy || !newName.trim()} className="btn-primary shrink-0">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
            </button>
            <button onClick={() => setCreating(false)} className="btn-ghost px-2">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setCreating(true)} className="btn-secondary text-sm">
            <Plus className="w-4 h-4" />
            New project
          </button>
        )}
      </div>

      {/* 活动项目 */}
      {activeProjects.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">No active projects.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeProjects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              taskCount={countByProject[p.id] || 0}
              busy={busy}
              renaming={renamingId === p.id}
              renameValue={renameValue}
              setRenameValue={setRenameValue}
              onStartRename={() => startRename(p)}
              onCancelRename={() => setRenamingId(null)}
              onSaveRename={() => patch(p.id, { name: renameValue })}
              onArchive={() => patch(p.id, { status: 'archived' })}
            />
          ))}
        </div>
      )}

      {/* 已归档 */}
      {archivedProjects.length > 0 && (
        <div className="mt-5">
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">Archived</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {archivedProjects.map((p) => (
              <div key={p.id} className="card p-4 opacity-70">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-medium text-slate-700 dark:text-slate-300 line-through truncate">{p.name}</h4>
                  <button
                    onClick={() => patch(p.id, { status: 'active' })}
                    disabled={busy}
                    className="text-xs text-slate-500 hover:text-brand-600 inline-flex items-center gap-1 shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Restore
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1">{countByProject[p.id] || 0} tasks</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectCard({
  project,
  taskCount,
  busy,
  renaming,
  renameValue,
  setRenameValue,
  onStartRename,
  onCancelRename,
  onSaveRename,
  onArchive,
}: {
  project: ClientProject;
  taskCount: number;
  busy: boolean;
  renaming: boolean;
  renameValue: string;
  setRenameValue: (v: string) => void;
  onStartRename: () => void;
  onCancelRename: () => void;
  onSaveRename: () => void;
  onArchive: () => void;
}) {
  return (
    <div className="card p-5">
      {renaming ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSaveRename()}
            className="input flex-1 py-1.5 text-sm"
            autoFocus
          />
          <button onClick={onSaveRename} disabled={busy || !renameValue.trim()} className="btn-primary px-2 py-1.5 shrink-0">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={onCancelRename} className="btn-ghost px-2 py-1.5 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-slate-900 dark:text-white truncate">{project.name}</h4>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={onStartRename} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" title="Rename">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={onArchive} className="p-1 text-slate-400 hover:text-red-500" title="Archive">
                <Archive className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          {project.description && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 line-clamp-2">{project.description}</p>
          )}
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
            {taskCount} task{taskCount !== 1 ? 's' : ''}
          </p>
        </>
      )}
    </div>
  );
}
