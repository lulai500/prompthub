// ============================================================
// PromptHub - 根布局组件
// 包含：全局 HTML 结构、字体、页头、页脚、主题初始化脚本
// ============================================================

import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import dynamic from 'next/dynamic';
import './globals.css';
import Footer from '@/components/layout/Footer';

// 禁用 Header 的 SSR，彻底消除其水合错误
const Header = dynamic(() => import('@/components/layout/Header'), { ssr: false });

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

  return (
    <html lang="en" className={htmlClass} suppressHydrationWarning>
      <head>
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
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
