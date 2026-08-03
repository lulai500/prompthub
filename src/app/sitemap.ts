// ============================================================
// PromptHub - 站点地图 (sitemap.xml)
// 动态生成：静态页 + 分类页 + 全部已发布提示词详情页
// 三支柱扩展后，此处会追加 /skills 与 /workflows 详情页
// ============================================================

import type { MetadataRoute } from 'next';
import { createAnonClient } from '@/lib/supabase/server';

// 每次请求实时生成，避免 build 阶段依赖数据库环境变量
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://prompthub.app';

  // ---- 静态页面 ----
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/prompts`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/pricing`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/submit`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.4 },
    { url: `${baseUrl}/feedback`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ];

  // ---- 分类页 ----
  // 使用 anon 只读客户端（公开数据），不依赖 service role key
  const supabase = createAnonClient();
  const { data: categories } = await supabase.from('categories').select('slug');
  const categoryRoutes: MetadataRoute.Sitemap = (categories || []).map((c) => ({
    url: `${baseUrl}/prompts?category=${c.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  // ---- 全部已发布提示词详情页 ----
  const { data: prompts } = await supabase
    .from('prompts')
    .select('slug, updated_at')
    .eq('is_published', true);
  const promptRoutes: MetadataRoute.Sitemap = (prompts || []).map((p) => ({
    url: `${baseUrl}/prompts/${p.slug}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  return [...staticRoutes, ...categoryRoutes, ...promptRoutes];
}
