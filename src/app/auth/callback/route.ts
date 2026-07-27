// ============================================================
// Supabase Auth 回调处理
// 处理邮箱验证、密码重置等回调请求
// ============================================================

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  // 从 URL 获取 auth code
  const code = requestUrl.searchParams.get('code');
  const type = requestUrl.searchParams.get('type'); // 'reset' for password reset

  if (code) {
    const supabase = createServerSupabaseClient();
    // 将 auth code 交换为 session
    await supabase.auth.exchangeCodeForSession(code);
  }

  // 密码重置 → 重定向到修改密码页面
  // 登录验证 → 重定向到 dashboard
  const redirectTo = type === 'reset'
    ? '/auth/reset-password'
    : '/dashboard';

  return NextResponse.redirect(new URL(redirectTo, requestUrl.origin));
}
