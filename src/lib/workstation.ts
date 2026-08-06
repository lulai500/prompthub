// ============================================================
// 客户工作站 - 服务端助手
// AI 调用 / 消息组装 / 客户身份 / 统计聚合
// 供 /api/workstation/tasks 系列（start/run/status）与工作站页面共用
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import { fillVariables, estimateTokens } from '@/lib/prompt-utils';
import type { Client, ClientProject, ClientTask, WorkflowStep } from '@/types';

/** DeepSeek 调用返回 */
export interface DeepSeekResult {
  text: string;
  tokens: number;
}

/**
 * 调用 DeepSeek chat API
 * - 超时 50s（AbortController），429/5xx 退避重试一次
 * - key 读取 DEEPSEEK_API_KEY（Vercel 推荐）或 DEEPSEEK_KEY（旧脚本用）
 * - 未配置 key 时抛 NO_KEY 错误，调用方降级为"组装方案"
 */
export async function callDeepSeek(
  messages: { role: string; content: string }[],
  opts: { maxTokens?: number; temperature?: number } = {}
): Promise<DeepSeekResult> {
  const key = process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_KEY;
  if (!key) {
    throw Object.assign(new Error('DEEPSEEK not configured'), { code: 'NO_KEY' });
  }

  const body = JSON.stringify({
    model: 'deepseek-v4-flash',
    messages,
    max_tokens: opts.maxTokens ?? 1024,
    temperature: opts.temperature ?? 0.7,
    // V4 Flash 默认 thinking，工作台直接生成内容需显式关闭（否则推理占 token 且 content 为空）
    thinking: { type: 'disabled' },
  });

  const post = async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 50_000);
    try {
      return await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  };

  let res = await post();
  // 429/5xx → 退避重试一次
  if (res.status === 429 || res.status >= 500) {
    await new Promise((r) => setTimeout(r, 2000));
    res = await post();
  }
  if (!res.ok) {
    throw new Error(`DeepSeek HTTP ${res.status}`);
  }

  const j = await res.json();
  const text: string | undefined = j.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('DeepSeek empty response');
  return { text, tokens: j.usage?.total_tokens ?? estimateTokens(text) };
}

/**
 * 组装 AI 消息：
 * system = 最相关提示词内容（变量用客户输入填充，缺变量保留占位符），
 * 无提示词时回退到任务标题+描述；user = 客户原始输入
 */
export function buildAiMessages(
  promptContent: string | null | undefined,
  taskTitle: string,
  taskDescription: string,
  userInput: string
): { role: string; content: string }[] {
  let system: string;
  if (promptContent) {
    system = fillVariables(promptContent, {
      input: userInput,
      topic: userInput,
      query: userInput,
      text: userInput,
      content: userInput,
    });
  } else {
    system = `You are an expert assistant. Task: ${taskTitle}. ${taskDescription}`;
  }
  return [
    { role: 'system', content: system },
    { role: 'user', content: userInput },
  ];
}

// ============================================================
// Pro 客户专用：把匹配到的 skill/workflow 全文取出来，
// 拼进 AI 生成消息（仅服务端使用，绝不进 API 响应/公开缓存）
// ============================================================

export interface ProSkillContent {
  id: number;
  title: string;
  description: string | null;
  content: string;
  skill_format: string;
}

export interface ProWorkflowContent {
  id: number;
  title: string;
  description: string | null;
  steps: WorkflowStep[];
  workflow_type: string;
  config_content: string | null;
  expected_output: string | null;
  tools_required: string[];
}

export interface ProAssetContent {
  skills: ProSkillContent[];
  workflows: ProWorkflowContent[];
}

/**
 * 按传入顺序取 top 3 技能/工作流的全文（admin 直查，不走公开缓存）。
 * 仅限 Pro 客户生成消息使用；.in() 不保序，用 Map 重排回传入顺序。
 */
export async function getProAssetContents(
  admin: SupabaseClient,
  skills: { id: number }[],
  workflows: { id: number }[]
): Promise<ProAssetContent> {
  const skillIds = skills.slice(0, 3).map((s) => s.id);
  const workflowIds = workflows.slice(0, 3).map((w) => w.id);

  const [skillRes, workflowRes] = await Promise.all([
    skillIds.length
      ? admin
          .from('skills')
          .select('id, title, description, content, skill_format')
          .in('id', skillIds)
          .eq('is_published', true)
      : Promise.resolve({ data: [] }),
    workflowIds.length
      ? admin
          .from('workflows')
          .select('id, title, description, steps, workflow_type, config_content, expected_output, tools_required')
          .in('id', workflowIds)
          .eq('is_published', true)
      : Promise.resolve({ data: [] }),
  ]);

  const skillMap = new Map((skillRes.data || []).map((r) => [Number(r.id), r]));
  const workflowMap = new Map((workflowRes.data || []).map((r) => [Number(r.id), r]));

  return {
    skills: skillIds.map((id) => skillMap.get(id)).filter(Boolean) as ProSkillContent[],
    workflows: workflowIds.map((id) => workflowMap.get(id)).filter(Boolean) as ProWorkflowContent[],
  };
}

