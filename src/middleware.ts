// ============================================================
// 小精霊 落地页 - 中间件（纯放行）
// 原 PromptHub auth 中间件会调 Supabase 刷新 session，导致公共页 500，
// 小精灵是纯落地页、无需页面级登录，故改为直接放行。
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // /admin/* 打标记（管理后台壳层判断用，保留但不阻塞）
  const requestHeaders = new Headers(request.headers);
  if (request.nextUrl.pathname.startsWith('/admin')) {
    requestHeaders.set('x-admin', '1');
  }
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
