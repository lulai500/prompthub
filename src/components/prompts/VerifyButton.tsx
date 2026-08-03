'use client';
// ============================================================
// "我测试过"验证按钮
// - 未登录用户：提示登录
// - 已登录用户：切换验证状态，累积验证数（tested 叙事）
// ============================================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BadgeCheck } from 'lucide-react';
import { track } from '@vercel/analytics';
import { createClient } from '@/lib/supabase/client';

interface VerifyButtonProps {
  promptId: number;
  /** 服务端预取的初始验证数 */
  initialCount: number;
}

export default function VerifyButton({ promptId, initialCount }: VerifyButtonProps) {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<any>(null);
  const [verified, setVerified] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkVerified();
  }, [promptId]);

  /** 检查当前用户是否已验证该提示词 */
  async function checkVerified() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      const { data } = await supabase
        .from('verifications')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('prompt_id', promptId)
        .maybeSingle();
      setVerified(!!data);
    }
    setLoading(false);
  }

  /** 切换验证状态 */
  async function toggleVerify() {
    if (!user) {
      // 未登录 → 跳转登录页
      router.push('/auth/login');
      return;
    }

    setLoading(true);
    if (verified) {
      // 取消验证
      await supabase
        .from('verifications')
        .delete()
        .eq('user_id', user.id)
        .eq('prompt_id', promptId);
      setVerified(false);
      setCount((c) => Math.max(0, c - 1));
      track('prompt_verify', { prompt_id: promptId, action: 'remove' });
    } else {
      // 添加验证
      await supabase.from('verifications').insert({
        user_id: user.id,
        prompt_id: promptId,
      });
      setVerified(true);
      setCount((c) => c + 1);
      track('prompt_verify', { prompt_id: promptId, action: 'add' });
    }
    setLoading(false);
  }

  return (
    <button
      onClick={toggleVerify}
      disabled={loading}
      className={`btn text-sm w-full ${
        verified
          ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30'
          : 'btn-secondary'
      }`}
      title={
        user
          ? verified
            ? 'Remove your verification'
            : 'Mark this prompt as tested'
          : 'Sign in to verify this prompt'
      }
    >
      <BadgeCheck
        className={`w-4 h-4 ${verified ? 'fill-current' : ''}`}
      />
      {verified ? 'Tested by me' : 'I tested this'} · {count}
    </button>
  );
}
