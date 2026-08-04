// ============================================================
// 站主后台 - 客户详情
// 客户信息（含 email）+ 项目 + 任务统计 + 交付物列表 + 暂停/恢复
// 仅 owner 可访问
// ============================================================

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Mail, Calendar, FileText, CircleStop, PlayCircle } from 'lucide-react';
import { getCurrentRole } from '@/lib/supabase/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import { computeTaskStats } from '@/lib/workstation';
import { effectiveTier, quotaLimit, countMonthlyUsageFromTasks } from '@/lib/client-quota';
import { formatDate } from '@/lib/utils';
import ClientStatusButton from '@/components/clients/ClientStatusButton';
import GrantProButton from '@/components/clients/GrantProButton';
import type { ClientProject, ClientTask } from '@/types';

export const dynamic = 'force-dynamic';

export default async function ClientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const role = await getCurrentRole();
  if (role !== 'owner') redirect('/');

  const clientId = Number(params.id);
  if (!Number.isInteger(clientId)) redirect('/dashboard/clients');

  const admin = createAdminClient();

  // 客户档案
  const { data: client } = await admin
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .maybeSingle();
  if (!client) redirect('/dashboard/clients');

  // 客户登录邮箱（auth.users）
  let email: string | null = null;
  if (client.account_id) {
    const { data: au } = await admin.auth.admin.getUserById(client.account_id);
    email = au?.user?.email ?? null;
  }

  // 项目 + 任务
  const supabase = createServerSupabaseClient();
  const { data: projectsData } = await supabase
    .from('client_projects')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  const { data: tasksData } = await supabase
    .from('client_tasks')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  const projects: ClientProject[] = projectsData ?? [];
  const tasks = (tasksData ?? []) as ClientTask[];

  const stats = computeTaskStats(tasks as ClientTask[]);

  // 当月 AI 执行配额（free 20 / pro 500 次）
  const quotaTier = effectiveTier(client.tier, client.pro_expires_at);
  const quotaUsed = countMonthlyUsageFromTasks((tasks as ClientTask[]).map((t) => ({ status: t.status, created_at: t.created_at })));
  const clientQuotaLimit = quotaLimit(quotaTier);

  return (
    <div className="container-page py-10">
      <Link
        href="/dashboard/clients"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        All clients
      </Link>

      {/* 客户信息 */}
      <div className="card p-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                {client.name}
              </h1>
              {client.status === 'paused' ? (
                <span className="badge-default text-amber-600 dark:text-amber-400">paused</span>
              ) : (
                <span className="badge-default text-emerald-600 dark:text-emerald-400">active</span>
              )}
              {quotaTier === 'pro' ? (
                <span className="badge-success text-xs">Pro</span>
              ) : (
                <span className="badge-default text-xs">Free</span>
              )}
              {quotaTier === 'pro' && client.pro_expires_at && (
                <span className="badge-default text-xs">
                  until {formatDate(client.pro_expires_at)}
                </span>
              )}
            </div>
            <div className="mt-3 space-y-1.5 text-sm text-slate-500 dark:text-slate-400">
              <p className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5" />
                {email || '—'}
              </p>
              <p className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                Created {formatDate(client.created_at)}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
            <GrantProButton clientId={client.id} tier={client.tier} />
            <ClientStatusButton
              clientId={client.id}
              currentStatus={client.status}
              paused={client.status === 'paused'}
            />
          </div>
        </div>
      </div>

      {/* 统计 */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        {[
          { label: 'Tasks', value: stats.total },
          { label: 'Completed', value: stats.completed },
          { label: 'Failed', value: stats.failed },
          { label: 'In progress', value: stats.in_progress },
          { label: 'Monthly usage', value: `${quotaUsed}/${clientQuotaLimit}` },
          { label: 'Tokens used', value: stats.tokens },
        ].map((s) => (
          <div key={s.label} className="card p-4 text-center">
            <p className="font-mono text-2xl font-medium text-slate-900 dark:text-white">{s.value}</p>
            <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500 mt-1">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* 项目 */}
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Projects</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {projects.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">No projects yet.</p>
        ) : (
          projects.map((p: ClientProject) => {
            const pTasks = (tasks as ClientTask[]).filter((t) => t.project_id === p.id);
            return (
              <div key={p.id} className="card p-5">
                <h3 className="font-semibold text-slate-900 dark:text-white">{p.name}</h3>
                {p.description && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 line-clamp-2">{p.description}</p>
                )}
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
                  {pTasks.length} task{pTasks.length !== 1 ? 's' : ''}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* 交付物列表 */}
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Deliverables</h2>
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">No deliverables yet.</p>
        ) : (
          (tasks as ClientTask[]).map((t) => (
            <div key={t.id} className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                  <h3 className="font-medium text-slate-900 dark:text-white truncate">{t.title}</h3>
                  <TaskStatusBadge status={t.status} />
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 truncate">
                  {formatDate(t.created_at)}
                  {t.tokens ? ` · ${t.tokens} tokens` : ''}
                </p>
              </div>
              {t.result && (
                <details className="sm:w-1/2 shrink-0">
                  <summary className="text-xs text-brand-600 dark:text-brand-400 font-medium cursor-pointer select-none">
                    Preview result
                  </summary>
                  <pre className="mt-2 text-xs bg-slate-50 dark:bg-dark-950/60 border border-slate-200 dark:border-slate-700/60 rounded-lg p-3 max-h-48 overflow-auto whitespace-pre-wrap">
                    {t.result}
                  </pre>
                </details>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/** 任务状态徽章（owner 后台用，纯展示） */
function TaskStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'badge-default',
    in_progress: 'badge-primary',
    completed: 'badge-success',
    failed: 'badge-default text-red-500 dark:text-red-400',
  };
  return <span className={`${map[status] || 'badge-default'} text-[10px]`}>{status.replace('_', ' ')}</span>;
}
