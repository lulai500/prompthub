// ============================================================
// 版本历史页：列出资产的所有内容快照（最新在前）
// ============================================================

import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { History, ArrowLeft } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/server';
import { getCachedVersions, getCachedPromptDetail } from '@/lib/query-cache';
import { formatDate } from '@/lib/utils';

export const revalidate = 300;

const VALID_TYPES = ['prompt', 'skill', 'workflow'] as const;

interface Props {
  params: { type: string; id: string };
}

async function fetchAssetTitle(type: string, id: number): Promise<string> {
  const supabase = createAdminClient();
  if (type === 'prompt') {
    const p = await getCachedPromptDetail(String(id));
    return p?.title || '';
  }
  const table = type === 'skill' ? 'skills' : 'workflows';
  const { data } = await supabase.from(table).select('title').eq('id', id).single();
  return data?.title || '';
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const title = await fetchAssetTitle(params.type, Number(params.id));
  return { title: title ? `Version History — ${title}` : 'Version History' };
}

export default async function VersionsPage({ params }: Props) {
  const { type, id } = params;
  if (!VALID_TYPES.includes(type as any) || !Number.isFinite(Number(id))) notFound();

  const assetId = Number(id);
  const versions = await getCachedVersions(type, assetId);
  if (!versions.length) notFound();

  const title = await fetchAssetTitle(type, assetId);
  const total = versions.length;

  return (
    <div className="container-page py-10 max-w-3xl">
      <Link
        href={`/${type === 'prompt' ? 'prompts' : type === 'skill' ? 'skills' : 'workflows'}/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-brand-600 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {title || 'asset'}
      </Link>

      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-sm font-medium mb-3">
          <History className="w-4 h-4" />
          {total} versions
        </div>
        <h1 className="page-title">Version History</h1>
        <p className="page-subtitle">
          {title || `Asset #${assetId}`} — every change to its content is snapshotted automatically.
        </p>
      </div>

      <div className="space-y-3">
        {versions.map((v, i) => {
          const versionNumber = total - i;
          const isLatest = i === 0;
          return (
            <details key={v.id} className="card p-4" open={isLatest}>
              <summary className="cursor-pointer font-medium text-slate-900 dark:text-white flex items-center justify-between">
                <span>
                  v{versionNumber}
                  {isLatest && (
                    <span className="ml-2 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
                      latest
                    </span>
                  )}
                </span>
                <span className="text-xs text-slate-400 font-normal">
                  {formatDate(v.created_at)}
                </span>
              </summary>
              <pre className="mt-3 p-4 rounded-xl bg-slate-100 dark:bg-dark-800 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
                {v.content}
              </pre>
            </details>
          );
        })}
      </div>
    </div>
  );
}
