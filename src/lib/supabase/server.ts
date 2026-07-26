// ============================================================
// PromptHub - Supabase 服务端客户端
// 用于 Server Components 和 API Route Handlers
// 优势：服务端直连数据库，数据 SSR 渲染，SEO 友好
// ============================================================

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * 检查 Supabase 环境变量是否已配置
 */
function hasSupabaseConfig(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !!(url && key && !url.includes('your-project'));
}

/**
 * 创建 Supabase 服务端客户端
 * 在 Server Component 中调用，自动读取/写入 Cookie 维护 session
 * 如果环境变量未配置则返回 null
 */
export function createServerSupabaseClient() {
  if (!hasSupabaseConfig()) return null;

  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // 在 Server Component 中调用 set 可能抛出错误
            // 使用 Middleware 来刷新 session 是更好的做法
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options, maxAge: 0 });
          } catch {
            // 同上
          }
        },
      },
    }
  );
}

/**
 * 创建 Supabase 管理客户端（使用 Service Role Key）
 * ⚠️ 仅在后端使用！拥有最高数据库权限，绕过 RLS
 * 使用场景：Webhook 处理、管理操作
 * 如果环境变量未配置则返回 null
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  return createServerClient(url, key, {
    cookies: {
      get() { return undefined; },
      set() {},
      remove() {},
    },
  });
}
