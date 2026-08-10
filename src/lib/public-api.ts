// ============================================================
// PromptHub - Public API 助手
// 只读 JSON API，供开发者/自己的 AI 工具查询资产
// 全站免费：所有资源（prompts/skills/workflows）返回完整内容
// ============================================================

export type ApiResource = 'prompts' | 'skills' | 'workflows';

export const VALID_RESOURCES: ApiResource[] = ['prompts', 'skills', 'workflows'];

/**
 * 全站免费：直接返回完整行（prompts/skills/workflows 均含正文/步骤/配置/示例）
 */
export function publicAssetRow(_resource: ApiResource, row: Record<string, any>) {
  return row;
}
