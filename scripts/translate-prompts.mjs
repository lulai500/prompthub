#!/usr/bin/env node
// ============================================================
// PromptHub - 中文提示词批量翻译脚本
//
// 用法：
//   1. 确保 .env.local 中填写了真实的 Supabase 凭据
//   2. node scripts/translate-prompts.mjs
//
// 功能：
//   - 检测数据库中包含中文的提示词
//   - 自动翻译 title / description / content / tips 为英文
//   - 更新数据库
//   - 生成翻译前后的对比文件 translate-log.json
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ---- 加载 .env.local ----
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
  console.error('❌ 请先在 .env.local 中填写真实的 Supabase 凭据');
  console.error('   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ---- 中→英翻译映射表 ----
const TRANSLATION_MAP = {
  // 提示词标题常见词汇
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

/**
 * 翻译中文字符串为英文
 * 基于翻译映射表逐词替换 + 清理残余中文
 */
function translateChinese(text) {
  if (!text || !/[一-鿿]/.test(text)) return text;

  let result = text;

  // 1. 替换已知中文词汇（长词优先）
  const sortedKeys = Object.keys(TRANSLATION_MAP).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    result = result.replace(regex, TRANSLATION_MAP[key]);
  }

  // 2. 清理残留的纯中文字符（保留已翻译的英文、数字、标点）
  // 移除连续中文字符块，替换为描述性占位
  result = result.replace(/[一-鿿]+/g, (match) => {
    // 如果还有残留中文，保留原文并标记
    return `[CN:${match}]`;
  });

  // 3. 清理多余空格
  result = result.replace(/\s{2,}/g, ' ').trim();

  return result;
}

/**
 * 翻译整个提示词对象
 */
function translatePrompt(prompt) {
  return {
    id: prompt.id,
    title: translateChinese(prompt.title),
    description: prompt.description ? translateChinese(prompt.description) : null,
    content: translateChinese(prompt.content),
    tips: prompt.tips ? translateChinese(prompt.tips) : null,
  };
}

// ---- 主流程 ----
async function main() {
  console.log('🔍 正在连接 Supabase...');
  console.log(`   URL: ${SUPABASE_URL}`);

  // 1. 查询所有已发布的提示词
  const { data: allPrompts, error } = await supabase
    .from('prompts')
    .select('*')
    .eq('is_published', true);

  if (error) {
    console.error('❌ 查询失败:', error.message);
    process.exit(1);
  }

  console.log(`\n📊 数据库中共有 ${allPrompts.length} 条已发布提示词`);

  // 2. 检测包含中文的提示词
  const chineseRegex = /[一-鿿]/;
  const chinesePrompts = allPrompts.filter(
    (p) =>
      chineseRegex.test(p.title || '') ||
      chineseRegex.test(p.description || '') ||
      chineseRegex.test(p.content || '') ||
      chineseRegex.test(p.tips || '')
  );

  if (chinesePrompts.length === 0) {
    console.log('✅ 没有发现包含中文的提示词，无需翻译！');
    return;
  }

  console.log(`\n🌐 发现 ${chinesePrompts.length} 条包含中文的提示词：`);
  console.log('-'.repeat(60));

  const translations = [];
  const logEntries = [];

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
      original: {
        title: prompt.title,
        description: prompt.description?.slice(0, 100),
        content: prompt.content?.slice(0, 100),
      },
      translated: {
        title: translated.title,
        description: translated.description?.slice(0, 100),
        content: translated.content?.slice(0, 100),
      },
    });

    console.log(`  #${prompt.id} ${prompt.title}`);
    console.log(`     → ${translated.title}`);
  }

  console.log('-'.repeat(60));
  console.log(`\n📝 共需翻译 ${translations.length} 条提示词`);

  // 3. 保存翻译日志
  const logPath = resolve(ROOT, 'translate-log.json');
  writeFileSync(logPath, JSON.stringify(logEntries, null, 2), 'utf-8');
  console.log(`💾 翻译对比日志已保存: ${logPath}`);

  // 4. 确认更新
  console.log('\n⚠️  即将更新数据库中的提示词内容');
  console.log('   此操作不可逆（除非有数据库备份）');

  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');

  if (dryRun) {
    console.log('\n🔍 --dry-run 模式：仅检测，不更新数据库');
    console.log('   移除 --dry-run 并添加 --force 来执行更新');
    return;
  }

  if (!force) {
    console.log('\n💡 请使用 --force 参数确认更新:');
    console.log('   node scripts/translate-prompts.mjs --force');
    console.log('   或先使用 --dry-run 预览翻译结果');
    return;
  }

  // 5. 执行更新
  console.log('\n🚀 正在更新数据库...');
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
      console.error(`  ❌ #${t.id} 更新失败: ${updateError.message}`);
      failed++;
    } else {
      console.log(`  ✅ #${t.id} 更新成功`);
      success++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ 翻译完成！成功: ${success}, 失败: ${failed}`);
  console.log(`📋 详细对比日志: translate-log.json`);
  console.log('='.repeat(60));
}

main().catch((err) => {
  console.error('❌ 脚本执行失败:', err);
  process.exit(1);
});
