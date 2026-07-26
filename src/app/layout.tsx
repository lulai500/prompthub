// ============================================================
// PromptHub - 根布局组件
// 包含：全局 HTML 结构、字体、页头、页脚、主题初始化脚本
// ============================================================

import type { Metadata } from 'next';
import './globals.css';
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
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* 防止页面加载时的主题闪烁 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'light') {
                    document.documentElement.classList.remove('dark');
                  } else {
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
