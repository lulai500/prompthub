// ============================================================
// PromptHub - 动态 OG 图生成
// 用于详情页分享到 X / Reddit / Slack 时展示卡片图
// 使用 Next.js 内置 ImageResponse（next/og），无额外依赖
// 用法：/api/og?title=...&category=...&model=...
// ============================================================

import { ImageResponse } from 'next/og';

// 使用 Edge runtime：避免 next/og 在 Windows 非 ASCII 路径下
// 加载默认 Noto 字体时的 fileURLToPath 崩溃（Vercel 上同样可用）
export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') || 'PromptHub';
  const category = searchParams.get('category') || 'AI Prompt';
  const model = searchParams.get('model') || '';

  // 标题截断，避免溢出卡片
  const displayTitle = title.length > 55 ? title.slice(0, 55) + '…' : title;

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
          color: '#f8fafc',
          fontFamily: 'sans-serif',
          padding: '64px 72px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '100%',
            height: '100%',
          }}
        >
          {/* 顶部：分类徽章 + 适配模型 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                display: 'flex',
                background: '#6366f1',
                borderRadius: '999px',
                padding: '10px 22px',
                fontSize: '22px',
                fontWeight: 600,
              }}
            >
              {category}
            </div>
            {model && (
              <div style={{ fontSize: '20px', color: '#94a3b8' }}>{model}</div>
            )}
          </div>

          {/* 中间：标题 */}
          <div style={{ fontSize: '52px', fontWeight: 800, lineHeight: 1.15, maxWidth: '1000px' }}>
            {displayTitle}
          </div>

          {/* 底部：品牌 */}
          <div style={{ display: 'flex', fontSize: '24px', color: '#94a3b8' }}>
            <span style={{ fontWeight: 700, color: '#a5b4fc' }}>PromptHub</span>
            <span style={{ margin: '0 12px' }}>·</span>
            <span>Tested AI prompts, skills &amp; workflows — free &amp; open-source</span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
