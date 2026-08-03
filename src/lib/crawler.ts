// ============================================================
// PromptHub - 搜索引擎 / AI 爬虫识别
// 游客模式对普通访客限制可见数量，但搜索引擎与 AI 摘要爬虫
// 必须能看到全站内容才能被索引。此模块识别主流爬虫 UA。
// 需在 Server Component / Route Handler 中调用。
// ============================================================

import { headers } from 'next/headers';

// 主流搜索引擎 + AI 摘要/索引爬虫
// （含 GPTBot / PerplexityBot / ClaudeBot 等 AI 抓取，确保被 AI 搜索引用）
const CRAWLER_PATTERN =
  /googlebot|google-inspectiontool|googleother|google-extended|bingbot|bingpreview|duckduckbot|baiduspider|yandexbot|sogou|exabot|facebot|facebookexternalhit|whatsapp|twitterbot|linkedinbot|pinterest|slurp|applebot|ia_archiver|yisouspider|seznambot|petalbot|semrushbot|ahrefsbot|mj12bot|dotbot|rogerbot|gptbot|oai-searchbot|chatgpt-user|perplexitybot|perplexity-user|claudebot|claude-web|anthropic-ai|ccbot|bytespider|youbot|diffbot|amazonbot|meta-externalagent|archive\.org_bot/i;

/**
 * 判断当前请求是否来自搜索引擎 / AI 爬虫。
 * 返回 true 时，内容页应展示全量内容（与登录用户一致），
 * 从而让全站提示词/技能/工作流都能被索引。
 */
export function isCrawlerRequest(): boolean {
  const userAgent = headers().get('user-agent') || '';
  return CRAWLER_PATTERN.test(userAgent);
}
