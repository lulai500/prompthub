// ============================================================
// PromptHub - 使用 Streak 计算
// 输入：活跃日期数组（YYYY-MM-DD，UTC）
// 输出：当前连续天数 + 历史最佳
// ============================================================

const MS_DAY = 86400000;
const fmt = (d: Date) => d.toISOString().slice(0, 10);

export function computeStreakStats(dates: string[]): { current: number; best: number } {
  const set = new Set(dates);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const yesterday = new Date(today.getTime() - MS_DAY);

  // 当前 streak：从今天（或昨天）开始往回数连续天数
  let current = 0;
  let cursor: Date | null = set.has(fmt(today))
    ? today
    : set.has(fmt(yesterday))
    ? yesterday
    : null;
  while (cursor && set.has(fmt(cursor))) {
    current++;
    cursor = new Date(cursor.getTime() - MS_DAY);
  }

  // 历史最佳：排序后找最长连续段
  const sorted = Array.from(set).sort();
  let best = 0;
  let run = 0;
  let prevTs = 0;
  for (const d of sorted) {
    const ts = new Date(d + 'T00:00:00Z').getTime();
    if (prevTs && ts - prevTs === MS_DAY) run++;
    else run = 1;
    if (run > best) best = run;
    prevTs = ts;
  }

  return { current, best };
}
