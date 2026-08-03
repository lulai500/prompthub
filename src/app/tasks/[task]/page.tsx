// ============================================================
// 任务落地页：聚合三支柱解法
// /tasks/{slug} → 相关提示词 + 技能 + 工作流
// 组合型功能：一个任务 = 全套方案（SEO + 差异化）
// ============================================================

import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Compass, Wrench, GitBranch, MessageSquareText } from 'lucide-react';
import { TASKS, getTaskBySlug } from '@/lib/tasks';
import { getCachedTaskAssets, getCachedPromptStatsBatch } from '@/lib/query-cache';
import PromptCard from '@/components/prompts/PromptCard';
import type { Prompt } from '@/types';

// ISR：整页缓存 300s；预生成全部任务页
export const revalidate = 300;

export function generateStaticParams() {
  return TASKS.map((t) => ({ task: t.slug }));
}

interface Props {
  params: { task: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const task = getTaskBySlug(params.task);
  if (!task) return { title: 'Task not found' };
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const url = `${site}/tasks/${task.slug}`;
  const title = `${task.title} — Tested Prompts, Skills & Workflows`;
  return {
    title,
    description: task.description,
    alternates: { canonical: url },
    openGraph: { title, description: task.description, url, type: 'website', siteName: 'PromptHub' },
  };
}

export default async function TaskPage({ params }: Props) {
  const task = getTaskBySlug(params.task);
  if (!task) notFound();

  const { prompts, skills, workflows } = await getCachedTaskAssets(task.slug, task.tags);

  // 预取提示词统计
  const promptIds = (prompts as Prompt[]).map((p) => p.id);
  const statsData = await getCachedPromptStatsBatch(promptIds);
  const promptResults: Prompt[] = (prompts as Prompt[]).map((p) => ({
    ...p,
    avg_rating: statsData.find((s) => s.prompt_id === p.id)?.avg_rating || 0,
    rating_count: statsData.find((s) => s.prompt_id === p.id)?.rating_count || 0,
    favorite_count: statsData.find((s) => s.prompt_id === p.id)?.favorite_count || 0,
  }));

  const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: task.title,
    description: task.description,
    url: `${site}/tasks/${task.slug}`,
  };

  return (
    <div className="container-page py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* 页头 */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-sm font-medium mb-3">
          <Compass className="w-4 h-4" />
          Task
        </div>
        <h1 className="page-title">{task.title}</h1>
        <p className="page-subtitle max-w-xl">{task.description}</p>
      </div>

      {/* 提示词 */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquareText className="w-5 h-5 text-brand-500" />
          <h2 className="text-xl font-semibold">Prompts</h2>
          <span className="text-sm text-slate-400">({promptResults.length})</span>
        </div>
        {promptResults.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No matching prompts yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {promptResults.map((p) => (
              <PromptCard key={p.id} prompt={p} />
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 技能 */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Wrench className="w-5 h-5 text-brand-500" />
            <h2 className="text-lg font-semibold">Skills</h2>
            <span className="text-sm text-slate-400">({skills.length})</span>
          </div>
          {skills.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No matching skills yet.</p>
          ) : (
            <div className="space-y-2">
              {skills.map((s) => (
                <Link
                  key={s.id}
                  href={`/skills/${s.slug || s.id}`}
                  className="card p-4 flex items-center justify-between hover:border-brand-300 dark:hover:border-brand-700 transition-all group"
                >
                  <div>
                    <p className="font-medium text-sm text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400">
                      {s.title}
                    </p>
                    <p className="text-xs text-slate-400">{s.skill_format}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* 工作流 */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <GitBranch className="w-5 h-5 text-brand-500" />
            <h2 className="text-lg font-semibold">Workflows</h2>
            <span className="text-sm text-slate-400">({workflows.length})</span>
          </div>
          {workflows.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No matching workflows yet.</p>
          ) : (
            <div className="space-y-2">
              {workflows.map((w) => (
                <Link
                  key={w.id}
                  href={`/workflows/${w.slug || w.id}`}
                  className="card p-4 flex items-center justify-between hover:border-brand-300 dark:hover:border-brand-700 transition-all group"
                >
                  <div>
                    <p className="font-medium text-sm text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400">
                      {w.title}
                    </p>
                    <p className="text-xs text-slate-400">{w.workflow_type}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* 返回 */}
      <div className="mt-10 text-center">
        <Link href="/tasks" className="btn-ghost text-sm text-brand-600 dark:text-brand-400">
          Browse all tasks
        </Link>
      </div>
    </div>
  );
}