/**
 * Pro 客户的消息组装：prompt（变量填充）→ skills 全文 → workflows 全文。
 * 缺失段自动跳过；skill/workflow 内容不做 fillVariables（参考文档，非模板）。
 */
export function buildProAiMessages(input: {
  promptContent: string | null | undefined;
  taskTitle: string;
  taskDescription: string;
  userInput: string;
  skills: ProSkillContent[];
  workflows: ProWorkflowContent[];
}): { role: string; content: string }[] {
  const { promptContent, taskTitle, taskDescription, userInput, skills, workflows } = input;
  const sections: string[] = [];

  // 0) 基底角色 + 主指令（prompt，变量填充）
  let base = `You are an expert assistant. Task: ${taskTitle}. ${taskDescription}`;
  if (promptContent) {
    base += `\n\n${fillVariables(promptContent, {
      input: userInput,
      topic: userInput,
      query: userInput,
      text: userInput,
      content: userInput,
    })}`;
  }
  sections.push(base);

  // 1) 技能：能力/参考
  if (skills.length) {
    sections.push(
      `=== RELEVANT SKILLS — apply these techniques when applicable ===\n` +
        skills
          .map((s, i) => {
            let b = `### ${i + 1}. ${s.title} [${s.skill_format}]`;
            if (s.description) b += `\n${s.description}`;
            b += `\n${s.content}`;
            return b;
          })
          .join('\n\n')
    );
  }

  // 2) 工作流：过程/顺序
  if (workflows.length) {
    sections.push(
      `=== RECOMMENDED WORKFLOW — follow these steps ===\n` +
        workflows
          .map((w, i) => {
            let b = `### ${i + 1}. ${w.title} [${w.workflow_type}]`;
            if (w.description) b += `\n${w.description}`;
            if (w.steps?.length) {
              b += '\nSteps:';
              for (const st of w.steps) {
                b += `\n${st.step}. [${st.tool}] ${st.title} — ${st.action}` + (st.config ? ` (config: ${st.config})` : '');
              }
            }
            if (w.tools_required?.length) b += `\nTools required: ${w.tools_required.join(', ')}`;
            if (w.expected_output) b += `\nExpected output: ${w.expected_output}`;
            if (w.config_content) b += `\nConfig: ${w.config_content}`;
            return b;
          })
          .join('\n\n')
    );
  }

  return [
    { role: 'system', content: sections.filter(Boolean).join('\n\n') },
    { role: 'user', content: userInput },
  ];
}

/** 任务状态统计（客户 & 站主两侧共用） */
export interface TaskStats {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  failed: number;
  tokens: number;
  /** 近 7 天每日任务数（按 created_at 本地日分桶，长度 7，旧→新） */
  daily: number[];
  /** 近 7 天每日完成数 */
  dailyCompleted: number[];
}

export function computeTaskStats(tasks: ClientTask[]): TaskStats {
  const stats: TaskStats = {
    total: tasks.length,
    pending: 0,
    in_progress: 0,
    completed: 0,
    failed: 0,
    tokens: 0,
    daily: Array.from({ length: 7 }, () => 0),
    dailyCompleted: Array.from({ length: 7 }, () => 0),
  };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // 7 个日桶的起始时间（本地时区）
  const buckets = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  for (const t of tasks) {
    if (t.status === 'pending') stats.pending++;
    else if (t.status === 'in_progress') stats.in_progress++;
    else if (t.status === 'completed') stats.completed++;
    else if (t.status === 'failed') stats.failed++;
    if (t.tokens) stats.tokens += t.tokens;

    const created = new Date(t.created_at);
    created.setHours(0, 0, 0, 0);
    const idx = buckets.findIndex((d) => d.getTime() === created.getTime());
    if (idx >= 0) {
      stats.daily[idx]++;
      if (t.status === 'completed') stats.dailyCompleted[idx]++;
    }
  }
  return stats;
}

/** 客户名（带省略截断） */
export function clientTitle(input: string, fallback = 'Untitled task'): string {
  const t = (input || '').replace(/\s+/g, ' ').trim();
  if (!t) return fallback;
  return t.length > 60 ? t.slice(0, 60).trimEnd() + '…' : t;
}

/**
 * DeepSeek 调用失败 → 面向客户的友好文案（海外客户，英文）。
 * 不要把 HTTP 码/内部错误直接透传给客户；统一映射为可操作提示。
 */
export function mapDeepSeekError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  const code = (err as { code?: string } | null)?.code;
  if (code === 'NO_KEY') {
    return 'AI generation is not configured yet. Contact the account owner.';
  }
  if (message.includes('429')) {
    return 'The AI service is busy right now. Click Retry in a minute.';
  }
  if (
    message.includes('abort') ||
    message.includes('AbortError') ||
    message.toLowerCase().includes('timeout')
  ) {
    return 'Generation took too long. Click Retry to try again.';
  }
  if (message.includes('empty')) {
    return 'The AI returned an empty result. Click Retry or rephrase your task.';
  }
  if (message.includes('HTTP 502') || message.includes('HTTP 503') || message.includes('HTTP 504')) {
    return 'The AI service had a temporary problem. Click Retry.';
  }
  return 'Generation failed. Click Retry to try again.';
}
