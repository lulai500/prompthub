// ============================================================
// POST /api/newsletter/subscribe
// 订阅周报：校验邮箱 → 存入 Supabase newsletter_subscribers
// 可选：配置 BUTTONDOWN_API_KEY 后同步到 Buttondown（真正发送邮件）
// ============================================================

import { NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: Request) {
  // ---- 限流：每 IP 3 次/分钟 ----
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = checkRateLimit(`newsletter:${ip}`, 3, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  // ---- 解析请求体 ----
  let body: { email?: string; source?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() || '';
  const source = body.source || 'footer';

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: 'Please enter a valid email address.' },
      { status: 400 }
    );
  }

  // ---- 写入订阅表（RLS 允许匿名 INSERT）----
  const supabase = createAnonClient();
  const { error } = await supabase
    .from('newsletter_subscribers')
    .insert({ email, source });

  if (error) {
    // 23505 = unique 约束冲突（已订阅）→ 幂等返回成功
    if (error.code === '23505') {
      return NextResponse.json({ ok: true, message: 'already-subscribed' });
    }
    return NextResponse.json(
      { error: 'Failed to subscribe. Please try again.' },
      { status: 500 }
    );
  }

  // ---- 可选：同步到 Buttondown（配置密钥后才生效）----
  const buttondownKey = process.env.BUTTONDOWN_API_KEY;
  if (buttondownKey) {
    await fetch('https://api.buttondown.email/v1/subscribers', {
      method: 'POST',
      headers: {
        Authorization: `Token ${buttondownKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email_address: email, tags: [source] }),
    }).catch(() => {
      // 同步失败不阻塞订阅；Supabase 已落库
    });
  }

  return NextResponse.json({ ok: true });
}
