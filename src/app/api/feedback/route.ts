// ============================================================
// POST /api/feedback — 用户反馈（写库 + 邮件通知站主）
// 写 feedback 表；若配置了 RESEND_API_KEY，发邮件到 FEEDBACK_TO_EMAIL。
// 邮件失败不影响入库（feedback 永远保存）。
// ============================================================

import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const FEEDBACK_TYPES = ['suggestion', 'bug_report', 'feature_request', 'other'];

export async function POST(request: Request) {
  // 限流（按 IP，10 次/5 分钟）
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = checkRateLimit(`feedback:${ip}`, 10, 5 * 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const title = (body.title || '').toString().trim().slice(0, 200);
  const message = (body.message || '').toString().trim().slice(0, 5000);
  const type = FEEDBACK_TYPES.includes(body.type) ? body.type : 'other';
  const email = (body.email || '').toString().trim().slice(0, 200) || null;

  if (!title || !message) {
    return NextResponse.json({ error: 'Title and message are required.' }, { status: 400 });
  }

  // 登录用户关联（API 路由经 cookie 会话读取）
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 写库
  const admin = createAdminClient();
  const { error: insertErr } = await admin.from('feedback').insert({
    user_id: user?.id ?? null,
    type,
    title,
    message,
    email,
  });
  if (insertErr) {
    return NextResponse.json({ error: 'Failed to submit feedback.' }, { status: 500 });
  }

  // 邮件通知（配置了 RESEND_API_KEY 才发）
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const to = process.env.FEEDBACK_TO_EMAIL || '3193474203@qq.com';
    const from = process.env.FEEDBACK_FROM_EMAIL || 'PromptHub Feedback <onboarding@resend.dev>';
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to: [to],
          subject: `[PromptHub] Feedback (${type}): ${title}`,
          text: `Type: ${type}\nReporter: ${email || '(anonymous)'}\n\n${message}`,
        }),
      });
    } catch {
      // 邮件失败不影响反馈入库
    }
  }

  return NextResponse.json({ ok: true });
}
