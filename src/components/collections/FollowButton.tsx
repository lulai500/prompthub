'use client';
// ============================================================
// 关注收藏集按钮
// 登录用户关注/取消关注公开收藏集 → 网络效应第二层（订阅他人精选）
// 未登录点击跳登录页
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark, BookmarkCheck, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Props {
  collectionId: number;
}

export default function FollowButton({ collectionId }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [following, setFollowing] = useState(false);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const [{ count }, mine] = await Promise.all([
      supabase
        .from('collection_followers')
        .select('id', { count: 'exact' })
        .eq('collection_id', collectionId),
      session?.user
        ? supabase
            .from('collection_followers')
            .select('id')
            .eq('collection_id', collectionId)
            .eq('user_id', session.user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    setCount(count || 0);
    setFollowing(!!mine?.data);
    setLoaded(true);
  }, [collectionId, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      router.push('/auth/login');
      return;
    }
    setBusy(true);
    if (following) {
      await supabase
        .from('collection_followers')
        .delete()
        .eq('collection_id', collectionId)
        .eq('user_id', session.user.id);
      setCount((c) => Math.max(0, c - 1));
      setFollowing(false);
    } else {
      await supabase
        .from('collection_followers')
        .insert({ collection_id: collectionId, user_id: session.user.id })
        .select();
      setCount((c) => c + 1);
      setFollowing(true);
    }
    setBusy(false);
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={toggle}
        disabled={!loaded || busy}
        className={following ? 'btn-primary text-sm px-4 py-2' : 'btn-secondary text-sm px-4 py-2'}
        title={following ? 'Unfollow this collection' : 'Follow this collection'}
      >
        {busy ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : following ? (
          <BookmarkCheck className="w-4 h-4" />
        ) : (
          <Bookmark className="w-4 h-4" />
        )}
        {following ? 'Following' : 'Follow'}
      </button>
      <span className="text-sm text-slate-500 dark:text-slate-400">
        {count} follower{count !== 1 ? 's' : ''}
      </span>
    </div>
  );
}
