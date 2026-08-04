// ============================================================
// 客户工作站 - 主页面（客户专属）
// 首改密 → 暂停锁屏 → 工作台（统计 + 新建任务 + 看板）
// 仅 client 角色可访问；owner 引导去 /dashboard/clients
// ============================================================

import { redirect } from 'next/navigation';
import { getCurrentUser, getCurrentRole } from '@/lib/supabase/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { computeTaskStats } from '@/lib/workstation';
import { computeStreakStats } from '@/lib/streaks';
import FirstRunPassword from '@/components/workstation/FirstRunPassword';
import PausedGate from '@/components/workstation/PausedGate';
import StatsPanel from '@/components/workstation/StatsPanel';
import TaskForm from '@/components/workstation/TaskForm';
import Kanban from '@/components/workstation/Kanban';
import WorkstationGuide from '@/components/workstation/WorkstationGuide';
import type { ClientProject, ClientTask } from '@/types';

export const dynamic = 'force-dynamic';

export default async function WorkstationPage() {
  const user = await getCurrentUser();
  const role = await getCurrentRole();

  if (!user) redirect('/auth/login');
  // owner / 普通用户访问：显示引导页（说明工作台是客户专属），不再直接跳走
  if (role === 'owner') return <WorkstationGuide role="owner" />;
  if (role !== 'client') return <WorkstationGuide role="user" />;

  const supabase = createServerSupabaseClient();

  // 客户档案 + 状态
  const { data: profile } = await supabase
    .from('profiles')
    .select('must_change_password')
    .eq('id', user.id)
    .maybeSingle();

  const { data: myClient } = await supabase
    .from('clients')
    .select('*')
    .eq('account_id', user.id)
    .maybeSingle();

  // 项目 + 任务 + 活跃（RLS 保证只读自己的）
  const { data: projects = [] } = await supabase
    .from('client_projects')
    .select('*')
    .eq('client_id', myClient?.id ?? -1)
    .order('created_at', { ascending: false });
  const { data: tasks = [] } = await supabase
    .from('client_tasks')
    .select('*')
    .eq('client_id', myClient?.id ?? -1)
    .order('created_at', { ascending: false });
  const { data: activity = [] } = await supabase
    .from('user_activity')
    .select('active_date')
    .eq('user_id', user.id);

  const stats = computeTaskStats(tasks as ClientTask[]);
  const streak = computeStreakStats((activity as { active_date: string }[]).map((a) => a.active_date));

  // 首次登录需改密（临时密码 → 新密码）
  if (profile?.must_change_password) {
    return (
      <div className="container-page py-16 max-w-2xl">
        <FirstRunPassword />
      </div>
    );
  }

  // 暂停锁屏
  if (myClient?.status === 'paused') {
    return <PausedGate />;
  }

  return (
    <div className="container-page py-10">
      {/* 页头 */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
          {myClient?.name ? `${myClient.name} — ` : ''}Workstation
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Describe a task, run it with AI, and collect the deliverable below.
        </p>
      </div>

      {/* 统计 + 新建任务 */}
      <StatsPanel stats={stats} streak={streak} />

      <div className="mt-8">
        <TaskForm projects={(projects as ClientProject[]).filter((p) => p.status !== 'archived')} />
      </div>

      {/* 看板 */}
      <div className="mt-8">
        <Kanban tasks={tasks as ClientTask[]} />
      </div>
    </div>
  );
}
