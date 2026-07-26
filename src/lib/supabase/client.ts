// ============================================================
// PromptHub - Supabase 浏览器端客户端
// 用于客户端组件（'use client'）中的 Supabase 操作
// 如：用户登录注册、收藏操作、实时数据订阅
// ============================================================

import { createBrowserClient } from '@supabase/ssr';

/**
 * 创建 Supabase 浏览器客户端
 * 如果环境变量未配置则返回 null，调用方需做空值检查
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // 环境变量缺失时返回 null，避免构建崩溃
  if (!url || !key || url.includes('your-project')) {
    return null;
  }

  return createBrowserClient(url, key);
}
