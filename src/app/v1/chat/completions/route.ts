// ============================================================
// POST /v1/chat/completions - OpenAI 兼容 AI 代理（非流式）
//   Bearer + body: { model, messages }
//   转发到 DashScope qwen3.7-flash（MODEL_REDIRECT 统一），按用量扣点，写 ai_usage
//   注意：Vercel serverless 不支持真流式，这里是整段返回；耗时取决于模型
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase/admin';
import { ok, err, uidFromReq } from '@/lib/api';

export const maxDuration = 60;

const DASHSCOPE = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
const REDIRECT = 'qwen3.7-flash'; // MODEL_REDIRECT 统一到千问 3.7 flash
const POINTS_PER_1000 = Number(process.env.POINTS_PER_1000_TOKENS || 1);

export async function POST(req: NextRequest) {
  const uid = uidFromReq(req);
  if (!uid) return err('未登录', 'unauthorized', 401);

  const key = process.env.DASHSCOPE_API_KEY;
  if (!key) return err('AI 服务未配置', 'ai_not_configured', 503);

  const body = await req.json().catch(() => ({}));
  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) return err('缺少消息', 'bad_request');

  const supabase = adminClient();

  // 余额检查
  const { data: me } = await supabase.from('users').select('points').eq('id', uid).maybeSingle();
  const points = Number(me?.points || 0);
  if (points <= 0) {
    return NextResponse.json(
      { ok: false, error: '点数不足，请充值', code: 'insufficient_points' },
      { status: 402 }
    );
  }

  // 转发上游（OpenAI 兼容）
  const upResp = await fetch(`${DASHSCOPE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: REDIRECT,
      messages,
      temperature: 0.7,
      stream: false,
    }),
  });

  if (!upResp.ok) {
    return err(`上游出错 ${upResp.status}`, 'upstream_error', 502);
  }

  const data = await upResp.json();
  const total = Number(data?.usage?.total_tokens || 0);
  const cost = Math.max(1, Math.ceil(total / 1000)) * POINTS_PER_1000;

  // 扣点 + 记录
  await supabase.from('users').update({ points: Math.max(0, points - cost) }).eq('id', uid);
  await supabase.from('ai_usage').insert({
    user_id: uid,
    provider: 'dashscope',
    model: REDIRECT,
    prompt_tokens: Number(data?.usage?.prompt_tokens || 0),
    completion_tokens: Number(data?.usage?.completion_tokens || 0),
    points_charged: cost,
    created_at: Math.floor(Date.now() / 1000),
  });

  return NextResponse.json({ ...data, _charged_points: cost, _balance: Math.max(0, points - cost) });
}
