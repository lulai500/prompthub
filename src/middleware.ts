// ============================================================
// PromptHub — Next.js Middleware
// - Supabase auth session refresh
// - Rate limiting on sensitive routes
// ============================================================

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// ---- In-memory rate limiter (per-function-instance) ----
interface RateLimitEntry {
  count: number;
  resetAt: number;
}
const rateLimitStore = new Map<string, RateLimitEntry>();
let lastCleanup = 0;

function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();

  // Periodic cleanup of expired entries
  if (now - lastCleanup > 60_000) {
    lastCleanup = now;
    rateLimitStore.forEach((v, k) => {
      if (now > v.resetAt) rateLimitStore.delete(k);
    });
  }

  const entry = rateLimitStore.get(key);
  if (!entry || now > entry.resetAt) {
    const newEntry: RateLimitEntry = { count: 1, resetAt: now + windowMs };
    rateLimitStore.set(key, newEntry);
    return { allowed: true, remaining: maxRequests - 1, resetAt: newEntry.resetAt };
  }

  entry.count++;
  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }
  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
}

// Rate limit presets
const LIMITS: Record<string, { max: number; windowMs: number }> = {
  '/auth/login':        { max: 15, windowMs: 60_000 },     // 15 req/min
  '/auth/register':     { max: 10, windowMs: 60_000 },     // 10 req/min
  '/auth/reset-password': { max: 5,  windowMs: 300_000 },   // 5 req/5min
  '/feedback':          { max: 10, windowMs: 300_000 },    // 10 req/5min
  '/submit':            { max: 15, windowMs: 300_000 },    // 15 req/5min
  '/dashboard/settings': { max: 20, windowMs: 60_000 },    // 20 req/min
};

function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // /admin/* 打标记：根布局据此跳过公共页头/页脚（管理后台独立壳层）
  const requestHeaders = new Headers(request.headers);
  if (pathname.startsWith('/admin')) {
    requestHeaders.set('x-admin', '1');
  }
  let response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // ---- Rate limiting for sensitive routes ----
  const limit = LIMITS[pathname];
  if (limit) {
    const ip = getClientIP(request);
    const key = `${ip}:${pathname}`;
    const result = checkRateLimit(key, limit.max, limit.windowMs);

    // Always include rate-limit headers
    response.headers.set('X-RateLimit-Limit', String(limit.max));
    response.headers.set('X-RateLimit-Remaining', String(Math.max(0, result.remaining)));
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));

    if (!result.allowed) {
      return new NextResponse(
        JSON.stringify({
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
            'X-RateLimit-Limit': String(limit.max),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
          },
        }
      );
    }
  }

  // ---- Supabase auth session refresh ----
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options, maxAge: 0 });
        },
      },
    }
  );

  await supabase.auth.getSession();

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
