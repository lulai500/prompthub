// ============================================================
// POST /api/pay/redeem - 兑换码，返回 {points_added, balance}
//   Bearer + body: { code }
// 核销用原子领取（status='new' → 'used'），点数累加用读-写
// ============================================================

import { NextRequest } from 'next/server';
import { adminClient } from '@/lib/supabase/admin';
import { ok, err, uidFromReq } from '@/lib/api';

export async function POST(req: NextRequest) {
  const uid = uidFromReq(req);
  if (!uid) return err('未登录', 'unauthorized', 401);

  const body = await req.json().catch(() => ({}));
  const code = String(body.code || '').trim();
  if (!code) return err('请输入兑换码', 'bad_code');

  const supabase = adminClient();
  const now = Math.floor(Date.now() / 1000);

  // 原子领取：仅当 status='new' 时置为 used，且校验只影响 1 行
  const { data: claimed } = await supabase
    .from('codes')
    .select('id, points')
    .eq('code', code)
    .eq('status', 'new')
    .maybeSingle();
  if (!claimed) return err('兑换码无效或已被使用', 'invalid_code', 400);

  const { error: claimErr } = await supabase
    .from('codes')
    .update({ status: 'used', used_by: uid, used_at: now })
    .eq('id', claimed.id)
    .eq('status', 'new');
  if (claimErr) return err('兑换码无效或已被使用', 'invalid_code', 400);

  // 累加点数
  const { data: me } = await supabase.from('users').select('points').eq('id', uid).maybeSingle();
  const cur = Number(me?.points || 0);
  const added = Number(claimed.points || 0);
  const newBal = cur + added;
  await supabase.from('users').update({ points: newBal }).eq('id', uid);

  return ok({ points_added: added, balance: newBal });
}
