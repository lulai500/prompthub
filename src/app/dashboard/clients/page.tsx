// ============================================================
// 站主后台 - 客户列表
// 展示所有客户 + 各客户任务统计 + 创建客户表单
// 仅 owner 可访问
// ============================================================

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Users, Building2, ArrowRight, CircleStop, PlayCircle } from 'lucide-react';
import { getCurrentRole } from '@/lib/supabase/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import CreateClientForm from '@/components/clients/CreateClientForm';
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

  // 各客户任务统计（owner 可见全部）
  const { data: tasksData } = await supabase
    .from('client_tasks')
    .select('client_id, status, tokens');
  const clients: Client[] = clientsData ?? [];
  const tasks = (tasksData ?? []) as Pick<ClientTask, 'client_id' | 'status' | 'tokens'>[];

  const statsByClient = new Map<number, { total: number; completed: number; tokens: number }>();
  for (const t of tasks as Pick<ClientTask, 'client_id' | 'status' | 'tokens'>[]) {
    const s = statsByClient.get(t.client_id) || { total: 0, completed: 0, tokens: 0 };
    s.total++;
    if (t.status === 'completed') s.completed++;
    if (t.tokens) s.tokens += t.tokens;
    statsByClient.set(t.client_id, s);
  }

  return (
    <div className="container-page py-10">
      <div className="flex items-center gap-2 mb-2">
        <Users className="w-5 h-5 text-brand-600 dark:text-brand-400" />
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
          Clients
        </h1>
      </div>
      <p className="text-slate-500 dark:text-slate-400 mb-8">
        Create client accounts and monitor their workstation activity.
      </p>

      {/* 创建客户表单 */}
      <CreateClientForm />

      {/* 客户列表 */}
      {clients.length === 0 ? (
        <div className="card p-12 text-center text-slate-400 dark:text-slate-500">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>No clients yet. Create your first client above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          {clients.map((client) => {
            const s = statsByClient.get(client.id) || { total: 0, completed: 0, tokens: 0 };
            return (
              <Link
                key={client.id}
                href={`/dashboard/clients/${client.id}`}
                className="card p-5 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                      {client.name}
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      Client #{client.id}
                    </p>
                  </div>
                  {client.status === 'paused' ? (
                    <CircleStop className="w-4 h-4 text-amber-500 shrink-0" />
                  ) : (
                    <PlayCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  )}
                </div>

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
    </div>
  );
}
