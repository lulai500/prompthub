'use client';
// ============================================================
// 任务工作台 v1
// 输入自然语言任务 → 自动组装全套方案（提示词+技能+工作流+调参建议）
// 三支柱终极入口（Pro 卖点）
// ============================================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Loader2, Sparkles, MessageSquareText, Wrench, GitBranch, Lightbulb } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface PromptLike { id: number; title: string; slug: string | null; description: string | null; category?: { name?: string } | null }
interface SkillLike { id: number; title: string; slug: string | null; skill_format: string }
interface WorkflowLike { id: number; title: string; slug: string | null; workflow_type: string }

interface WorkspaceResult {
  task: { slug: string; title: string; description: string } | null;
  prompts: PromptLike[];
  skills: SkillLike[];
  workflows: WorkflowLike[];
  note?: string;
}

const SUGGESTIONS = ['write a blog post', 'debug my code', 'analyze data', 'write a novel', 'create a video'];

export default function WorkspacePage() {
  const router = useRouter();
  const supabase = createClient();
  const [authChecked, setAuthChecked] = useState(false);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [result, setResult] = useState<WorkspaceResult | null>(null);

  // 登录墙：未登录访客跳转登录页，避免工作台内容对游客开放
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        router.push('/auth/login');
        return;
      }
      setAuthChecked(true);
    });
  }, [supabase, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/workspace?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ task: null, prompts: [], skills: [], workflows: [], note: 'Something went wrong. Try again.' });
    }
    setLoading(false);
  }

  // 鉴权完成前显示骨架屏，避免内容闪现
  if (!authChecked) {
    return (
      <div className="container-page py-10">
        <div className="max-w-3xl mx-auto animate-pulse space-y-4">
          <div className="h-8 w-48 bg-slate-200 dark:bg-dark-700 rounded" />
          <div className="h-12 bg-slate-200 dark:bg-dark-700 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <div className="max-w-3xl mx-auto">
        {/* 页头 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-sm font-medium mb-3">
            <Sparkles className="w-4 h-4" />
            Task Workspace
          </div>
          <h1 className="page-title">Describe what you want to do</h1>
          <p className="page-subtitle">
            We assemble the tested prompts, skills, and workflows to get it done.
          </p>
        </div>

        {/* 输入框 */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="e.g. write a blog post, debug my API, analyze sales data..."
              className="input pl-10 py-3 text-base"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary px-6 py-3">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Assemble'}
          </button>
        </form>

        {/* 建议 */}
        {!searched && (
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => { setQ(s); }}
                className="badge-default text-sm hover:bg-brand-100 dark:hover:bg-brand-900/20 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* 结果 */}
        {searched && !loading && result && (
          <div className="space-y-6">
            {result.note && !result.task && (
              <div className="card p-5 text-center text-sm text-slate-500 dark:text-slate-400">
                {result.note}
              </div>
            )}

            {result.task && (
              <>
                {/* 任务标题 */}
                <div className="card p-5">
                  <p className="text-xs text-slate-400 mb-1">Assembled for</p>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {result.task.title}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {result.task.description}
                  </p>
                  <Link href={`/tasks/${result.task.slug}`} className="text-sm text-brand-600 dark:text-brand-400 hover:underline mt-2 inline-block">
                    Open full task page →
                  </Link>
                </div>

                {/* 提示词 */}
                {result.prompts.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <MessageSquareText className="w-5 h-5 text-brand-500" />
                      <h3 className="font-semibold">Recommended Prompts</h3>
                    </div>
                    <div className="space-y-2">
                      {result.prompts.map((p) => (
                        <Link key={p.id} href={`/prompts/${p.slug || p.id}`} className="card p-4 flex items-center justify-between hover:border-brand-300 dark:hover:border-brand-700 transition-all group">
                          <div>
                            <p className="font-medium text-sm text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400">{p.title}</p>
                            {p.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{p.description}</p>}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* 技能 + 工作流 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {result.skills.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Wrench className="w-5 h-5 text-brand-500" />
                        <h3 className="font-semibold">Matching Skills</h3>
                      </div>
                      <div className="space-y-2">
                        {result.skills.map((s) => (
                          <Link key={s.id} href={`/skills/${s.slug || s.id}`} className="card p-3 flex items-center justify-between hover:border-brand-300 dark:hover:border-brand-700 transition-all group">
                            <p className="font-medium text-sm text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400">{s.title}</p>
                            <span className="text-xs text-slate-400">{s.skill_format}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.workflows.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <GitBranch className="w-5 h-5 text-brand-500" />
                        <h3 className="font-semibold">Matching Workflows</h3>
                      </div>
                      <div className="space-y-2">
                        {result.workflows.map((w) => (
                          <Link key={w.id} href={`/workflows/${w.slug || w.id}`} className="card p-3 flex items-center justify-between hover:border-brand-300 dark:hover:border-brand-700 transition-all group">
                            <p className="font-medium text-sm text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400">{w.title}</p>
                            <span className="text-xs text-slate-400">{w.workflow_type}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 调参建议 */}
                <div className="card p-5 bg-amber-50/50 dark:bg-amber-950/10 border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-5 h-5 text-amber-500" />
                    <h3 className="font-semibold text-slate-900 dark:text-white">Tuning Advice</h3>
                  </div>
                  <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1.5 list-disc ml-4">
                    <li>Start with the recommended prompt, then open the prompt page to fill its variables and see the token cost.</li>
                    <li>Pair it with the matching skill for a reusable, installable workflow.</li>
                    <li>Run the workflow end to end, then tweak temperature for creative tasks (0.7–0.9) or precision tasks (0.2–0.4).</li>
                    <li>Pro tip: save the assets you like to your favorites to build a personal kit.</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
