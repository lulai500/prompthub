// ============================================================
// 任务关键词匹配
// 从 /api/workspace 抽出，供 workspace 与客户工作站 execute 复用
// ============================================================

import { TASKS, type TaskDef } from '@/lib/tasks';

export interface TaskMatch {
  task: TaskDef;
  score: number;
  matched: string[];
}

/** 关键词打分匹配：查询词在任务标题/描述/标签中命中的权重和 */
export function matchTask(query: string): TaskMatch | null {
  const q = query.toLowerCase();
  const words = q.split(/[^a-z0-9]+/).filter((w) => w.length >= 3);
  let best: TaskMatch | null = null;

  for (const t of TASKS) {
    const haystack = (t.title + ' ' + t.description + ' ' + t.tags.join(' ')).toLowerCase();
    let score = 0;
    const matched: string[] = [];
    for (const w of words) {
      if (haystack.includes(w)) {
        score += w.length;
        matched.push(w);
      }
    }
    if (score > (best?.score ?? 0)) best = { task: t, score, matched };
  }

  return best && best.score > 0 ? best : null;
}
