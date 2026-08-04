// ============================================================
// 公开收藏集页：展示用户公开的精选资产列表
// 网络效应 + 用户切换成本（公开库 = 沉没资产）
// ============================================================

import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { FolderOpen, Globe } from 'lucide-react';
import { createAnonClient } from '@/lib/supabase/server';
import FollowButton from '@/components/collections/FollowButton';

export const revalidate = 300;

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createAnonClient();
  const { data: collection } = await supabase
    .from('collections')
    .select('title, description')
    .eq('slug', params.slug)
    .eq('is_public', true)
    .single();
  if (!collection) return { title: 'Collection not found' };
  return { title: `${collection.title} — Collection`, description: collection.description || '' };
}

export default async function CollectionPage({ params }: Props) {
  const supabase = createAnonClient();
  const { data: collection } = await supabase
    .from('collections')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_public', true)
    .single();
  if (!collection) notFound();

  // 条目 + 解析标题/链接
  const { data: items } = await supabase
    .from('collection_items')
    .select('asset_type, asset_id')
    .eq('collection_id', collection.id)
    .order('position', { ascending: true })
    .order('id', { ascending: true });

  const itemList = items || [];
  const byType: Record<string, number[]> = {};
  for (const it of itemList) {
    (byType[it.asset_type] = byType[it.asset_type] || []).push(it.asset_id);
  }
  const tableMap: Record<string, string> = { prompt: 'prompts', skill: 'skills', workflow: 'workflows' };
  const titleMap: Record<string, string> = {};
  const linkMap: Record<string, string> = {};
  for (const [type, ids] of Object.entries(byType)) {
    const table = tableMap[type];
    if (!table) continue;
    const { data: rows } = await supabase.from(table).select('id, title, slug').in('id', ids);
    for (const r of rows || []) {
      const key = `${type}:${r.id}`;
      titleMap[key] = r.title;
      linkMap[key] = `/${table}/${r.slug || r.id}`;
    }
  }

  return (
    <div className="container-page py-10 max-w-3xl">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-sm font-medium mb-3">
          <Globe className="w-4 h-4" />
          Public Collection
        </div>
        <h1 className="page-title">{collection.title}</h1>
        {collection.description && (
          <p className="page-subtitle">{collection.description}</p>
        )}
        <div className="flex items-center gap-4 mt-3">
          <p className="text-xs text-slate-400">{itemList.length} items</p>
          <FollowButton collectionId={collection.id} />
        </div>
      </div>

      {itemList.length === 0 ? (
        <div className="card p-12 text-center">
          <FolderOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">This collection is empty.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {itemList.map((it) => {
            const key = `${it.asset_type}:${it.asset_id}`;
            const title = titleMap[key] || `${it.asset_type} #${it.asset_id}`;
            const href = linkMap[key];
            if (!href) return null;
            return (
              <Link
                key={key}
                href={href}
                className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 dark:border-dark-700 hover:border-brand-300 dark:hover:border-brand-700 transition-all group"
              >
                <span className="badge-default text-xs shrink-0">{it.asset_type}</span>
                <span className="font-medium text-sm text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 truncate flex-1">
                  {title}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
