'use client';
// ============================================================
// 账号设置页面
// 支持修改用户名、个人简介、头像链接
// ============================================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Save, ArrowLeft, Shield, Crown, Clock } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getMembershipLabel } from '@/lib/utils';
import type { Profile } from '@/types';

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // 表单字段
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  /** 加载 profile */
  async function loadProfile() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      router.push('/auth/login');
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (data) {
      setProfile(data);
      setUsername(data.username || '');
      setBio(data.bio || '');
      setAvatarUrl(data.avatar_url || '');
    }
    setLoading(false);
  }

  /** 保存设置 */
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!username.trim()) {
      setError('Username cannot be empty.');
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        username: username.trim(),
        bio: bio.trim(),
        avatar_url: avatarUrl.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile!.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="container-page py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-slate-200 dark:bg-dark-700 rounded" />
          <div className="h-96 bg-slate-200 dark:bg-dark-700 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      {/* 返回链接 */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <div className="max-w-2xl">
        <h1 className="page-title text-slate-900 dark:text-white mb-6">
          Account Settings
        </h1>

        {/* 会员状态卡片 */}
        <div className="card p-5 mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              profile?.membership_tier === 'free'
                ? 'bg-slate-100 dark:bg-dark-700'
                : 'bg-yellow-100 dark:bg-yellow-900/20'
            }`}>
              {profile?.membership_tier === 'free' ? (
                <User className="w-5 h-5 text-slate-500" />
              ) : (
                <Crown className="w-5 h-5 text-yellow-500" />
              )}
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">
                {getMembershipLabel(profile?.membership_tier || 'free')}
              </p>
              {profile?.membership_tier === 'free' ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Free plan - Unlimited favorites included
                </p>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {profile?.membership_expires_at
                    ? `Expires: ${new Date(profile.membership_expires_at).toLocaleDateString()}`
                    : 'Active subscription'}
                </p>
              )}
            </div>
            {profile?.membership_tier === 'free' && (
              <Link href="/pricing" className="btn-secondary text-xs ml-auto">
                <Crown className="w-3.5 h-3.5" />
                Upgrade
              </Link>
            )}
          </div>
        </div>

        {/* 编辑表单 */}
        <form onSubmit={handleSave} className="card p-6 space-y-5">
          {/* 成功消息 */}
          {message && (
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-600 dark:text-green-400">
              {message}
            </div>
          )}
          {/* 错误消息 */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* 头像预览 */}
          {avatarUrl && (
            <div className="flex items-center gap-3">
              <img
                src={avatarUrl}
                alt="Avatar"
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-full object-cover border-2 border-brand-500"
              />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Avatar preview
              </p>
            </div>
          )}

          {/* 用户名 */}
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input"
              required
            />
          </div>

          {/* 头像链接 */}
          <div>
            <label
              htmlFor="avatar"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Avatar URL
            </label>
            <input
              id="avatar"
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              className="input"
            />
          </div>

          {/* 个人简介 */}
          <div>
            <label
              htmlFor="bio"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Bio
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Tell us about yourself..."
              className="input resize-none"
            />
          </div>

          {/* 邮箱（只读） */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Email
            </label>
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={profile?.id ? '' : ''}
                placeholder="your@email.com"
                className="input bg-slate-50 dark:bg-dark-900 text-slate-400 cursor-not-allowed"
                disabled
              />
              <Shield className="w-4 h-4 text-slate-400 shrink-0" />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Email is managed by Supabase Auth and cannot be changed here.
            </p>
          </div>

          {/* 提交 */}
          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <Link href="/dashboard" className="btn-ghost text-sm">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
