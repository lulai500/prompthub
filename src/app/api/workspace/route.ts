// ============================================================
// GET /api/workspace?q=...
// 任务工作台：把用户输入的自然语言任务匹配到最佳任务，
// 返回该任务聚合的三支柱资产（提示词/技能/工作流）+ 调参建议
// ============================================================

import { NextResponse } from 'next/server';
import { TASKS } from '@/lib/tasks';
import { getCachedTaskAssets } from '@/lib/query-cache';

// 关键词打分匹配：查询词在任务标题/描述/标签中命中的权重和
function matchTask(query: string) {
  const q = query.toLowerCase();
  const words = q.split(/[^a-z0-9]+/).filter((w) => w.length >= 3);
  let best: { task: (typeof TASKS)[number]; score: number; matched: string[] } | null = null;

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';

  if (!q.trim()) {
    return NextResponse.json({ task: null, prompts: [], skills: [], workflows: [] });
  }

  const match = matchTask(q);
  if (!match) {
    return NextResponse.json({
      task: null,
      prompts: [],
      skills: [],
      workflows: [],
      note:
        'Could not match that to a task. Try describing the outcome — for example "write a blog post", "debug my code", or "analyze data".',
    });
  }

  const { prompts, skills, workflows } = await getCachedTaskAssets(
    match.task.slug,
    match.task.tags
  );

  return NextResponse.json({
    task: {
      slug: match.task.slug,
      title: match.task.title,
      description: match.task.description,
    },
    matched: match.matched,
    prompts,
    skills,
    workflows,
  });
}
