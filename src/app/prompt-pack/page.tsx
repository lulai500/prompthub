import type { Metadata } from 'next';
import PromptPackBuilder from '@/components/prompt-pack/PromptPackBuilder';

// ============================================================
// 提示词包生成器页面
// 依据《AI提示词包工程化白皮书 V3.0》五层架构在线生成
// 跨模型适配：GPT / Claude / Gemini / DeepSeek
// 登录用户可一键发布到提示词库（待审核）
// ============================================================

export const metadata: Metadata = {
  title: 'Prompt Pack Generator | PromptHub',
  description:
    '在线生成专业提示词包：五层架构（元角色/上下文/认知链路/输出约束/动态变量），适配 GPT、Claude、Gemini、DeepSeek 四大模型，一键发布到提示词库。',
};

export default function PromptPackPage() {
  return <PromptPackBuilder />;
}
