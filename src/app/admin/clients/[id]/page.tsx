// ============================================================
// 站主后台 - 客户详情
// 客户信息（含 email）+ 项目 + 任务统计 + 交付物列表 + 暂停/恢复
// 仅 owner 可访问
// ============================================================

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Mail, Calendar, Crown, CircleStop, PlayCircle } from 'lucide-react';
import { getCurrentRole } from '@/lib/supabase/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import { computeTaskStats } from '@/lib/workstation';
import { effectiveTier, quotaLimit, countMonthlyUsageFromTasks } from '@/lib/client-quota';
import { formatDate } from '@/lib/utils';
import ClientStatusButton from '@/components/clients/ClientStatusButton';
import ClientArchiveButton from '@/components/clients/ClientArchiveButton';
import GrantProButton from '@/components/clients/GrantProButton';
import ResetPasswordButton from '@/components/clients/ResetPasswordButton';
import ProjectsManager from '@/components/clients/ProjectsManager';
import DeliverableList from '@/components/clients/DeliverableList';
import ActivityChart from '@/components/clients/ActivityChart';
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
  if (!Number.isInteger(clientId)) redirect('/admin/clients');

  const admin = createAdminClient();

  // 客户档案
  const { data: client } = await admin
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .maybeSingle();
  if (!client) redirect('/admin/clients');

  // 客户登录邮箱（auth.users）
  let email: string | null = null;
  if (client.account_id) {
    const { data: au } = await admin.auth.admin.getUserById(client.account_id);
    email = au?.user?.email ?? null;
  }

  // 订阅（Lemon Squeezy 自助升级）
  const { data: subsData } = await admin
    .from('client_subscriptions')
    .select('*')
    .eq('client_id', clientId);
  const subscription = (subsData ?? [])[0] ?? null;

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
        href="/admin/clients"
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
              ) : client.status === 'archived' ? (
                <span className="badge-default text-slate-500 dark:text-slate-400">archived</span>
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
              {subscription && (
                <p className="flex items-center gap-2">
                  <Crown className="w-3.5 h-3.5" />
                  Subscription: <span className="badge-default text-[10px]">{subscription.status}</span>
                  {subscription.current_period_end
                    ? ` · ${subscription.status === 'cancelled' ? 'ends' : 'renews'} ${formatDate(subscription.current_period_end)}`
                    : ''}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0 flex-wrap">
            <GrantProButton clientId={client.id} tier={client.tier} />
            <ResetPasswordButton clientId={client.id} />
            {client.status !== 'archived' && (
              <ClientStatusButton
                clientId={client.id}
                currentStatus={client.status}
                paused={client.status === 'paused'}
              />
            )}
            <ClientArchiveButton clientId={client.id} status={client.status} />
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

      {/* 近 7 天活跃趋势 */}
      <div className="mb-8">
        <ActivityChart daily={stats.daily} dailyCompleted={stats.dailyCompleted} />
      </div>

      {/* 项目（可管理：新建/改名/归档） */}
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Projects</h2>
      <ProjectsManager clientId={clientId} projects={projects} tasks={tasks as ClientTask[]} />

      {/* 交付物列表（可检索） */}
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Deliverables</h2>
      <DeliverableList tasks={tasks as ClientTask[]} />
    </div>
  );
}
