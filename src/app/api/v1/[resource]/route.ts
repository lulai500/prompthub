// ============================================================
// GET /api/v1/[resource]  — 列出资产（只读公开 API）
// resource ∈ prompts | skills | workflows
// 参数：category / tag / search / limit(≤100) / offset
// 限流：30 次/分钟/IP
// ============================================================

import { NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { VALID_RESOURCES, publicAssetRow, type ApiResource } from '@/lib/public-api';

export async function GET(
  request: Request,
  { params }: { params: { resource: string } }
) {
  const { resource } = params;
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

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10) || 20, 1), 100);
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);
  const category = searchParams.get('category') || '';
  const tag = searchParams.get('tag') || '';
  const search = searchParams.get('search') || '';

  const supabase = createAnonClient();
  let q = supabase
    .from(resource)
    .select('*', { count: 'exact' })
    .eq('is_published', true);

  if (tag) q = q.contains('tags', [tag]);
  if (search) q = q.or(`title.ilike.%${search}%,description.ilike.%${search}%`);

  // 分类筛选（各资源用对应分类表）
  if (category) {
    const catTable =
      resource === 'prompts'
        ? 'categories'
        : resource === 'skills'
        ? 'skill_categories'
        : 'workflow_categories';
    const { data: cat } = await supabase.from(catTable).select('id').eq('slug', category).single();
    if (cat) q = q.eq('category_id', cat.id);
  }

  const { data, count } = await q
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  return NextResponse.json({
    data: (data || []).map((r) => publicAssetRow(resource as ApiResource, r)),
    meta: { count: count || 0, limit, offset },
  });
}
