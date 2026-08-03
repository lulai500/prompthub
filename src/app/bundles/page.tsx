// ============================================================
// 资源包索引页
// 精选资产合集（提示词 + 技能 + 工作流）
// ============================================================

import Link from 'next/link';
import type { Metadata } from 'next';
import { Package, ArrowUpRight } from 'lucide-react';
import { BUNDLES } from '@/lib/bundles';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Resource Bundles — PromptHub',
  description:
    'Curated bundles of tested prompts, skills, and workflows — grab a complete solution in one place.',
};

export default function BundlesIndexPage() {
  return (
    <div className="container-page py-10">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-sm font-medium mb-3">
          <Package className="w-4 h-4" />
          {BUNDLES.length} bundles
        </div>
        <h1 className="page-title">Resource Bundles</h1>
        <p className="page-subtitle">
          Curated collections of tested prompts, skills, and workflows — grab a complete
          solution in one place.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {BUNDLES.map((b) => (
          <Link
            key={b.slug}
            href={`/bundles/${b.slug}`}
            className="card p-5 group hover:border-brand-300 dark:hover:border-brand-700 transition-all"
          >
            <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
              {b.title}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              {b.description}
            </p>
            <div className="flex items-center gap-1.5 text-sm text-brand-600 dark:text-brand-400 mt-3">
              {b.promptSlugs.length} prompts · {b.skillSlugs.length} skills ·{' '}
              {b.workflowSlugs.length} workflows
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
