// ============================================================
// PromptHub - 公开数据查询缓存（ISR 化）
// 页面因依赖 cookies（登录态）无法整页 ISR，
// 但公开数据查询可缓存：用 unstable_cache 包一层，
// 相同参数的查询在 revalidate 秒内命中缓存，
// 大幅降低 Supabase 请求量与 TTFB。
// ============================================================

import { unstable_cache } from 'next/cache';
import { createAnonClient } from '@/lib/supabase/server';
import type { Category, Prompt } from '@/types';

// 公开数据缓存时长（秒）：120s = 列表/详情数据最多滞后 2 分钟
const REVALIDATE = 120;

/** 全部分类（首页/列表页共用） */
export const getCachedCategories = unstable_cache(
  async (): Promise<Category[]> => {
    const supabase = createAnonClient();
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });
    return (data || []) as Category[];
  },
  ['categories'],
  { revalidate: REVALIDATE }
);

/** 已发布提示词总数 */
export const getCachedPromptCount = unstable_cache(
  async (): Promise<number> => {
    const supabase = createAnonClient();
    const { count } = await supabase
      .from('prompts')
      .select('*', { count: 'exact', head: true })
      .eq('is_published', true);
    return count || 0;
  },
  ['prompt-count'],
  { revalidate: REVALIDATE }
);

/** 每分类热门提示词（首页，key 含分类 id 与条数） */
export const getCachedPopularPrompts = unstable_cache(
  async (categoryIds: number[], perCategory: number): Promise<Prompt[]> => {
    const supabase = createAnonClient();
    const categoryPromises = categoryIds.map(async (cid) => {
      const { data } = await supabase
        .from('prompts')
        .select('*, category:categories(*)')
        .eq('category_id', cid)
        .eq('is_published', true)
        .order('usage_count', { ascending: false })
        .limit(perCategory);
      return data || [];
    });
    const allResults = await Promise.all(categoryPromises);
    return allResults.flat() as Prompt[];
  },
  ['popular-prompts'],
  { revalidate: REVALIDATE }
);

/** 全局热门补足（首页，key 含已取 id） */
export const getCachedPopularFillers = unstable_cache(
  async (excludeIds: number[], limit: number): Promise<Prompt[]> => {
    const supabase = createAnonClient();
    const { data } = await supabase
      .from('prompts')
      .select('*, category:categories(*)')
      .eq('is_published', true)
      .order('usage_count', { ascending: false })
      .limit(limit * 2);
    const fillers = (data || []).filter((p) => !excludeIds.includes(p.id)).slice(0, limit);
    return fillers as Prompt[];
  },
  ['popular-fillers'],
  { revalidate: REVALIDATE }
);

