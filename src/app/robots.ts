// ============================================================
// PromptHub - robots.txt
// 放行全站收录，禁止私有/接口路径；指向 sitemap
// ============================================================

import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://prompthub.app';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard', // 个人中心（私有）
          '/auth/', // 登录/注册/重置（无索引价值）
          '/api/', // API 路由
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
