// ============================================================
// PromptHub - 任务定义注册表
// 每个任务聚合三支柱（提示词/技能/工作流）的相关资产，
// 生成 /tasks/{slug} 落地页（组合型功能 + SEO）
// ============================================================

export interface TaskDef {
  slug: string;
  title: string;
  description: string;
  /** 用于匹配资产标签的标签集合（全部小写） */
  tags: string[];
}

export const TASKS: TaskDef[] = [
  {
    slug: 'write-code',
    title: 'Write & Review Code',
    description:
      'Generate, review, and improve code with tested prompts, skills, and workflows.',
    tags: ['code', 'code-review', 'programming', 'javascript', 'python', 'react', 'typescript', 'code-generation'],
  },
  {
    slug: 'debug-fix',
    title: 'Debug & Fix Errors',
    description:
      'Diagnose bugs, analyze stack traces, and fix errors systematically.',
    tags: ['debugging', 'bug', 'error', 'root-cause', 'troubleshooting', 'testing'],
  },
  {
    slug: 'write-content',
    title: 'Write Articles & Blog Posts',
    description:
      'Draft, structure, and polish articles, blog posts, and SEO content.',
    tags: ['blogging', 'article', 'seo', 'content', 'writing', 'copywriting'],
  },
  {
    slug: 'translate',
    title: 'Translate & Localize',
    description:
      'Translate text with cultural adaptation and tone awareness.',
    tags: ['translation', 'localization', 'language'],
  },
  {
    slug: 'research',
    title: 'Research & Analyze',
    description:
      'Gather evidence, summarize findings, and produce research briefs.',
    tags: ['research', 'analysis', 'report', 'competitor-analysis'],
  },
  {
    slug: 'write-novel',
    title: 'Write Fiction & Novels',
    description:
      'Build characters, worlds, and scenes for novels and screenplays.',
    tags: ['novel', 'story', 'character', 'worldbuilding', 'fantasy', 'creative-writing', 'scene'],
  },
  {
    slug: 'video',
    title: 'Create & Edit Videos',
    description:
      'Script, shoot, edit, grade, subtitle, and publish videos.',
    tags: ['video', 'video-script', 'editing', 'ffmpeg', 'color-grading', 'subtitles', 'thumbnail', 'video-production'],
  },
  {
    slug: 'marketing',
    title: 'Marketing & Copywriting',
    description:
      'Write persuasive copy and plan marketing content that converts.',
    tags: ['marketing', 'copywriting', 'aida', 'seo', 'social-media', 'email'],
  },
  {
    slug: 'data-analysis',
    title: 'Analyze Data',
    description:
      'Extract insights from metrics, datasets, and analytics.',
    tags: ['data-analysis', 'analytics', 'retention', 'insight', 'statistic', 'report'],
  },
  {
    slug: 'email',
    title: 'Write Emails',
    description:
      'Draft professional emails, outreach, and follow-ups.',
    tags: ['email', 'outreach', 'communication'],
  },
  {
    slug: 'learn',
    title: 'Learn Something New',
    description:
      'Build study plans, get explanations, and coach yourself.',
    tags: ['learning', 'study', 'tutor', 'education'],
  },
  {
    slug: 'brainstorm',
    title: 'Brainstorm Ideas',
    description:
      'Generate, organize, and pressure-test ideas with structure.',
    tags: ['brainstorm', 'ideation', 'creativity', 'planning'],
  },
];

/** 按 slug 查找任务；不存在返回 undefined */
export function getTaskBySlug(slug: string): TaskDef | undefined {
  return TASKS.find((t) => t.slug === slug);
}
