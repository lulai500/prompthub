// ============================================================
// 资源包详情页：聚合三支柱精选资产
// ============================================================

import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Package, MessageSquareText, Wrench, GitBranch } from 'lucide-react';
import { BUNDLES, getBundleBySlug } from '@/lib/bundles';
import { getCachedBundleAssets, getCachedPromptStatsBatch } from '@/lib/query-cache';
import PromptCard from '@/components/prompts/PromptCard';
import type { Prompt } from '@/types';

export const revalidate = 300;

export function generateStaticParams() {
  return BUNDLES.map((b) => ({ slug: b.slug }));
}

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const bundle = getBundleBySlug(params.slug);
  if (!bundle) return { title: 'Bundle not found' };
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  return {
    title: `${bundle.title} — Tested AI Resource Bundle`,
    description: bundle.description,
    alternates: { canonical: `${site}/bundles/${bundle.slug}` },
  };
}

export default async function BundlePage({ params }: Props) {
  const bundle = getBundleBySlug(params.slug);
  if (!bundle) notFound();

  const { prompts, skills, workflows } = await getCachedBundleAssets(
    bundle.slug,
    bundle.promptSlugs,
    bundle.skillSlugs,
    bundle.workflowSlugs
  );

  // 预取提示词统计
  const promptIds = (prompts as Prompt[]).map((p) => p.id);
  const statsData = await getCachedPromptStatsBatch(promptIds);
  const promptResults: Prompt[] = (prompts as Prompt[]).map((p) => ({
    ...p,
    avg_rating: statsData.find((s) => s.prompt_id === p.id)?.avg_rating || 0,
    rating_count: statsData.find((s) => s.prompt_id === p.id)?.rating_count || 0,
    favorite_count: statsData.find((s) => s.prompt_id === p.id)?.favorite_count || 0,
  }));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: bundle.title,
    description: bundle.description,
  };

  return (
    <div className="container-page py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-sm font-medium mb-3">
          <Package className="w-4 h-4" />
          Bundle
        </div>
        <h1 className="page-title">{bundle.title}</h1>
        <p className="page-subtitle max-w-xl">{bundle.description}</p>
      </div>

      {/* 提示词 */}
      {promptResults.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquareText className="w-5 h-5 text-brand-500" />
            <h2 className="text-lg font-semibold">Prompts</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {promptResults.map((p) => (
              <PromptCard key={p.id} prompt={p} />
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {skills.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Wrench className="w-5 h-5 text-brand-500" />
              <h2 className="text-lg font-semibold">Skills</h2>
            </div>
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
          </section>
        )}

        {workflows.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <GitBranch className="w-5 h-5 text-brand-500" />
              <h2 className="text-lg font-semibold">Workflows</h2>
            </div>
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
          </section>
        )}
      </div>

      <div className="mt-10 text-center">
        <Link href="/bundles" className="btn-ghost text-sm text-brand-600 dark:text-brand-400">
          Browse all bundles
        </Link>
      </div>
    </div>
  );
}
