// ============================================================
// PromptHub - 资源包（Bundle）定义
// 精选资产合集：提示词 + 技能 + 工作流
// 可分享、可导出，未来作为 Pro 资源包的付费门控单元
// ============================================================

export interface BundleDef {
  slug: string;
  title: string;
  description: string;
  /** 提示词 slug 列表 */
  promptSlugs: string[];
  /** 技能 slug 列表 */
  skillSlugs: string[];
  /** 工作流 slug 列表 */
  workflowSlugs: string[];
}

export const BUNDLES: BundleDef[] = [
  {
    slug: 'full-stack-dev-kit',
    title: 'Full-Stack Dev Kit',
    description:
      'Everything a developer needs to write, review, and ship code — tested prompts, code skills, and CI-ready workflows.',
    promptSlugs: ['javascript', 'react'],
    skillSlugs: [
      'senior-code-reviewer',
      'unit-test-generator',
      'git-commit-message-writer',
      'api-doc-generator',
      'api-contract-validator',
      'automated-test-suite-generator',
      'code-quality-server',
    ],
    workflowSlugs: ['bug-triage-fix', 'secure-microservice-scaffold', 'full-stack-feature-scaffold'],
  },
  {
    slug: 'content-creator-kit',
    title: 'Content Creator Kit',
    description:
      'Turn ideas into published content — blog posts, emails, newsletters, and social — with tested writing skills.',
    promptSlugs: ['scene-craft-show-don-tell-standard'],
    skillSlugs: [
      'blog-post-writer',
      'technical-blog-post-ghostwriter',
      'newsletter-writer',
      'aida-copywriter',
      'seo-article-writer',
      'persuasive-email-copywriter',
      'copy-editor-proofreader',
    ],
    workflowSlugs: ['blog-pipeline', 'weekly-content-calendar-generator', 'content-repurposing'],
  },
  {
    slug: 'research-stack',
    title: 'AI Research Stack',
    description:
      'Run structured research, competitor analysis, and data synthesis with cited, reproducible methods.',
    promptSlugs: [],
    skillSlugs: [
      'deep-research-assistant',
      'systematic-literature-review-assistant',
      'competitor-analysis',
      'data-insight-extractor',
      'meeting-notes-summarizer',
    ],
    workflowSlugs: ['research-brief', 'market-research-synthesis', 'automated-data-cleaning-pipeline'],
  },
  {
    slug: 'video-production-suite',
    title: 'Video Production Suite',
    description:
      'Script, shoot, edit, grade, and publish videos — a complete tested video workflow.',
    promptSlugs: [],
    skillSlugs: [
      'video-script',
      'video-storyboard',
      'video-editing',
      'video-grading',
      'video-subtitles',
      'video-ffmpeg',
      'video-thumbnail',
      'video-seo',
    ],
    workflowSlugs: [],
  },
  {
    slug: 'prompt-engineering-masterclass',
    title: 'Prompt Engineering Masterclass',
    description:
      'Learn and apply prompt engineering the way we do — structured prompts, anti-patterns, and testing skills.',
    promptSlugs: [],
    skillSlugs: [
      'prompt-engineer-assistant',
      'prompt-template-manager',
      'prompt-testing-suite',
      'prompt-version-control',
      'prompt-analyzer',
      'skill-creator',
    ],
    workflowSlugs: [],
  },
];

/** 按 slug 查找资源包 */
export function getBundleBySlug(slug: string): BundleDef | undefined {
  return BUNDLES.find((b) => b.slug === slug);
}
