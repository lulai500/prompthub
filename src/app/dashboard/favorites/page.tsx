'use client';
// ============================================================
// 我的收藏页面
// 支持：文件夹分组、新建/删除文件夹、取消收藏
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Heart,
  FolderPlus,
  Trash2,
  ExternalLink,
  Folder,
  X,
  Plus,
  Copy,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import type { Favorite, Folder as FolderType } from '@/types';

export default function FavoritesPage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<any>(null);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [error, setError] = useState('');

  /** 加载数据 */
  const loadData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      router.push('/auth/login');
      return;
    }
    setUser(session.user);

    // 并行获取收藏和文件夹
    const [favResult, folderResult] = await Promise.all([
      supabase
        .from('favorites')
        .select('*, prompt:prompts(*, category:categories(*))')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('folders')
        .select('*')
        .eq('user_id', session.user.id)
        .order('sort_order'),
    ]);

    setFavorites(favResult.data || []);
    setFolders(folderResult.data || []);
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /** 创建文件夹 */
  async function handleCreateFolder() {
    if (!newFolderName.trim()) return;
    const { error: insertError } = await supabase.from('folders').insert({
      user_id: user.id,
      name: newFolderName.trim(),
    });
    if (insertError) {
      setError(insertError.message);
    } else {
      setNewFolderName('');
      setShowNewFolder(false);
      loadData();
    }
  }

  /** 删除文件夹 */
  async function handleDeleteFolder(folderId: number) {
    if (!confirm('Delete this folder? Favorites inside will become uncategorized.')) return;
    await supabase.from('folders').delete().eq('id', folderId);
    setSelectedFolder(null);
    loadData();
  }

  /** 移动收藏到文件夹 */
  async function handleMoveToFolder(favoriteId: number, folderId: number | null) {
    await supabase
      .from('favorites')
      .update({ folder_id: folderId })
      .eq('id', favoriteId);
    loadData();
  }

  /** 取消收藏 */
  async function handleRemoveFavorite(favoriteId: number) {
    await supabase.from('favorites').delete().eq('id', favoriteId);
    loadData();
  }

  // 筛选当前选中文件夹的收藏
  const filteredFavorites = selectedFolder === null
    ? favorites
    : favorites.filter((f) => f.folder_id === selectedFolder);

  if (loading) {
    return (
      <div className="container-page py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-slate-200 dark:bg-dark-700 rounded" />
          <div className="h-64 bg-slate-200 dark:bg-dark-700 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      {/* 页头 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="page-title text-slate-900 dark:text-white">
            My Favorites
          </h1>
          <p className="page-subtitle">{favorites.length} saved prompts</p>
        </div>
        <button
          onClick={() => setShowNewFolder(true)}
          className="btn-primary text-sm"
        >
          <FolderPlus className="w-4 h-4" />
          New Folder
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400 mb-4">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        {/* ---- 文件夹侧边栏 ---- */}
        <aside className="w-full lg:w-56 shrink-0">
          <div className="card p-3">
            <button
              onClick={() => setSelectedFolder(null)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedFolder === null
                  ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 font-medium'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-700'
              }`}
            >
              <Folder className="w-4 h-4" />
              All Favorites
              <span className="ml-auto text-xs opacity-60">{favorites.length}</span>
            </button>

            <hr className="my-2 border-slate-200 dark:border-dark-700" />

            {folders.map((folder) => {
              const count = favorites.filter((f) => f.folder_id === folder.id).length;
              return (
                <div key={folder.id} className="group flex items-center">
                  <button
                    onClick={() => setSelectedFolder(folder.id)}
                    className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedFolder === folder.id
                        ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 font-medium'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-700'
                    }`}
                  >
                    <Folder className="w-4 h-4" />
                    <span className="truncate">{folder.name}</span>
                    <span className="ml-auto text-xs opacity-60">{count}</span>
                  </button>
                  <button
                    onClick={() => handleDeleteFolder(folder.id)}
                    className="p-1 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all"
                    title="Delete folder"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}

            {/* 新建文件夹输入 */}
            {showNewFolder && (
              <div className="mt-2 p-2 bg-slate-50 dark:bg-dark-700 rounded-lg">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder name..."
                  className="input text-xs mb-2"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateFolder();
                    if (e.key === 'Escape') setShowNewFolder(false);
                  }}
                />
                <div className="flex gap-1.5">
                  <button
                    onClick={handleCreateFolder}
                    className="flex-1 btn-primary text-xs py-1.5"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowNewFolder(false)}
                    className="btn-ghost text-xs py-1.5"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ---- 收藏列表 ---- */}
        <div className="flex-1">
          {filteredFavorites.length > 0 ? (
            <div className="space-y-3">
              {filteredFavorites.map((fav) => (
                <div key={fav.id} className="card p-4 flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/prompts/${fav.prompt?.slug || fav.prompt_id}`}
                      className="font-semibold text-slate-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                    >
                      {fav.prompt?.title || `Prompt #${fav.prompt_id}`}
                    </Link>
                    {fav.prompt?.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                        {fav.prompt.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                      {fav.prompt?.category && (
                        <span className="badge-primary">{fav.prompt.category.name}</span>
                      )}
                      <span>Saved {formatDate(fav.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* 移动到文件夹 */}
                    <select
                      value={fav.folder_id || ''}
                      onChange={(e) =>
                        handleMoveToFolder(fav.id, e.target.value ? parseInt(e.target.value) : null)
                      }
                      className="input text-xs w-32 py-1.5"
                    >
                      <option value="">Uncategorized</option>
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>

                    {/* 查看详情 */}
                    <Link
                      href={`/prompts/${fav.prompt?.slug || fav.prompt_id}`}
                      className="btn-ghost p-2"
                      title="View prompt"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>

                    {/* 移除收藏 */}
                    <button
                      onClick={() => handleRemoveFavorite(fav.id)}
                      className="btn-ghost p-2 text-red-400 hover:text-red-600"
                      title="Remove from favorites"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Heart className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                {selectedFolder === null
                  ? 'No favorites yet'
                  : 'Empty folder'}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                {selectedFolder === null
                  ? 'Browse prompts and click the heart to save them here.'
                  : 'Move favorites to this folder from the main list.'}
              </p>
              {selectedFolder === null && (
                <Link href="/prompts" className="btn-primary text-sm">
                  <Copy className="w-4 h-4" />
                  Explore Prompts
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
