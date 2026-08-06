'use client';
// ============================================================
// 我的收藏集管理面板（仪表盘用）
// 列出/新建/删除收藏集，展示条目数与公开状态
// ============================================================

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Loader2, Globe, Lock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function CollectionsPanel() {
  const supabase = createClient();
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('collections')
      .select(
        'id, title, slug, description, is_public, (SELECT count(*) FROM collection_items WHERE collection_id = collections.id)'
      )
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    setCollections(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    if (!title.trim()) return;
    setBusy(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      setBusy(false);
      return;
    }
    const slug =
      title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') +
      '-' +
      Math.random().toString(36).slice(2, 6);
    await supabase.from('collections').insert({
      title: title.trim(),
      slug,
      is_public: isPublic,
      user_id: session.user.id,
    });
    setTitle('');
    setBusy(false);
    await load();
  }

  async function remove(id: number) {
    await supabase.from('collections').delete().eq('id', id);
    await load();
  }

  if (loading) {
    return (
      <div className="card p-6 text-center">
        <Loader2 className="w-6 h-6 text-brand-500 animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">My Collections</h2>
        <span className="text-xs text-slate-400">{collections.length}</span>
      </div>

      {/* 新建 */}
      <div className="flex gap-2 mb-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New collection name..."
          className="input flex-1 text-sm"
        />
        <button
          onClick={() => setIsPublic(!isPublic)}
          className="btn-ghost text-sm"
          title="Toggle public"
        >
          {isPublic ? <Globe className="w-4 h-4 text-green-600" /> : <Lock className="w-4 h-4 text-slate-400" />}
        </button>
        <button onClick={create} disabled={busy} className="btn-primary text-sm">
          <Plus className="w-4 h-4" /> Create
        </button>
      </div>

      {/* 列表 */}
      {collections.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No collections yet. Create one to organize prompts, skills, and workflows.
        </p>
      ) : (
        <div className="space-y-2">
          {collections.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 dark:border-dark-700"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {c.is_public ? (
                    <Globe className="w-3.5 h-3.5 text-green-600 shrink-0" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                  <span className="font-medium text-sm text-slate-900 dark:text-white truncate">
                    {c.title}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {Number(c.count || 0)} items
                  {c.is_public && c.slug && (
                    <>
                      {' · '}
                      <Link
                        href={`/collections/${c.slug}`}
                        className="text-brand-600 dark:text-brand-400 hover:underline"
                      >
                        view
                      </Link>
                    </>
                  )}
                </p>
              </div>
              <button
                onClick={() => remove(c.id)}
                className="text-slate-400 hover:text-red-500 shrink-0"
                title="Delete collection"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
