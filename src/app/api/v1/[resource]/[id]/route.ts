// ============================================================
// GET /api/v1/[resource]/[id]  — 单个资产（只读公开 API）
// id 支持数字 id 或 slug；全站免费，所有资源返回完整内容
// ============================================================

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { VALID_RESOURCES, publicAssetRow, type ApiResource } from '@/lib/public-api';

export async function GET(
  request: Request,
  { params }: { params: { resource: string; id: string } }
) {
  const { resource, id } = params;
  if (!VALID_RESOURCES.includes(resource as ApiResource)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // 限流
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = checkRateLimit(`api:${ip}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again in a minute.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  const supabase = createAdminClient();
  const isNumeric = /^\d+$/.test(id);
  let q = supabase.from(resource).select('*').eq('is_published', true);
  if (isNumeric) {
    q = q.eq('id', parseInt(id, 10));
  } else {
    q = q.eq('slug', id);
  }

  const { data } = await q.single();
  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ data: publicAssetRow(resource as ApiResource, data) });
}
