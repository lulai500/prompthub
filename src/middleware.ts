// ============================================================
// PromptHub - Next.js 中间件
// 用于自动刷新 Supabase 认证 session
// 每个请求经过中间件时，会检查并刷新过期 token
// ============================================================

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    }
  );

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
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public directory files
     * - API routes (api/) — these handle their own auth
     */
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