/** 提示词列表查询（key 含全部筛选参数） */
export const getCachedPromptList = unstable_cache(
  async (params: {
    search: string;
    categoryId: number | null;
    tag: string;
    page: number;
    sort: string;
    limit: number;
  }): Promise<{ data: Prompt[]; count: number }> => {
    const supabase = createAnonClient();
    let query = supabase
      .from('prompts')
      .select('*, category:categories(*)', { count: 'exact' })
      .eq('is_published', true);

    if (params.search) {
      query = query.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%`);
    }
    if (params.categoryId) {
      query = query.eq('category_id', params.categoryId);
    }
    if (params.tag) {
      query = query.contains('tags', [params.tag]);
    }

    const orderColumn = params.sort === 'most_used' ? 'usage_count' : 'created_at';
    const orderAscending = params.sort === 'oldest';

    const from = (params.page - 1) * params.limit;
    const { data, count } = await query
      .order(orderColumn, { ascending: orderAscending })
      .range(from, from + params.limit - 1);

    return { data: (data || []) as Prompt[], count: count || 0 };
  },
  ['prompt-list'],
  { revalidate: REVALIDATE }
);

/** 单条提示词详情（key 含 slug/id） */
export const getCachedPromptDetail = unstable_cache(
  async (id: string): Promise<Prompt | null> => {
    const supabase = createAnonClient();
    const isNumericId = /^\d+$/.test(id);
    let query = supabase
      .from('prompts')
      .select('*, category:categories(*)')
      .eq('is_published', true);
    if (isNumericId) {
      query = query.eq('id', parseInt(id, 10));
    } else {
      query = query.eq('slug', id);
    }
    const { data } = await query.single();
    return (data as Prompt) || null;
  },
  ['prompt-detail'],
  { revalidate: REVALIDATE }
);

/** 提示词统计（评分/收藏数） */
export const getCachedPromptStats = unstable_cache(
  async (promptId: number) => {
    const supabase = createAnonClient();
    const { data } = await supabase
      .from('prompt_stats')
      .select('*')
      .eq('prompt_id', promptId)
      .single();
    return data;
  },
  ['prompt-stats'],
  { revalidate: REVALIDATE }
);

/** 批量提示词统计（列表页，key 含 id 集合） */
export const getCachedPromptStatsBatch = unstable_cache(
  async (promptIds: number[]) => {
    const supabase = createAnonClient();
    const { data } = await supabase
      .from('prompt_stats')
      .select('*')
      .in('prompt_id', promptIds);
    return data || [];
  },
  ['prompt-stats-batch'],
  { revalidate: REVALIDATE }
);

/** Tag 落地页提示词列表（key 含标签） */
export const getCachedTagPrompts = unstable_cache(
  async (tag: string) => {
    const supabase = createAnonClient();
    const { data, count } = await supabase
      .from('prompts')
      .select('*, category:categories(*)', { count: 'exact' })
      .contains('tags', [tag])
      .eq('is_published', true)
      .order('usage_count', { ascending: false })
      .limit(50);
    return { data: data || [], count: count || 0 };
  },
  ['tag-prompts'],
  { revalidate: 300 }
);

/** 全部标签及其数量（Tag 索引页/侧边栏用） */
export const getCachedAllTags = unstable_cache(
  async (): Promise<{ tag: string; count: number }[]> => {
    const supabase = createAnonClient();
    const { data } = await supabase.from('prompts').select('tags').eq('is_published', true);
    const counts: Record<string, number> = {};
    for (const p of data || []) {
      for (const t of p.tags || []) {
        counts[t] = (counts[t] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  },
  ['all-tags'],
  { revalidate: 300 }
);

/** 按任务聚合三支柱资产（key 含任务 slug 与标签） */
export const getCachedTaskAssets = unstable_cache(
  async (taskSlug: string, tags: string[]) => {
    const supabase = createAnonClient();
    const [prompts, skills, workflows] = await Promise.all([
      supabase
        .from('prompts')
        .select('*, category:categories(*)')
        .overlaps('tags', tags)
        .eq('is_published', true)
        .order('usage_count', { ascending: false })
        .limit(12),
      supabase
        .from('skills')
        .select('id, title, slug, skill_format')
        .overlaps('tags', tags)
        .eq('is_published', true)
        .order('usage_count', { ascending: false })
        .limit(6),
      supabase
        .from('workflows')
        .select('id, title, slug, workflow_type')
        .overlaps('tags', tags)
        .eq('is_published', true)
        .order('usage_count', { ascending: false })
        .limit(6),
    ]);
    return {
      prompts: prompts.data || [],
      skills: skills.data || [],
      workflows: workflows.data || [],
    };
  },
  ['task-assets'],
  { revalidate: 300 }
);

/** 跨板块"搭配使用"推荐（提示词 → 技能/工作流，key 含提示词 id 与标签） */
export const getCachedRelatedItems = unstable_cache(
  async (promptId: number, tags: string[]) => {
    const supabase = createAnonClient();
    const [skillsRes, workflowsRes] = await Promise.all([
      supabase
        .from('skills')
        .select('id, title, slug, skill_format')
        .overlaps('tags', tags)
        .eq('is_published', true)
        .limit(3),
      supabase
        .from('workflows')
        .select('id, title, slug, workflow_type')
        .overlaps('tags', tags)
        .eq('is_published', true)
        .limit(3),
    ]);
    return { skills: skillsRes.data || [], workflows: workflowsRes.data || [] };
  },
  ['related-items'],
  { revalidate: REVALIDATE }
);

/** 验证数（"我测试过"） */
export const getCachedVerifyCount = unstable_cache(
  async (promptId: number): Promise<number> => {
    const supabase = createAnonClient();
    const { count } = await supabase
      .from('verifications')
      .select('id', { count: 'exact', head: true })
      .eq('prompt_id', promptId);
    return count || 0;
  },
  ['verify-count'],
  { revalidate: REVALIDATE }
);
