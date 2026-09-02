// ============================================================
// GET /api/health - 后台自检：Supabase 配置与连通性
//   返回 url（公开）+ 是否有 key + Supabase 是否可达
// ============================================================

import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const hasUrl = !!url;
  const hasKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  const info: Record<string, unknown> = {
    ok: hasUrl && hasKey,
    url: hasUrl ? url : null,
    has_url: hasUrl,
    has_key: hasKey,
  };

  if (hasUrl) {
    try {
      const r = await fetch(`${url.replace(/\/$/, '')}/auth/v1/health`);
      info.supabase_http = r.status;
      info.supabase_ok = r.ok;
    } catch (e) {
      info.supabase_http = 'unreachable';
      info.supabase_err = (e as Error).message;
    }
  }

  return NextResponse.json(info);
}
