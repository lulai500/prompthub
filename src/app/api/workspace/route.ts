// ============================================================
// GET /api/workspace?q=...
// 任务工作台：把用户输入的自然语言任务匹配到最佳任务，
// 返回该任务聚合的三支柱资产（提示词/技能/工作流）+ 调参建议
// ============================================================

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCachedTaskAssets } from '@/lib/query-cache';
import { matchTask } from '@/lib/task-match';

export async function GET(request: Request) {
  // 登录墙：与 /workspace 页面一致，未登录用户不能使用工作台组装能力
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
