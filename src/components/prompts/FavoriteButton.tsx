'use client';
// ============================================================
// 收藏按钮组件
// - 未登录用户：提示登录
// - 已登录用户：切换收藏状态
// ============================================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface FavoriteButtonProps {
  promptId: number;
}

export default function FavoriteButton({ promptId }: FavoriteButtonProps) {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<any>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkFavorite();
  }, [promptId]);

  /** 检查当前用户是否已收藏 */
  async function checkFavorite() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      const { data } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('prompt_id', promptId)
        .maybeSingle();
      setIsFavorited(!!data);
    }
    setLoading(false);
  }

  /** 切换收藏 */
  async function toggleFavorite() {
    if (!user) {
      // 未登录 → 跳转登录页
      router.push('/auth/login');
      return;
    }

    setLoading(true);
    if (isFavorited) {
      // 取消收藏
      await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('prompt_id', promptId);
      setIsFavorited(false);
    } else {
      // 添加收藏
      await supabase.from('favorites').insert({
        user_id: user.id,
        prompt_id: promptId,
      });
      setIsFavorited(true);
    }
    setLoading(false);
  }

  return (
    <button
      onClick={toggleFavorite}
      disabled={loading}
      className={`btn text-sm ${
        isFavorited
          ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30'
          : 'btn-secondary'
      }`}
      title={user ? (isFavorited ? 'Remove from favorites' : 'Add to favorites') : 'Sign in to favorite'}
    >
      <Heart
        className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`}
      />
      {isFavorited ? 'Favorited' : 'Favorite'}
    </button>
  );
}
