// ============================================================
// POST /api/auth/register - 邮箱或手机号注册，返回 {token, user}
//   body: { email?, phone?, password }
// ============================================================

import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { adminClient } from '@/lib/supabase/admin';
import { hashPassword } from '@/lib/pass';
import { signToken } from '@/lib/jwt';
import { ok, err } from '@/lib/api';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PHONE_RE = /^1\d{10}$/;

function sha1(input: string): string {
  return crypto.createHash('sha1').update(input).digest('hex');
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || '').trim();
  const phone = String(body.phone || '').trim();
  const password = String(body.password || '');

  if (!password || password.length < 6) {
    return err('密码至少 6 位', 'bad_password');
  }

  const supabase = adminClient();
  const now = Math.floor(Date.now() / 1000);
  const bonus = Number(process.env.REGISTER_BONUS || 0);

  if (email) {
    if (email.length > 120 || !EMAIL_RE.test(email)) return err('请输入正确的邮箱', 'bad_email');
    const existing = await supabase.from('users').select('id').eq('email', email).maybeSingle();
    if (existing.data) return err('该邮箱已注册', 'conflict', 409);

    const ephone = 'E' + sha1(email).slice(0, 20);
    const { data, error } = await supabase
      .from('users')
      .insert({
        phone: ephone,
        password_hash: hashPassword(password),
        points: bonus,
        created_at: now,
        email,
        name: email.split('@')[0],
      })
      .select()
      .single();
    if (error) return err('注册失败', 'db_error', 500);
    return ok({ token: signToken(data.id), user: userOut(data) });
  }

  if (!PHONE_RE.test(phone)) return err('请输入正确的 11 位手机号', 'bad_phone');
  const existing = await supabase.from('users').select('id').eq('phone', phone).maybeSingle();
  if (existing.data) return err('该手机号已注册', 'conflict', 409);

  const { data, error } = await supabase
    .from('users')
    .insert({
      phone,
      password_hash: hashPassword(password),
      points: bonus,
      created_at: now,
      email: null,
      name: '',
    })
    .select()
    .single();
  if (error) return err('注册失败', 'db_error', 500);
  return ok({ token: signToken(data.id), user: userOut(data) });
}

function userOut(row: Record<string, unknown>) {
  return {
    id: row.id,
    phone: row.phone || '',
    email: row.email || '',
    name: row.name || '',
    points: Number(row.points || 0),
  };
}
