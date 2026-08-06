// ============================================================
// 站主后台 - 客户近 7 天活跃趋势（纯展示，服务端渲染）
// 复用 computeTaskStats 的 daily / dailyCompleted 桶
// ============================================================

const DAY_LABELS = ['-6d', '-5d', '-4d', '-3d', '-2d', '-1d', 'today'];

export default function ActivityChart({
  daily,
  dailyCompleted,
}: {
  daily: number[];
  dailyCompleted: number[];
}) {
  const maxDaily = Math.max(1, ...daily);
  const hasCompleted = dailyCompleted.some((c) => c > 0);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-slate-900 dark:text-white">
          Last 7 days — tasks created
        </p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          {daily.reduce((a, b) => a + b, 0)} total · {dailyCompleted.reduce((a, b) => a + b, 0)} completed
        </p>
      </div>
      <div className="flex items-end gap-1.5 h-20">
        {daily.map((count, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="font-mono text-[10px] text-slate-500">{count || ''}</span>
            <div
              className={`w-full rounded-t ${
                i === 6 ? 'bg-brand-500 dark:bg-brand-400' : 'bg-brand-200 dark:bg-brand-900/50'
              }`}
              style={{ height: `${Math.max(3, (count / maxDaily) * 60)}px` }}
            />
            <span className="font-mono text-[9px] text-slate-400">{DAY_LABELS[i]}</span>
          </div>
        ))}
      </div>
      {hasCompleted && (
        <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
          Completed per day: {dailyCompleted.join(' · ')}
        </p>
      )}
    </div>
  );
}
