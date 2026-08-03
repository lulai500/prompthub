// ============================================================
// 任务索引页
// 列出所有任务（每个任务聚合三支柱解法）
// ============================================================

import Link from 'next/link';
import type { Metadata } from 'next';
import { Compass, ArrowUpRight } from 'lucide-react';
import { TASKS } from '@/lib/tasks';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Browse Tasks — PromptHub',
  description:
    'Find the prompts, skills, and workflows for common AI tasks — all in one place.',
};

export default function TasksIndexPage() {
  return (
    <div className="container-page py-10">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-sm font-medium mb-3">
          <Compass className="w-4 h-4" />
          {TASKS.length} tasks
        </div>
        <h1 className="page-title">Browse Tasks</h1>
        <p className="page-subtitle">
          Every task bundles the tested prompts, skills, and workflows that get it done.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TASKS.map((task) => (
          <Link
            key={task.slug}
            href={`/tasks/${task.slug}`}
            className="card p-5 group hover:border-brand-300 dark:hover:border-brand-700 transition-all"
          >
            <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
              {task.title}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              {task.description}
            </p>
            <div className="flex items-center gap-1 text-sm text-brand-600 dark:text-brand-400 mt-3">
              View prompts, skills &amp; workflows
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
