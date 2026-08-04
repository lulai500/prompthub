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

  // 分类筛选（各资源用对应分类表）
  let categoryId: number | null = null;
  if (category) {
    const catTable =
      resource === 'prompts'
        ? 'categories'
        : resource === 'skills'
        ? 'skill_categories'
        : 'workflow_categories';
    const { data: cat } = await supabase.from(catTable).select('id').eq('slug', category).single();
    if (cat) categoryId = cat.id;
  }

  // prompts 搜索 → 全文检索 RPC（相关度排序，复用 GIN 索引）
  if (resource === 'prompts' && search) {
    const page = Math.floor(offset / limit) + 1;
    const { data: hits, error: rpcErr } = await supabase.rpc('search_prompts_fts', {
      p_search: search,
      p_category_id: categoryId,
      p_tag: tag || null,
      p_sort: 'latest',
      p_page: page,
      p_limit: limit,
    });
    if (rpcErr) {
      return NextResponse.json({ error: 'Search unavailable.' }, { status: 500 });
    }
    const ids = (hits || []).map((r: { id: number | string }) => Number(r.id));
    const total = Number((hits as { total?: number }[] | null)?.[0]?.total) || 0;
    if (ids.length === 0) {
      return NextResponse.json({ data: [], meta: { count: 0, limit, offset } });
    }
    const { data } = await supabase.from('prompts').select('*').eq('is_published', true).in('id', ids);
    const byId: Record<number, Record<string, unknown>> = {};
    for (const r of (data || []) as Record<string, unknown>[]) byId[Number(r.id)] = r;
    const ordered = ids.map((id: number) => byId[id]).filter(Boolean) as Record<string, unknown>[];
    return NextResponse.json({
      data: ordered.map((r) => publicAssetRow('prompts', r)),
      meta: { count: total, limit, offset },
    });
  }

  if (categoryId) q = q.eq('category_id', categoryId);

  const { data, count } = await q
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  return NextResponse.json({
    data: (data || []).map((r) => publicAssetRow(resource as ApiResource, r)),
    meta: { count: count || 0, limit, offset },
  });
}
