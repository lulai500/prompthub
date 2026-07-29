// ============================================================
// 用户公开主页
// 显示用户信息和其贡献的所有提示词
// ============================================================

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User, Calendar, Sparkles } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';
import PromptCard from '@/components/prompts/PromptCard';
import type { ProfilePublic, Prompt } from '@/types';

export const dynamic = 'force-dynamic';

interface Props {
  params: { username: string };
}

export default async function UserProfilePage({ params }: Props) {
  const supabase = createServerSupabaseClient();
  const { username } = params;

  // 查找用户
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .or(`username.eq.${username},id.eq.${username}`)
    .single();

  if (!profile) {
    notFound();
  }

  const userInfo: ProfilePublic = {
    id: profile.id,
    username: profile.username,
    avatar_url: profile.avatar_url,
    bio: profile.bio,
    created_at: profile.created_at,
  };

  // 获取用户的提示词
  const { data: prompts, count } = await supabase
    .from('prompts')
    .select('*, category:categories(*)', { count: 'exact' })
    .eq('author_id', profile.id)
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  const userPrompts: Prompt[] = prompts || [];

  return (
    <div className="container-page py-10">
      <Link
        href="/prompts"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-brand-600 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to prompts
      </Link>

      {/* 用户信息卡片 */}
      <div className="card p-6 mb-8">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
            <span className="text-2xl font-bold text-brand-600 dark:text-brand-400">
              {(userInfo.username || 'A')[0].toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {userInfo.username || 'Anonymous'}
            </h1>
            {userInfo.bio && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {userInfo.bio}
              </p>
            )}
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-400 dark:text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Joined {formatDate(userInfo.created_at)}
              </span>
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                {count || 0} prompt{count !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 用户的提示词列表 */}
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        Contributions
      </h2>

      {userPrompts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {userPrompts.map((prompt) => (
            <PromptCard key={prompt.id} prompt={prompt} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <User className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">
            No prompts published yet.
          </p>
        </div>
      )}
    </div>
  );
}
