// ============================================================
// PromptHub - 提示词包生成引擎
// 与桌面版 prompt_pack_generator.py (V3.0) 逐字段同构的 TypeScript 移植
// 依据《AI提示词包工程化白皮书 V3.0》五层架构：
//   L1 元角色与SMART目标 / L2 上下文知识库(边界分隔符)
//   L3 认知链路 CoT / L4 输出约束(硬+软) / L5 动态变量槽位 {{变量名}}
// 跨模型适配：核心逻辑复用 + 格式层适配 (GPT / Claude / Gemini / DeepSeek)
// ============================================================

export type DomainTemplate = {
  description: string;
  co_t: string[];
  constraints: string[];
  output_format: string;
  suggested_variables: string[];
};

// 领域模板库（与桌面 domains/*.json 内容一致）
export const DOMAIN_TEMPLATES: Record<string, DomainTemplate> = {
  编程: {
    description: '逻辑严谨、零幻觉、代码可直接运行',
    co_t: [
      'Step 1: 分析 `{{需求描述}}`，拆解技术难点与数据实体',
      'Step 2: 设计 API 接口规范（请求/响应 Schema）',
      'Step 3: 编写核心业务逻辑（含异常处理与日志）',
      'Step 4: 生成单元测试用例（覆盖正常/边界场景）',
    ],
    constraints: [
      '禁止使用 `except Exception: pass` 静默吞错',
      '敏感信息必须从环境变量读取，严禁硬编码',
      '若第三方库版本不确定，必须主动询问',
      '所有时间字段统一使用 UTC 时区',
    ],
    output_format: '必须包含 4 个 Markdown 代码块：[Schemas]、[Core Logic]、[Tests]、[Demo]',
    suggested_variables: ['需求描述', '编程语言', '框架版本', '数据结构'],
  },
  营销: {
    description: '情感共鸣、触发行动、高转化率',
    co_t: [
      'Step 1 - Attention (钩子): 用反常识或痛点共鸣写开头',
      'Step 2 - Interest (利益): 描述 `{{产品名}}` 如何解决 `{{目标人群痛点}}`',
      'Step 3 - Desire (场景化): 用使用前后对比引发拥有欲',
      'Step 4 - Action (指令): 给出明确的引导话术',
    ],
    constraints: [
      '严禁使用绝对化用语（第一、最好）',
      '如涉及食品/护肤，严禁输出医疗功效',
      '字数严格控制在 `{{字数区间}}` 内，每句话独立成段',
      '规避平台违禁词与极限词',
    ],
    output_format: '结尾必须附带 3-5 个带 `#` 的话题标签，并插入 emoji',
    suggested_variables: ['产品名', '目标人群痛点', '字数区间', '平台'],
  },
  法务: {
    description: '严谨审慎、逐条批注、合规风险提示',
    co_t: [
      'Step 1: 识别合同类型与适用法律',
      'Step 2: 逐条审查风险条款',
      'Step 3: 标注不合规表述并提供修改建议',
      'Step 4: 生成风险等级评估报告',
    ],
    constraints: [
      '严禁提供法律意见，仅做风险提示',
      '引用条款时必须标注原文位置',
      "不确定时明确标注'需人工复核'",
    ],
    output_format: '必须输出包含[风险摘要]、[逐条批注]、[修改建议]三部分的Markdown文档',
    suggested_variables: ['合同类型', '审查重点', '适用法域'],
  },
};

export const MODEL_LIST = ['GPT', 'Claude', 'Gemini', 'DeepSeek'] as const;
export type ModelName = (typeof MODEL_LIST)[number];

// 领域 → prompts 表分类映射（categories: 1 Code Prompt / 2 Novel Writing / 3 Agent LLM / 4 General Prompt）
export const DOMAIN_CATEGORY: Record<string, number> = {
  编程: 1,
  营销: 4,
  法务: 4,
};

export type PackInput = {
  domain: string;
  pack_name: string;
  role_desc: string;
  goal: string;
  context?: string;
  variables: Record<string, string>;
};

type CoreContent = {
  role: string;
  context: string;
  task: string;
  constraints: string;
  format: string;
  variables: string;
};

function varPh(name: string): string {
  return '{{' + name + '}}';
}

