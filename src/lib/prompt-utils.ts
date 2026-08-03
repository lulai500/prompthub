// ============================================================
// PromptHub - 提示词工具函数
// 变量提取/填充 + Token 估算
// 同时支持 {var} 与 {{var}} 两种占位符格式
// ============================================================

/** 提取提示词中的变量占位符（去重，保序） */
export function extractVariables(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/\{\{?\s*([a-zA-Z0-9_]+)\s*\}?\}/g) || [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const m of matches) {
    const name = m.replace(/[{}]/g, '').trim();
    if (!seen.has(name)) {
      seen.add(name);
      result.push(name);
    }
  }
  return result;
}

/** 用变量值填充提示词；未提供的变量保留原占位符，便于用户看出缺口 */
export function fillVariables(text: string, values: Record<string, string>): string {
  if (!text) return text;
  return text.replace(/\{\{?\s*([a-zA-Z0-9_]+)\s*\}?\}/g, (match, name: string) => {
    const value = values[name];
    return value !== undefined && value !== '' ? value : match;
  });
}

/**
 * 估算 token 数（近似值，非精确 tokenizer）
 * 英文/数字/符号 ≈ 4 字符/token；中日韩 ≈ 1.7 字符/token
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  const cjk = (text.match(/[一-鿿぀-ヿ가-힯]/g) || []).length;
  const other = text.length - cjk;
  return Math.max(1, Math.ceil(other / 4 + cjk / 1.7));
}
