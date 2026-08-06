// ============================================================
// PromptHub - 根布局组件 (v1.2)
// 包含：全局 HTML 结构、字体、页头、页脚、主题初始化脚本
// ============================================================

import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import './globals.css';
import { Analytics } from '@vercel/analytics/react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

// SEO 元数据
export const metadata: Metadata = {
  title: {
    default: 'PromptHub - Discover & Share AI Prompts',
    template: '%s | PromptHub',
  },
  description:
    'Discover, share, and collect the best AI prompts. A community-driven platform for prompt engineers, developers, and AI enthusiasts.',
  keywords: ['AI prompts', 'prompt engineering', 'ChatGPT', 'Claude', 'AI tools'],
  openGraph: {
    title: 'PromptHub - Discover & Share AI Prompts',
    description: 'The ultimate AI prompt sharing platform.',
    type: 'website',
    locale: 'en_US',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 从 cookie 读取主题偏好，确保服务端和客户端渲染一致，消除水合错误
  const cookieStore = cookies();
  const themeCookie = cookieStore.get('theme')?.value;
  // 默认深色主题；只有明确选了 "light" 才用浅色
  const isLight = themeCookie === 'light';
  const htmlClass = isLight ? '' : 'dark';

  // /admin/* 由 middleware 打 x-admin 标记 → 不渲染公共页头/页脚（管理后台独立壳层）
  const isAdmin = headers().get('x-admin') === '1';

  return (
    <html lang="en" className={htmlClass} suppressHydrationWarning>
      <head>
        {/* 禁用 Chrome 自动翻译，防止其修改 DOM 导致 React 水合 insertBefore 错误 */}
        <meta name="google" content="notranslate" />
        {/* 在 JS 可用前立即应用主题，防止白屏闪烁 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('theme');
                  if (stored === 'light') {
                    document.documentElement.classList.remove('dark');
                  } else if (stored === 'dark') {
                    document.documentElement.classList.add('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="flex flex-col min-h-screen">
        {!isAdmin && <Header />}
        <main className="flex-1">{children}</main>
        {!isAdmin && <Footer />}
        {/* Vercel Web Analytics：访问量与页面浏览（本地/未启用时自动 no-op） */}
        <Analytics />
      </body>
    </html>
  );
}
