// ============================================================
// PromptHub - Supabase 服务端客户端
// 用于 Server Components 和 API Route Handlers
// 优势：服务端直连数据库，数据 SSR 渲染，SEO 友好
// ============================================================

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * 创建 Supabase 服务端客户端
 * 在 Server Component 中调用，自动读取/写入 Cookie 维护 session
 */
export function createServerSupabaseClient() {
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
 * Get the currently authenticated user (or null if not logged in).
 * Use in Server Components to gate content based on auth state.
 */
export async function getCurrentUser() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * 获取当前用户的会员等级（免费/月/季/年）
 * 游客与免费用户返回 'free'。会员等级控制 Skills/Workflows 内容访问。
 */
export async function getCurrentMembershipTier(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) return 'free';
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from('profiles')
    .select('membership_tier')
    .eq('id', user.id)
    .maybeSingle();
  return data?.membership_tier || 'free';
}

/**
 * 创建 Supabase 管理客户端（使用 Service Role Key）
 * ⚠️ 仅在后端使用！拥有最高数据库权限，绕过 RLS
 * 使用场景：Webhook 处理、管理操作
 */
export function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get() { return undefined; },
        set() {},
        remove() {},
      },
    }
  );
}

/**
 * 创建 Supabase 匿名只读客户端（无需用户会话）
 * 仅能访问 RLS 放行的公开数据（分类、已发布提示词等）。
 * 适用于 sitemap、RSS 等不依赖登录态的服务端场景。
 */
export function createAnonClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get() { return undefined; },
        set() {},
        remove() {},
      },
    }
  );
}
