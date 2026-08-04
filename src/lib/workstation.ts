// ============================================================
// 客户工作站 - 服务端助手
// AI 调用 / 消息组装 / 客户身份 / 统计聚合
// 供 /api/workstation/execute 与 workstation/dashboard 页面共用
// ============================================================

import { fillVariables, estimateTokens } from '@/lib/prompt-utils';
import type { Client, ClientProject, ClientTask } from '@/types';

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
