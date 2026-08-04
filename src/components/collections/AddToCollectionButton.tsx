'use client';
// ============================================================
// 加入收藏集按钮
// 登录用户：选择收藏集或新建，把资产保存进去
// 收藏集可设为公开 → 网络效应 + 切换成本
// ============================================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FolderPlus, Loader2, Check, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Props {
  assetType: 'prompt' | 'skill' | 'workflow';
  assetId: number;
}

export default function AddToCollectionButton({ assetType, assetId }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [collections, setCollections] = useState<any[]>([]);
  const [show, setShow] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function load() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return;
    const { data } = await supabase
      .from('collections')
      .select('id, title')
      .eq('user_id', session.user.id)
      .order('created_at');
    setCollections(data || []);
  }

  async function toggle() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      router.push('/auth/login');
      return;
    }
    setShow(!show);
    setDone(false);
    if (!show) load();
  }

  async function addToCollection(cid: number) {
    setBusy(true);
    await supabase
      .from('collection_items')
      .upsert(
        { collection_id: cid, asset_type: assetType, asset_id: assetId },
        { onConflict: 'collection_id,asset_type,asset_id' }
      );
    setBusy(false);
    setDone(true);
    setTimeout(() => setDone(false), 1500);
  }

  async function createAndAdd() {
    if (!newTitle.trim()) return;
    setBusy(true);
    const slug =
      newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') +
      '-' +
      Math.random().toString(36).slice(2, 6);
    const { data } = await supabase
      .from('collections')
      .insert({ title: newTitle.trim(), slug, is_public: true })
      .select('id')
      .single();
    if (data) {
      await supabase
        .from('collection_items')
        .insert({ collection_id: data.id, asset_type: assetType, asset_id: assetId });
    }
    setNewTitle('');
    setBusy(false);
    setShow(false);
    await load();
    router.refresh();
  }

  return (
    <div className="relative">
      <button onClick={toggle} className="btn-ghost text-sm w-full" title="Save to a collection">
        {done ? <Check className="w-4 h-4" /> : <FolderPlus className="w-4 h-4" />}
        {done ? 'Saved!' : 'Add to collection'}
      </button>

      {show && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShow(false)} />
          <div className="absolute right-0 z-20 mt-2 w-60 bg-white dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl shadow-xl p-2">
            <p className="text-xs text-slate-400 dark:text-slate-500 px-2 py-1">
              Save to a collection
            </p>
            <div className="max-h-48 overflow-y-auto">
              {collections.map((c) => (
                <button
                  key={c.id}
                  onClick={() => addToCollection(c.id)}
                  disabled={busy}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-700 flex items-center justify-between"
                >
                  <span className="truncate">{c.title}</span>
                  {busy && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
                </button>
              ))}
              {collections.length === 0 && (
                <p className="text-xs text-slate-400 px-3 py-2">No collections yet</p>
              )}
            </div>
            <div className="border-t border-slate-200 dark:border-dark-700 mt-1 pt-2 px-2">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="New collection name"
                className="input text-sm w-full mb-1"
              />
              <button onClick={createAndAdd} disabled={busy} className="btn-primary text-xs w-full">
                <Plus className="w-3 h-3" /> Create &amp; add
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
