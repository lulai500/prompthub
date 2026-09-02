// ============================================================
// POST /api/auth/google - 谷歌登录
//   body: { id_token }
//   用 Google tokeninfo 做服务端校验（验签+返回声明），aud 需匹配 GOOGLE_CLIENT_ID
// ============================================================

import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { adminClient } from '@/lib/supabase/admin';
import { signToken } from '@/lib/jwt';
import { ok, err } from '@/lib/api';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const BONUS = Number(process.env.REGISTER_BONUS || 0);

function sha1(s: string) {
  return crypto.createHash('sha1').update(s).digest('hex');
}

export async function POST(req: NextRequest) {
  if (!GOOGLE_CLIENT_ID) return err('谷歌登录未启用', 'google_not_configured', 503);

  const body = await req.json().catch(() => ({}));
  const idToken = String(body.id_token || '').trim();
  if (!idToken) return err('缺少谷歌凭证', 'bad_google_token', 400);

  let info: Record<string, unknown>;
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!res.ok) return err('谷歌凭证校验失败', 'bad_google_token', 401);
    info = await res.json();
  } catch {
    return err('谷歌凭证校验失败', 'bad_google_token', 401);
  }

  const aud = String(info.aud || '');
  if (!aud.split(',').map((a) => a.trim()).includes(GOOGLE_CLIENT_ID)) {
    return err('谷歌凭证校验失败', 'bad_google_token', 401);
  }
  if (String(info.email_verified) !== 'true') return err('谷歌邮箱未验证', 'bad_google_token', 401);

  const sub = String(info.sub || '');
  const email = String(info.email || '');
  const name = String(info.name || '');
  if (!sub) return err('谷歌凭证缺少 sub', 'bad_google_token', 400);

  const supabase = adminClient();
  const now = Math.floor(Date.now() / 1000);
  let user;
  const { data: existing } = await supabase.from('users').select('*').eq('google_sub', sub).maybeSingle();
  if (existing) {
    if ((existing.email || '') !== email || (existing.name || '') !== name) {
      await supabase.from('users').update({ email, name }).eq('id', existing.id);
    }
    user = { ...existing, email, name };
  } else {
    const { data, error } = await supabase
      .from('users')
      .insert({
        phone: 'G' + sha1(sub).slice(0, 20),
        password_hash: '',
        points: BONUS,
        created_at: now,
        google_sub: sub,
        email,
        name,
      })
      .select()
      .single();
    if (error) return err('注册失败', 'db_error', 500);
    user = data;
  }

  return ok({
    token: signToken(user.id),
    user: {
      id: user.id,
      phone: user.phone || '',
      email: user.email || '',
      name: user.name || '',
      points: Number(user.points || 0),
    },
  });
}
