// ============================================================
// 小精霊 - Supabase 后台客户端（service_role，绕过 RLS）
// 仅用于服务端 API Route Handler；绝不可在前端调用
// ============================================================

import { createClient } from '@supabase/supabase-js';

export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('缺少 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 环境变量');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
