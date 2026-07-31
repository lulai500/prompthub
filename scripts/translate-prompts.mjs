#!/usr/bin/env node
// ============================================================
// PromptHub - Chinese Prompt Translation Script
//
// Usage:
//   1. Ensure .env.local has valid Supabase credentials
//   2. node scripts/translate-prompts.mjs --dry-run   (preview)
//   3. node scripts/translate-prompts.mjs --force      (execute)
//
// Features:
//   - Detects Chinese-language prompts in the database
//   - Translates title / description / content / tips to English
//   - Uses hand-crafted translations for known prompts
//   - Updates the database
//   - Generates a translation comparison log (translate-log.json)
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ---- Load .env.local ----
function loadEnv() {
  const envPath = resolve(ROOT, '.env.local');
  const examplePath = resolve(ROOT, '.env.example');
  const env = {};

  for (const path of [envPath, examplePath]) {
    try {
      const content = readFileSync(path, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!env[key]) env[key] = val;
      }
    } catch {}
  }

  return env;
}

const env = loadEnv();

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || SUPABASE_URL.includes('your-project-id')) {
  console.error('❌ Please fill in your real Supabase credentials in .env.local');
  console.error('   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ---- Hand-Crafted English Translations for Known Chinese Prompts ----
// These are complete, high-quality translations for the 6 known Chinese prompts.
// Each entry is keyed by slug for precise matching.
const KNOWN_TRANSLATIONS = {
  'python-rest-api': {
    title: 'Write a Python Function for REST API Calls with Error Handling, Retry Mechanism, and Request Logging',
    description: 'A prompt for generating a Python function to make REST API calls with comprehensive error handling, retry logic, and structured request logging.',
    content: `You are a senior Python engineer with 10+ years of experience, dedicated to following SOLID principles and prioritizing code readability, security, and performance.

## Core Task
Write a Python function that implements REST API calls with complete error handling, retry mechanism, and request logging.

## Input Boundaries
- Base analysis and responses strictly on the provided materials
- If the information provided is insufficient to make a judgment, clearly state "Insufficient reliable basis for conclusion"
- Do not fabricate or speculate on any unverified content

## Constraint Rules
- Mark uncertain information with "Insufficient reliable basis for conclusion"
- Reasoning steps must be numbered with brief titles for each step

## Output Format Specification
- Output only code with proper syntax highlighting
- Use JSON format for structured data, table format for comparison data
- Add docstrings before key functions
- Use brief inline comments for complex logic
- Label file name comments for multi-file outputs

## Fallback Logic
If the user's input is insufficient or exceeds the scope of knowledge, respond with:
"I'm sorry, based on the information provided, I cannot give a reliable answer. Please provide the following missing information: [list key missing information]"`,
    tips: `## Tuning Tips
- Temperature: 0.5 for consistent, focused code generation
- Max Tokens: 4096
- Top P: 0.95
- Estimated input: ~366 tokens
- For best results, specify the API endpoint, authentication method, and expected response format`,
  },

  'python-bug': {
    title: 'Analyze Python Code for Bugs, Performance Issues, and Security Risks with Improvement Suggestions',
    description: 'A prompt for analyzing Python code to identify potential bugs, performance bottlenecks, and security vulnerabilities, with actionable improvement suggestions and fixes.',
    content: `You are a senior Python developer with 10+ years of experience, dedicated to following SOLID principles and prioritizing code readability, security, and performance.

## Core Task
Analyze the following Python code and identify potential bugs, performance issues, and security risks. Provide improvement suggestions and corrected code.

## Input Boundaries
- Base analysis and responses strictly on the provided materials
- If the information provided is insufficient to make a judgment, clearly state "Insufficient reliable basis for conclusion"
- Do not fabricate or speculate on any unverified content

## Constraint Rules
- Mark uncertain information with "Insufficient reliable basis for conclusion"
- Reasoning steps must be numbered with brief titles for each step

## Output Format Specification
- Output only code with proper syntax highlighting
- Use JSON format for structured data, table format for comparison data
- Add docstrings before key functions
- Use brief inline comments for complex logic
- Label file name comments for multi-file outputs

## Fallback Logic
If the user's input is insufficient or exceeds the scope of knowledge, respond with:
"I'm sorry, based on the information provided, I cannot give a reliable answer. Please provide the following missing information: [list key missing information]"`,
    tips: `## Tuning Tips
- Temperature: 0.5 for focused, analytical results
- Max Tokens: 4096
- Top P: 0.95
- Estimated input: ~461 tokens
- For best results, provide complete code files with context rather than isolated snippets`,
  },

  'prompt-klatzmen': {
    title: 'Write an In-Depth Analysis Article on AI Development Trends for Tech Professionals',
    description: 'A prompt for crafting a comprehensive, professional yet accessible analysis article on artificial intelligence development trends, tailored for technology professionals.',
    content: `You are a senior copywriter and content strategist, skilled in platform content creation. You are proficient in PAS/AIDA/BAB copywriting frameworks and familiar with platform algorithm preferences and user psychology.

## Core Task
Write an in-depth analysis article on AI development trends, aimed at technology professionals, with a tone that is professional but not overly technical or obscure.

## Input Boundaries
- Base analysis and responses strictly on the provided materials
- If the information provided is insufficient to make a judgment, clearly state "Insufficient reliable basis for conclusion"
- Do not fabricate or speculate on any unverified content

## Constraint Rules
- Mark uncertain information with "Insufficient reliable basis for conclusion"
- Reasoning steps must be numbered with brief titles for each step

## Output Format Specification
- Use structured report format: core conclusion first, then detailed analysis, then actionable recommendations
- Use heading hierarchy for clear organization
- Bold key findings and important data points
- Include bullet points for key takeaways

## Fallback Logic
If the user's input is insufficient or exceeds the scope of knowledge, respond with:
"I'm sorry, based on the information provided, I cannot give a reliable answer. Please provide the following missing information: [list key missing information]"`,
    tips: `## Tuning Tips
- Temperature: 0.5 for balanced creativity and coherence
- Max Tokens: 4096
- Top P: 0.95
- Estimated input: ~443 tokens
- For best results, specify the target audience, article length, and any specific AI domains to focus on`,
  },

  'javascript': {
    title: 'Review JavaScript Code: Evaluate Readability, Performance, and Security with Refactoring Suggestions',
    description: 'A prompt for reviewing JavaScript code across readability, performance, and security dimensions, with structured refactoring recommendations.',
    content: `You are a senior JavaScript engineer with 10+ years of experience, dedicated to following SOLID principles and prioritizing code readability, security, and performance.

## Core Task
Review the following JavaScript code and evaluate it across three dimensions: readability, performance, and security. Provide refactoring suggestions for each dimension.

## Input Boundaries
- Base analysis and responses strictly on the provided materials
- If the information provided is insufficient to make a judgment, clearly state "Insufficient reliable basis for conclusion"
- Do not fabricate or speculate on any unverified content

## Constraint Rules
- Mark uncertain information with "Insufficient reliable basis for conclusion"
- Reasoning steps must be numbered with brief titles for each step

## Output Format Specification
- Output only code with proper syntax highlighting
- Add docstrings before key functions
- Use brief inline comments for complex logic
- Label file name comments for multi-file outputs

## Fallback Logic
If the user's input is insufficient or exceeds the scope of knowledge, respond with:
"I'm sorry, based on the information provided, I cannot give a reliable answer. Please provide the following missing information: [list key missing information]"`,
    tips: `## Tuning Tips
- Temperature: 0.5 for consistent, structured reviews
- Max Tokens: 4096
- Top P: 0.95
- For best results, provide the full JavaScript file or module with any related configuration`,
  },

  'sql-sql': {
    title: 'SQL Query Performance Optimization: Analyze Execution Plans and Provide Optimized SQL',
    description: 'A prompt for analyzing SQL query execution plans and providing performance optimization solutions with rewritten optimized queries.',
    content: `You are a senior SQL developer with 10+ years of experience, dedicated to following SOLID principles and prioritizing code readability, security, and performance.

## Core Task
Provide a performance optimization plan for the following SQL query. Analyze the execution plan and produce an optimized version of the SQL.

## Input Boundaries
- Base analysis and responses strictly on the provided materials
- If the information provided is insufficient to make a judgment, clearly state "Insufficient reliable basis for conclusion"
- Do not fabricate or speculate on any unverified content

## Constraint Rules
- Mark uncertain information with "Insufficient reliable basis for conclusion"
- Reasoning steps must be numbered with brief titles for each step

## Output Format Specification
- Use structured report format: core conclusion first, then detailed analysis, then actionable recommendations
- Use heading hierarchy for clear organization
- Bold key findings and important data points
- Include the optimized SQL with proper syntax highlighting

## Fallback Logic
If the user's input is insufficient or exceeds the scope of knowledge, respond with:
"I'm sorry, based on the information provided, I cannot give a reliable answer. Please provide the following missing information: [list key missing information]"`,
    tips: `## Tuning Tips
- Temperature: 0.5 for precise, analytical results
- Max Tokens: 4096
- Top P: 0.95
- Estimated input: ~410 tokens
- For best results, include the full query, EXPLAIN output, table schemas, and index definitions`,
  },

  'react': {
    title: 'Generate Complete React Component Unit Tests Covering Normal, Error, and Edge Cases',
    description: 'A prompt for generating comprehensive React component unit tests that cover normal execution paths, error handling paths, and boundary conditions.',
    content: `You are a senior TypeScript developer with 10+ years of experience, dedicated to following SOLID principles and prioritizing code readability, security, and performance.

## Core Task
Generate complete unit tests for the React component, covering normal execution paths, error handling paths, and boundary/edge case conditions.

## Input Boundaries
- Base analysis and responses strictly on the provided materials
- If the information provided is insufficient to make a judgment, clearly state "Insufficient reliable basis for conclusion"
- Do not fabricate or speculate on any unverified content

## Constraint Rules
- Mark uncertain information with "Insufficient reliable basis for conclusion"
- Reasoning steps must be numbered with brief titles for each step

## Output Format Specification
- Use clear structured formatting for test organization
- Use proper syntax highlighting for code blocks
- Prefer JSON for structured data, tables for comparison data
- Group tests logically: normal paths, error paths, edge cases

## Fallback Logic
If the user's input is insufficient or exceeds the scope of knowledge, respond with:
"I'm sorry, based on the information provided, I cannot give a reliable answer. Please provide the following missing information: [list key missing information]"`,
    tips: `## Tuning Tips
- Temperature: 0.5 for consistent, thorough test generation
- Max Tokens: 4096
- Top P: 0.95
- Estimated input: ~361 tokens
- For best results, provide the full React component source code, props interfaces, and any custom hooks used`,
  },
};

// ---- Chinese-to-English vocabulary map (for unknown prompts) ----
const TRANSLATION_MAP = {
  '提示词': 'Prompt',
  '生成': 'Generate',
  '创建': 'Create',
  '编写': 'Write',
  '优化': 'Optimize',
  '分析': 'Analyze',
  '翻译': 'Translate',
  '总结': 'Summarize',
  '代码审查': 'Code Review',
  '代码生成': 'Code Generator',
  '调试': 'Debug',
  '修复': 'Fix',
  '设计': 'Design',
  '开发': 'Develop',
  '测试': 'Test',
  '部署': 'Deploy',
  '配置': 'Configure',
  '管理': 'Manage',
  '搜索': 'Search',
  '查询': 'Query',
  '提取': 'Extract',
  '转换': 'Convert',
  '格式化': 'Format',
  '验证': 'Validate',
  '解析': 'Parse',
  '处理': 'Process',
  '自动化': 'Automation',
  '工作流': 'Workflow',
  '助手': 'Assistant',
  '专家': 'Expert',
  '导师': 'Mentor',
  '教练': 'Coach',
  '顾问': 'Consultant',
  '编辑器': 'Editor',
  '生成器': 'Generator',
  '检查器': 'Checker',
  '审查员': 'Reviewer',
  '写作': 'Writing',
  '创作': 'Creation',
  '小说': 'Novel',
  '角色': 'Character',
  '世界构建': 'World Building',
  '故事': 'Story',
  '情节': 'Plot',
  '对话': 'Dialogue',
  '大纲': 'Outline',
  '翻译器': 'Translator',
  '通用': 'General',
  '专业': 'Professional',
  '高级': 'Advanced',
  '基础': 'Basic',
  '初级': 'Beginner',
  '入门': 'Getting Started',
  '终极': 'Ultimate',
  '全面': 'Comprehensive',
  '完整': 'Complete',
  '高效': 'Efficient',
  '智能': 'Smart',
  'AI助手': 'AI Assistant',
  '大模型': 'Large Language Model',
  '深度学习': 'Deep Learning',
  '机器学习': 'Machine Learning',
  '自然语言': 'Natural Language',
  '处理': 'Processing',
  '理解': 'Understanding',
  '推理': 'Reasoning',
  '编程': 'Programming',
  '前端': 'Frontend',
  '后端': 'Backend',
  '全栈': 'Full Stack',
  '数据库': 'Database',
  '接口': 'API',
  '架构': 'Architecture',
  '算法': 'Algorithm',
  '数据结构': 'Data Structure',
  '网络': 'Network',
  '安全': 'Security',
  '性能': 'Performance',
  '重构': 'Refactoring',
  '文档': 'Documentation',
  '注释': 'Comments',
  '版本控制': 'Version Control',
  '容器': 'Container',
  '微服务': 'Microservices',
  '数据': 'Data',
  '分析': 'Analysis',
  '可视化': 'Visualization',
  '报告': 'Report',
  '图表': 'Chart',
  '仪表盘': 'Dashboard',
  '营销': 'Marketing',
  '文案': 'Copywriting',
  '广告': 'Advertisement',
  'SEO': 'SEO',
  '社交媒体': 'Social Media',
  '邮件': 'Email',
  '博客': 'Blog',
  '文章': 'Article',
  '内容': 'Content',
  '策略': 'Strategy',
  '计划': 'Plan',
  '模板': 'Template',
  '示例': 'Example',
  '教程': 'Tutorial',
  '指南': 'Guide',
  '手册': 'Handbook',
  '参考': 'Reference',
  '备忘': 'Cheatsheet',
  '清单': 'Checklist',
  '工具': 'Tool',
  '插件': 'Plugin',
  '扩展': 'Extension',
  '框架': 'Framework',
  '库': 'Library',
  '组件': 'Component',
  '模块': 'Module',
  '系统': 'System',
  '平台': 'Platform',
  '应用': 'Application',
  '服务': 'Service',
  '方案': 'Solution',
  '最佳实践': 'Best Practices',
  '技巧': 'Tips',
  '窍门': 'Tricks',
  '方法': 'Method',
  '流程': 'Workflow',
  '步骤': 'Steps',
  '使用': 'Usage',
  '实现': 'Implementation',
  '操作': 'Operation',
  '功能': 'Feature',
  '特性': 'Features',
  '优势': 'Advantages',
  '缺点': 'Disadvantages',
  '比较': 'Comparison',
  '区别': 'Difference',
  '概述': 'Overview',
  '详细': 'Detailed',
  '简介': 'Introduction',
  '背景': 'Background',
  '目标': 'Goal',
  '需求': 'Requirements',
  '规格': 'Specification',
  '标准': 'Standard',
  '规范': 'Specification',
  '协议': 'Protocol',
  '模型': 'Model',
  '参数': 'Parameters',
  '调参': 'Tuning',
  '建议': 'Suggestions',
  '注意': 'Note',
  '警告': 'Warning',
  '错误': 'Error',
  '异常': 'Exception',
  '日志': 'Log',
  '监控': 'Monitoring',
  '追踪': 'Tracking',
  '调试': 'Debugging',
  '问题': 'Issue',
  '解决方案': 'Solution',
  '答案': 'Answer',
  '回复': 'Response',
  '输出': 'Output',
  '输入': 'Input',
  '格式': 'Format',
  '类型': 'Type',
  '分类': 'Category',
  '标签': 'Tag',
  '关键词': 'Keywords',
  '描述': 'Description',
  '标题': 'Title',
  '版本': 'Version',
  '更新': 'Update',
  '升级': 'Upgrade',
  '迁移': 'Migration',
  '安装': 'Installation',
  '卸载': 'Uninstallation',
  '启动': 'Start',
  '停止': 'Stop',
  '重启': 'Restart',
  '备份': 'Backup',
  '恢复': 'Restore',
  '导入': 'Import',
  '导出': 'Export',
  '同步': 'Sync',
  '批量': 'Batch',
  '单例': 'Singleton',
  '队列': 'Queue',
  '缓存': 'Cache',
  '会话': 'Session',
  '认证': 'Authentication',
  '授权': 'Authorization',
  '加密': 'Encryption',
  '解密': 'Decryption',
  '签名': 'Signature',
  '证书': 'Certificate',
  '虚拟': 'Virtual',
  '远程': 'Remote',
  '本地': 'Local',
  '云': 'Cloud',
  '边缘': 'Edge',
  '服务器': 'Server',
  '客户端': 'Client',
  '浏览器': 'Browser',
  '移动端': 'Mobile',
  '桌面': 'Desktop',
  '响应式': 'Responsive',
  '适配': 'Adaptation',
  '兼容': 'Compatibility',
  '跨平台': 'Cross-platform',
  '多语言': 'Multilingual',
  '国际化': 'Internationalization',
  '本地化': 'Localization',
  '无障碍': 'Accessibility',
  '用户体验': 'User Experience',
  '界面': 'Interface',
  '布局': 'Layout',
  '样式': 'Style',
  '主题': 'Theme',
  '动画': 'Animation',
  '交互': 'Interaction',
  '点击': 'Click',
  '滚动': 'Scroll',
  '加载': 'Loading',
  '提交': 'Submit',
  '保存': 'Save',
  '删除': 'Delete',
  '编辑': 'Edit',
  '新建': 'New',
  '复制': 'Copy',
  '粘贴': 'Paste',
  '剪切': 'Cut',
  '撤销': 'Undo',
  '重做': 'Redo',
  '预览': 'Preview',
  '发布': 'Publish',
  '草稿': 'Draft',
  '审核': 'Review',
  '批准': 'Approve',
  '拒绝': 'Reject',
  '归档': 'Archive',
  '搜索': 'Search',
  '筛选': 'Filter',
  '排序': 'Sort',
  '分页': 'Pagination',
  '导航': 'Navigation',
  '菜单': 'Menu',
  '按钮': 'Button',
  '表单': 'Form',
  '输入框': 'Input',
  '下拉框': 'Dropdown',
  '复选框': 'Checkbox',
  '单选框': 'Radio',
  '开关': 'Toggle',
  '滑块': 'Slider',
  '弹窗': 'Modal',
  '提示': 'Tooltip',
  '通知': 'Notification',
  '消息': 'Message',
  '聊天': 'Chat',
  '对话': 'Conversation',
  '机器人': 'Bot',
  '代理': 'Agent',
  '工作': 'Work',
  '任务': 'Task',
  '项目': 'Project',
  '团队': 'Team',
  '协作': 'Collaboration',
  '分享': 'Share',
  '评论': 'Comment',
  '反馈': 'Feedback',
  '评分': 'Rating',
  '收藏': 'Favorite',
  '点赞': 'Like',
  '关注': 'Follow',
  '订阅': 'Subscribe',
};

// ---- Translation Core ----

/**
 * Translate Chinese text to English.
 *
 * Strategy (in order of priority):
 * 1. Use hand-crafted KNOWN_TRANSLATIONS if the prompt slug matches
 * 2. For unknown Chinese text, use vocabulary-map replacement as fallback
 */
function translateChinese(text) {
  if (!text || !/[一-鿿]/.test(text)) return text;

  let result = text;

  // Replace known Chinese vocabulary (longer phrases first for accuracy)
  const sortedKeys = Object.keys(TRANSLATION_MAP).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    result = result.replace(regex, TRANSLATION_MAP[key]);
  }

  // Wrap remaining Chinese characters with a marker for manual review
  result = result.replace(/[一-鿿]+/g, (match) => `[NEEDS REVIEW:${match}]`);

  // Clean up whitespace
  result = result.replace(/\s{2,}/g, ' ').trim();

  return result;
}

/**
 * Translate an entire prompt object.
 * If the slug matches a known translation, use the hand-crafted version.
 * Otherwise, fall back to dictionary-based translation.
 */
function translatePrompt(prompt) {
  // Check for hand-crafted translation by slug
  const known = KNOWN_TRANSLATIONS[prompt.slug];
  if (known) {
    return {
      id: prompt.id,
      slug: prompt.slug,
      title: known.title,
      description: known.description,
      content: known.content,
      tips: known.tips,
      method: 'hand-crafted',
    };
  }

  // Fallback: dictionary-based translation for unknown Chinese prompts
  return {
    id: prompt.id,
    slug: prompt.slug,
    title: translateChinese(prompt.title),
    description: prompt.description ? translateChinese(prompt.description) : null,
    content: translateChinese(prompt.content),
    tips: prompt.tips ? translateChinese(prompt.tips) : null,
    method: 'dictionary-fallback',
  };
}

// ---- Main ----
async function main() {
  console.log('🔍 Connecting to Supabase...');
  console.log(`   URL: ${SUPABASE_URL}`);

  // 1. Fetch all published prompts
  const { data: allPrompts, error } = await supabase
    .from('prompts')
    .select('*')
    .eq('is_published', true);

  if (error) {
    console.error('❌ Query failed:', error.message);
    process.exit(1);
  }

  console.log(`\n📊 Total published prompts in database: ${allPrompts.length}`);

  // 2. Detect Chinese-language prompts
  const chineseRegex = /[一-鿿]/;
  const chinesePrompts = allPrompts.filter(
    (p) =>
      chineseRegex.test(p.title || '') ||
      chineseRegex.test(p.description || '') ||
      chineseRegex.test(p.content || '') ||
      chineseRegex.test(p.tips || '')
  );

  if (chinesePrompts.length === 0) {
    console.log('✅ No Chinese-language prompts found. Nothing to translate!');
    return;
  }

  console.log(`\n🌐 Found ${chinesePrompts.length} Chinese-language prompt(s):`);
  console.log('-'.repeat(60));

  const translations = [];
  const logEntries = [];
  let handCraftedCount = 0;
  let fallbackCount = 0;

  for (const prompt of chinesePrompts) {
    const translated = translatePrompt(prompt);

    translations.push({
      id: prompt.id,
      title: translated.title,
      description: translated.description,
      content: translated.content,
      tips: translated.tips,
    });

    logEntries.push({
      id: prompt.id,
      slug: prompt.slug,
      method: translated.method,
      original: {
        title: prompt.title,
        description: prompt.description?.slice(0, 200),
        content: prompt.content?.slice(0, 200),
      },
      translated: {
        title: translated.title,
        description: translated.description?.slice(0, 200),
        content: translated.content?.slice(0, 200),
      },
    });

    const methodLabel = translated.method === 'hand-crafted' ? '✨' : '🔧';
    console.log(`  ${methodLabel} #${prompt.id} [${prompt.slug}]`);
    console.log(`     Original: ${prompt.title}`);
    console.log(`     Translated: ${translated.title}`);

    if (translated.method === 'hand-crafted') {
      handCraftedCount++;
    } else {
      fallbackCount++;
    }
  }

  console.log('-'.repeat(60));
  console.log(`\n📝 Translation summary:`);
  console.log(`   ✨ Hand-crafted translations: ${handCraftedCount}`);
  console.log(`   🔧 Dictionary fallback (needs review): ${fallbackCount}`);

  if (fallbackCount > 0) {
    console.log(`\n⚠️  ${fallbackCount} prompt(s) use dictionary-based translation and may need manual review.`);
    console.log('   Search for [NEEDS REVIEW:...] markers in the output.');
  }

  // 3. Save translation log
  const logPath = resolve(ROOT, 'translate-log.json');
  writeFileSync(logPath, JSON.stringify(logEntries, null, 2), 'utf-8');
  console.log(`💾 Translation log saved: ${logPath}`);

  // 4. Confirmation
  console.log('\n⚠️  About to update prompt content in the database');
  console.log('   This operation is irreversible (unless you have a database backup)');

  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');

  if (dryRun) {
    console.log('\n🔍 --dry-run mode: Detection only, no database updates');
    console.log('   Remove --dry-run and add --force to execute updates');
    return;
  }

  if (!force) {
    console.log('\n💡 Use --force to confirm updates:');
    console.log('   node scripts/translate-prompts.mjs --force');
    console.log('   Or use --dry-run first to preview translations');
    return;
  }

  // 5. Execute updates
  console.log('\n🚀 Updating database...');
  let success = 0;
  let failed = 0;

  for (const t of translations) {
    const { error: updateError } = await supabase
      .from('prompts')
      .update({
        title: t.title,
        description: t.description,
        content: t.content,
        tips: t.tips,
        updated_at: new Date().toISOString(),
      })
      .eq('id', t.id);

    if (updateError) {
      console.error(`  ❌ #${t.id} update failed: ${updateError.message}`);
      failed++;
    } else {
      console.log(`  ✅ #${t.id} updated successfully`);
      success++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Translation complete! Success: ${success}, Failed: ${failed}`);
  console.log(`📋 Detailed log: translate-log.json`);
  console.log('='.repeat(60));
}

main().catch((err) => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
