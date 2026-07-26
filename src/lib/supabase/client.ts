// ============================================================
// PromptHub - Supabase 浏览器端客户端
// 用于客户端组件（'use client'）中的 Supabase 操作
// 如：用户登录注册、收藏操作、实时数据订阅
// ============================================================

import { createBrowserClient } from '@supabase/ssr';

/**
 * 创建 Supabase 浏览器客户端（单例模式）
 * 在客户端组件中使用，自动处理 session 持久化
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
