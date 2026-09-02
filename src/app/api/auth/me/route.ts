// ============================================================
// GET /api/auth/me - 当前用户信息（Bearer），返回 {user}
// ============================================================

import { adminClient } from '@/lib/supabase/admin';
import { ok, err, uidFromReq } from '@/lib/api';

export async function GET(req: Request) {
  const uid = uidFromReq(req);
  if (!uid) return err('未登录', 'unauthorized', 401);

  const supabase = adminClient();
  const { data, error } = await supabase.from('users').select('*').eq('id', uid).maybeSingle();
  if (error || !data) return err('用户不存在', 'not_found', 404);

  return ok({
    user: {
      id: data.id,
      phone: data.phone || '',
      email: data.email || '',
      name: data.name || '',
      points: Number(data.points || 0),
    },
  });
}
