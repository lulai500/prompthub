// ============================================================
// 客户工作站 - 用量统计面板
// 任务数/完成率/token 用量 + 7 天趋势 + streak（纯展示，服务端渲染）
// ============================================================

import { CheckCircle2, Flame, Layers, Zap } from 'lucide-react';
import type { TaskStats } from '@/lib/workstation';

interface StatsPanelProps {
  stats: TaskStats;
  streak: { current: number; best: number };
}

const DAY_LABELS = ['-6d', '-5d', '-4d', '-3d', '-2d', '-1d', 'today'];

export default function StatsPanel({ stats, streak }: StatsPanelProps) {
  const rate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  const maxDaily = Math.max(1, ...stats.daily);

  return (
    <div>
      {/* 统计卡 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Layers className="w-4 h-4 text-brand-600 dark:text-brand-400" />}
          label="Tasks"
          value={String(stats.total)}
        />
        <StatCard
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
          label="Completed"
          value={`${stats.completed} · ${rate}%`}
        />
        <StatCard
          icon={<Zap className="w-4 h-4 text-slate-600 dark:text-slate-400" />}
          label="Tokens used"
          value={String(stats.tokens)}
        />
        <StatCard
          icon={<Flame className="w-4 h-4 text-amber-500" />}
          label="Day streak"
          value={`${streak.current} / ${streak.best}`}
        />
      </div>

      {/* 7 天趋势 */}
      <div className="card p-5 mt-4">
        <p className="text-sm font-medium text-slate-900 dark:text-white mb-3">
          Last 7 days — tasks created
        </p>
        <div className="flex items-end gap-1.5 h-20">
          {stats.daily.map((count, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="font-mono text-[10px] text-slate-500">{count || ''}</span>
              <div
                className={`w-full rounded-t ${
                  i === 6
                    ? 'bg-brand-500 dark:bg-brand-400'
                    : 'bg-brand-200 dark:bg-brand-900/50'
                }`}
                style={{ height: `${Math.max(3, (count / maxDaily) * 60)}px` }}
              />
              <span className="font-mono text-[9px] text-slate-400">{DAY_LABELS[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-1.5 mb-2">{icon}</div>
      <p className="font-mono text-2xl font-medium text-slate-900 dark:text-white leading-none">
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500 mt-1.5">
        {label}
      </p>
    </div>
  );
}
