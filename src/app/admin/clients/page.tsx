// ============================================================
// 站主后台 - 客户列表
// 顶部运营统计条 + 创建客户表单 + 客户网格（搜索/筛选/分页，客户端）
// 仅 owner 可访问
// ============================================================

import { redirect } from 'next/navigation';
import { Users, Download } from 'lucide-react';
import { getCurrentRole } from '@/lib/supabase/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import CreateClientForm from '@/components/clients/CreateClientForm';
import ClientsGrid from '@/components/clients/ClientsGrid';
import { effectiveTier } from '@/lib/client-quota';
import type { Client, ClientTask } from '@/types';

export const dynamic = 'force-dynamic';

export default async function ClientsPage() {
  const role = await getCurrentRole();
  if (role !== 'owner') {
    redirect('/');
  }

  const supabase = createServerSupabaseClient();
  const { data: clientsData } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });

  const { data: tasksData } = await supabase
    .from('client_tasks')
    .select('client_id, status, tokens');

  const clients: Client[] = clientsData ?? [];
  const tasks = (tasksData ?? []) as Pick<ClientTask, 'client_id' | 'status' | 'tokens'>[];

  // 顶部运营统计
  const now = Date.now();
  const active = clients.filter((c) => c.status === 'active');
  const paused = clients.filter((c) => c.status === 'paused');
  const proActive = clients.filter((c) => effectiveTier(c.tier, c.pro_expires_at) === 'pro');
  const proExpiring7d = proActive.filter(
    (c) => c.pro_expires_at && new Date(c.pro_expires_at).getTime() - now < 7 * 86400000
  );

  return (
    <div className="container-page py-10">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Clients
          </h1>
        </div>
        <a href="/api/admin/clients/export" className="btn-secondary text-sm shrink-0">
          <Download className="w-4 h-4" />
          Export CSV
        </a>
      </div>
      <p className="text-slate-500 dark:text-slate-400 mb-8">
        Create client accounts and monitor their workstation activity.
      </p>

      {/* 运营统计条 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {[
          { label: 'Total', value: clients.length, tone: '' },
          { label: 'Active', value: active.length, tone: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Paused', value: paused.length, tone: 'text-amber-600 dark:text-amber-400' },
          { label: 'Pro active', value: proActive.length, tone: 'text-brand-600 dark:text-brand-400' },
          { label: 'Pro expiring 7d', value: proExpiring7d.length, tone: 'text-red-600 dark:text-red-400' },
          { label: 'Total tasks', value: tasks.length, tone: '' },
        ].map((s) => (
          <div key={s.label} className="card p-4 text-center">
            <p className={`font-mono text-2xl font-medium text-slate-900 dark:text-white leading-none ${s.tone}`}>
              {s.value}
            </p>
            <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500 mt-1.5">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* 创建客户表单 */}
      <CreateClientForm />

      {/* 客户网格（搜索/筛选/分页） */}
      <div className="mt-8">
        <ClientsGrid clients={clients} tasks={tasks} />
      </div>
    </div>
  );
}
