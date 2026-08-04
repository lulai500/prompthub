// ============================================================
// PromptHub - Public API 助手
// 只读 JSON API，供开发者/自己的 AI 工具查询资产
// 注意：技能/工作流不暴露完整内容（保护会员付费墙）
// ============================================================

export type ApiResource = 'prompts' | 'skills' | 'workflows';

export const VALID_RESOURCES: ApiResource[] = ['prompts', 'skills', 'workflows'];

/**
 * 按资源类型剥离付费墙字段：
 * - prompts 免费，返回完整内容
 * - skills / workflows 仅返回元数据（标题/描述/标签/格式等），不含正文/步骤/配置/示例
 */
export function publicAssetRow(resource: ApiResource, row: Record<string, any>) {
  if (resource === 'prompts') return row;
  if (resource === 'skills') {
    const { content, install_instructions, example_output, ...rest } = row;
    return rest;
  }
  const { steps, config_content, expected_output, tips, ...rest } = row;
  return rest;
}
