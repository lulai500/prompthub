// ============================================================
// PromptHub - Next.js 中间件
// 用于自动刷新 Supabase 认证 session
// 每个请求经过中间件时，会检查并刷新过期 token
// ============================================================

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // 如果 Supabase 环境变量未配置，跳过中间件处理
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes('your-project')) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(url, key, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        // 中间件设置 cookie 到 response
        response.cookies.set({
          name,
          value,
          ...options,
        });
      },
      remove(name: string, options: CookieOptions) {
        response.cookies.set({
          name,
          value: '',
          ...options,
          maxAge: 0,
        });
      },
    },
  });

  // 刷新 session（如果 token 即将过期）
  // 这确保用户登录状态在不同页面间保持一致
  await supabase.auth.getSession();

  return response;
}

/**
 * 中间件匹配规则
 * 排除静态资源和 API 路由（API 有自己的 auth 处理）
 */
export const config = {
  matcher: [
    /*
     * 匹配所有路径除了：
     * - _next/static (静态文件)
     * - _next/image (图片优化)
     * - favicon.ico
     * - public 目录文件
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
