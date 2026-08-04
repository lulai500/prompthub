// ============================================================
// PromptHub - 通用工具函数
// ============================================================

import { type ClassValue, clsx } from 'clsx';

/**
 * 合并 CSS 类名（支持条件类名）
 * 用法：cn('text-white', isActive && 'font-bold', 'p-4')
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/**
 * 格式化日期为友好显示
 * @param dateString ISO 日期字符串
 * @returns 例如 "2024-07-24"
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * 截断文本并添加省略号
 * @param text 原始文本
 * @param maxLength 最大长度
 * @returns 截断后的文本
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '...';
}

/**
 * 复制文本到剪贴板
 * @param text 要复制的文本
 * @returns 是否复制成功
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // 降级方案：使用旧版 API
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }
}

/**
 * 将文本作为文件下载（客户端 Blob，无需服务端）
 * @param filename 文件名（含扩展名）
 * @param text 文本内容
 */
export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 会员等级对应的显示名称
 */
export function getMembershipLabel(tier: string): string {
  const labels: Record<string, string> = {
    free: 'Free',
    monthly: 'Pro Monthly',
    quarterly: 'Pro Quarterly',
    yearly: 'Pro Yearly',
  };
  return labels[tier] || 'Free';
}

/**
 * 会员套餐价格（美元）
 */
export const PRICING_PLANS = {
  monthly: { price: 9.99, period: 'month', label: 'Monthly' },
  quarterly: { price: 24.99, period: 'quarter', label: 'Quarterly' },
  yearly: { price: 59.99, period: 'year', label: 'Yearly' },
} as const;

/**
 * 从提示词标题生成 slug
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
}
