// ============================================================
// PromptHub - 模型成本估算
// 价格 = 每百万输入 token 的美元价格（近似值，用于展示）
// ⚠️ 价格随厂商调整，上线前请核对并在此处更新
// ============================================================

/** 常见模型每百万输入 token 价格（USD） */
export const MODEL_PRICING: Record<string, number> = {
  'GPT-4o': 2.5,
  'GPT-4.1': 2.0,
  'GPT-4.1-mini': 0.4,
  'Claude 3.5 Sonnet': 3.0,
  'Claude 3.7 Sonnet': 3.0,
  'Claude 3 Opus': 15.0,
  'Gemini 1.5 Pro': 1.25,
  'Gemini 2.0 Flash': 0.1,
  'Gemini 2.5 Pro': 1.25,
  'DeepSeek V3': 0.27,
  'Llama 3.3 70B': 0.59,
};

/** 未收录模型时的默认价格（USD / 每百万 token） */
const DEFAULT_PRICE_PER_M = 3.0;

/**
 * 估算单次运行的输入成本（USD）
 * @param modelName 模型名（模糊匹配，不区分大小写）
 * @param tokens 输入 token 数
 */
export function estimateCost(modelName: string, tokens: number): number {
  const price =
    Object.entries(MODEL_PRICING).find(([key]) =>
      modelName.toLowerCase().includes(key.toLowerCase())
    )?.[1] ?? DEFAULT_PRICE_PER_M;
  return (tokens / 1_000_000) * price;
}
