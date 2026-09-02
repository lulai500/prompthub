// ============================================================
// POST /api/auth/login - 邮箱或手机号登录，返回 {token, user}
//   body: { email?, phone?, password }
// ============================================================

import { NextRequest } from 'next/server';
import { adminClient } from '@/lib/supabase/admin';
import { verifyPassword } from '@/lib/pass';
import { signToken } from '@/lib/jwt';
import { ok, err } from '@/lib/api';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || '').trim();
  const phone = String(body.phone || '').trim();
  const password = String(body.password || '');

  const supabase = adminClient();
  let user;
  if (email) {
    const { data } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
    user = data;
  } else {
    const { data } = await supabase.from('users').select('*').eq('phone', phone).maybeSingle();
    user = data;
  }

  if (!user || !verifyPassword(user.password_hash, password)) {
    return err('邮箱/手机号或密码错误', 'bad_credentials', 401);
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
