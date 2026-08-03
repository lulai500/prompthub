// ============================================================
// PromptHub - 技能多格式转换
// "Tested once, install anywhere"
// 一份技能定义 → 导出 Claude Skill / Cursor Rules / Codex / Claude Code
// ============================================================

export interface SkillLike {
  title: string;
  slug: string | null;
  description: string | null;
  content: string;
  compatible_models: string[];
  install_instructions: string | null;
}

/** 解析 SKILL.md 内容 → frontmatter 与正文 */
export function splitSkillContent(content: string): { frontmatter: string; body: string } {
  const m = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (m) return { frontmatter: m[1].trim(), body: m[2].trim() };
  return { frontmatter: '', body: content.trim() };
}

/** 从 frontmatter 提取某个字段 */
function frontmatterField(frontmatter: string, key: string): string {
  const re = new RegExp(`^${key}:\\s*(.+)$`, 'm');
  const m = frontmatter.match(re);
  return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : '';
}

/** 1. Claude Skill（SKILL.md）—— 确保有规范 frontmatter */
export function toClaudeSkill(s: SkillLike): string {
  const { frontmatter, body } = splitSkillContent(s.content);
  const name = frontmatterField(frontmatter, 'name') || s.slug || kebab(s.title);
  const desc = frontmatterField(frontmatter, 'description') || s.description || `${s.title} skill`;
  return `---
name: ${name}
description: ${desc}
---

${body || s.content}`;
}

/** 2. Cursor Rules（.cursor/rules/*.mdc） */
export function toCursorRule(s: SkillLike): string {
  const { body } = splitSkillContent(s.content);
  return `---
description: ${s.description || s.title}
globs:
alwaysApply: false
---
# ${s.title}

${body || s.content}
`;
}

/** 3. Codex（AGENTS.md 条目 / prompts/ 文件） */
export function toCodexEntry(s: SkillLike): string {
  const { body } = splitSkillContent(s.content);
  const models = s.compatible_models.length > 0 ? `Compatible models: ${s.compatible_models.join(', ')}\n` : '';
  return `# ${s.title}

${s.description ? s.description + '\n' : ''}${models}
${body || s.content}`;
}

/** 4. Claude Code（插件 SKILL.md 说明 + 安装路径） */
export function toClaudeCodeNotes(s: SkillLike): string {
  const { frontmatter } = splitSkillContent(s.content);
  const name = frontmatterField(frontmatter, 'name') || s.slug || kebab(s.title);
  return `Install ${s.title} into Claude Code:

1. Create folder: ~/.claude/skills/${name}/
2. Save the SKILL.md content (Claude Skill tab) as SKILL.md
3. Invoke with: "Use the ${name} skill for ..."

${s.install_instructions ? 'Notes:\n' + s.install_instructions + '\n' : ''}`;
}

/** 技能格式标签映射 */
export const FORMAT_LABELS: Record<string, string> = {
  'claude-skill': 'Claude Skill',
  'claude-code': 'Claude Code',
  'cursor-rules': 'Cursor Rules',
  codex: 'Codex',
  'gpt-actions': 'GPT Actions',
  'gemini-extension': 'Gemini Extension',
  'cross-model': 'Cross-model',
  'tool-server': 'Tool Server',
};

function kebab(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'skill';
}