/** L1-L5 五层核心内容构建（与目标模型无关） */
export function buildCoreContent(pack: PackInput): CoreContent {
  const tmpl = DOMAIN_TEMPLATES[pack.domain];
  const variables = pack.variables || {};

  // L1: 元角色 + SMART 终极目标
  const role = `你是一位 ${pack.role_desc}。**终极目标**：${pack.goal}`;

  // L2: 上下文知识库（边界分隔符包裹）
  const context = `<<<BEGIN_CONTEXT>>>\n${
    pack.context?.trim() || '(请在此粘贴内部文档、竞品分析或技术栈版本信息)'
  }\n<<<END_CONTEXT>>>`;

  // L3: 认知链路 CoT（防止跳步）
  const task = tmpl.co_t.map((step) => `- ${step}`).join('\n');

  // L4: 输出约束
  const constraints = tmpl.constraints.map((rule) => `- ${rule}`).join('\n');

  // L5: 动态变量槽位字典
  const varLines = Object.entries(variables)
    .map(([k, v]) => `- \`${varPh(k)}\`：${v || '（待填）'}`)
    .join('\n');

  return { role, context, task, constraints, format: tmpl.output_format, variables: varLines };
}

// ---------- 各模型适配器（与 Python 版渲染格式逐字对齐） ----------

function formatForGpt(core: CoreContent): string {
  return `# System Prompt
${core.role}

## Instructions
请严格按以下步骤逐步思考，不要跳步：
${core.task}

## Context
${core.context}

## Constraints
${core.constraints}
- **输出格式要求**：${core.format}

## Variables Dictionary
${core.variables}

## Few-shot (Optional)
[Input 示例]：
(请在此填写输入样例)
[Output 示例]：
(请在此填写完美输出样例)
`;
}

function formatForClaude(core: CoreContent): string {
  return `<system>
${core.role}
</system>

<instructions>
请严格按以下步骤逐步思考，不要跳步：
${core.task}
</instructions>

<context>
${core.context}
</context>

<constraints>
${core.constraints}
- **输出格式要求**：${core.format}
</constraints>

<variables>
${core.variables}
</variables>

<few_shot>
[Input 示例]：
(请在此填写输入样例)
[Output 示例]：
(请在此填写完美输出样例)
</few_shot>
`;
}

function formatForGemini(core: CoreContent): string {
  return `**Role**: ${core.role}

**Task**:
请严格按以下步骤逐步思考，不要跳步：
${core.task}

**Context**:
${core.context}

**Constraints**:
${core.constraints}
- **输出格式要求**：${core.format}
- **重要**：请基于提供的事实信息作答，在适用时请引用信息来源

**Variables**:
${core.variables}

**Few-shot Example**:
[Input]：
(请在此填写输入样例)
[Output]：
(请在此填写完美输出样例)
`;
}

// DeepSeek / Qwen：兼容 GPT 风格
function formatForDeepSeek(core: CoreContent): string {
  return formatForGpt(core);
}

const MODEL_ADAPTERS: Record<ModelName, (core: CoreContent) => string> = {
  GPT: formatForGpt,
  Claude: formatForClaude,
  Gemini: formatForGemini,
  DeepSeek: formatForDeepSeek,
};

/** 渲染适配目标模型的完整提示词 */
export function renderPrompt(model: ModelName, pack: PackInput): string {
  const core = buildCoreContent(pack);
  const header = `<!-- 专业提示词包 · ${pack.pack_name} · 目标模型 ${model} · 由 PromptHub 提示词包生成器生成 -->\n\n`;
  return header + MODEL_ADAPTERS[model](core);
}

/** 发布入库元数据（title/description/tips/tags/category 默认值） */
export function buildPublishMeta(pack: PackInput, model: ModelName) {
  const tmpl = DOMAIN_TEMPLATES[pack.domain];
  const varLines = Object.entries(pack.variables || {})
    .map(([k, v]) => `- \`${varPh(k)}\`：${v || '（待填）'}`)
    .join('\n');

  const tips = [
    `**领域**：${pack.domain} — ${tmpl.description}`,
    `**目标模型**：${model}`,
    '',
    '**使用步骤**：',
    '1. 全文复制本提示词，替换文中所有 `{{变量}}` 占位符；',
    '2. 如需注入内部资料，粘贴到 `<<<BEGIN_CONTEXT>>>` 与 `<<<END_CONTEXT>>>` 之间；',
    '3. 在 Few-shot 区域填入输入/输出样例可提升稳定性。',
    '',
    '**变量字典**：',
    varLines || '- （无变量）',
  ].join('\n');

  return {
    title: pack.pack_name.trim(),
    description: `${pack.role_desc}。终极目标：${pack.goal}`.slice(0, 300),
    tips,
    tags: ['提示词包', pack.domain, 'AI工作流'],
    category_id: DOMAIN_CATEGORY[pack.domain] ?? 4,
  };
}
