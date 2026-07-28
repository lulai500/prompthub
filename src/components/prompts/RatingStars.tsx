'use client';
// ============================================================
// 星级评分组件
// - 未登录 → 显示平均分（只读）
// - 已登录 → 可点击评分
// ============================================================

import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface RatingStarsProps {
  promptId: number;
  /** 初始平均分（来自服务端） */
  initialAvgRating?: number;
  /** 初始评分人数 */
  initialRatingCount?: number;
}

export default function RatingStars({
  promptId,
  initialAvgRating = 0,
  initialRatingCount = 0,
}: RatingStarsProps) {
  const supabase = createClient();

  const [user, setUser] = useState<any>(null);
  const [userRating, setUserRating] = useState(0);   // 当前用户的评分 (0=未评)
  const [avgRating, setAvgRating] = useState(initialAvgRating);
  const [ratingCount, setRatingCount] = useState(initialRatingCount);
  const [hoverRating, setHoverRating] = useState(0);  // 悬停预览
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    init();
  }, [promptId]);

  async function init() {
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUser = sessionData.session?.user;
    setUser(currentUser || null);

    if (currentUser) {
      // 查询当前用户是否已评分
      const { data } = await supabase
        .from('ratings')
        .select('rating')
        .eq('user_id', currentUser.id)
        .eq('prompt_id', promptId)
        .maybeSingle();
      if (data) {
        setUserRating(data.rating);
      }
    }

    // 获取最新统计数据
    const { data: stats } = await supabase
      .from('prompt_stats')
      .select('avg_rating, rating_count')
      .eq('prompt_id', promptId)
      .single();
    if (stats) {
      setAvgRating(Number(stats.avg_rating) || 0);
      setRatingCount(stats.rating_count || 0);
    }

    setLoading(false);
  }

  async function handleRate(rating: number) {
    if (!user || loading) return;

    setLoading(true);
    setUserRating(rating);

    // Upsert: 插入或更新评分
    const { error } = await supabase
      .from('ratings')
      .upsert({
        user_id: user.id,
        prompt_id: promptId,
        rating,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,prompt_id',
      });

    if (error) {
      console.error('Rating error:', error);
      setUserRating(0);
    } else {
      // 重新获取最新统计数据
      const { data: stats } = await supabase
        .from('prompt_stats')
        .select('avg_rating, rating_count')
        .eq('prompt_id', promptId)
        .single();
      if (stats) {
        setAvgRating(Number(stats.avg_rating) || 0);
        setRatingCount(stats.rating_count || 0);
      }
    }

    setLoading(false);
  }

  const displayRating = hoverRating || userRating || avgRating;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!user || loading}
            onClick={() => handleRate(star)}
            onMouseEnter={() => user && setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className={`transition-colors ${
              user ? 'cursor-pointer hover:scale-110' : 'cursor-default'
            } transition-transform`}
            title={user ? `Rate ${star} star${star !== 1 ? 's' : ''}` : 'Sign in to rate'}
          >
            <Star
              className={`w-5 h-5 ${
                star <= displayRating
                  ? 'text-yellow-400 fill-yellow-400'
                  : 'text-slate-300 dark:text-slate-600'
              } ${user ? 'hover:text-yellow-400 hover:fill-yellow-400' : ''}`}
            />
          </button>
        ))}
        <span className="ml-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
          {avgRating > 0 ? avgRating.toFixed(1) : '—'}
        </span>
      </div>
      <p className="text-xs text-slate-400 dark:text-slate-500">
        {ratingCount > 0
          ? `${ratingCount} rating${ratingCount !== 1 ? 's' : ''}`
          : 'No ratings yet'}
        {userRating > 0 && ` · You rated ${userRating} star${userRating !== 1 ? 's' : ''}`}
        {!user && ' · Sign in to rate'}
      </p>
    </div>
  );
}

/** 只读评分展示（用于卡片列表） */
export function RatingDisplay({
  avgRating = 0,
  ratingCount = 0,
}: {
  avgRating?: number;
  ratingCount?: number;
}) {
  if (ratingCount === 0) return null;

  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-slate-400 dark:text-slate-500">
      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
      {avgRating.toFixed(1)}
    </span>
  );
}
