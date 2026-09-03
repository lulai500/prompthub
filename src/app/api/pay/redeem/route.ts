// ============================================================
// POST /api/pay/redeem - 兑换码，返回 {points_added, balance}
//   Bearer + body: { code }
//  - codes.multi=1：福利码，每账号限兑一次（code_redemptions 记录）
//  - codes.multi=0：普通兑换码，单次使用（status new→used）
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

  const { data: codeRow } = await supabase.from('codes').select('*').eq('code', code).maybeSingle();
  if (!codeRow) return err('兑换码无效', 'invalid_code', 400);

  // 福利码（multi=1）：每账号限兑一次
  if (Number(codeRow.multi) === 1) {
    const { data: existed } = await supabase
      .from('code_redemptions').select('id').eq('code_id', codeRow.id).eq('user_id', uid).maybeSingle();
    if (existed) return err('该福利已领取过', 'already_redeemed', 400);

    const { data: me } = await supabase.from('users').select('points').eq('id', uid).maybeSingle();
    const cur = Number(me?.points || 0);
    const added = Number(codeRow.points || 0);
    const newBal = cur + added;
    await supabase.from('users').update({ points: newBal }).eq('id', uid);
    await supabase.from('code_redemptions').insert({ code_id: codeRow.id, user_id: uid, created_at: now });
    return ok({ points_added: added, balance: newBal });
  }

  // 普通兑换码（multi=0）：单次使用
  if (codeRow.status !== 'new') return err('兑换码无效或已被使用', 'invalid_code', 400);
  const { error: claimErr } = await supabase
    .from('codes').update({ status: 'used', used_by: uid, used_at: now })
    .eq('id', codeRow.id).eq('status', 'new');
  if (claimErr) return err('兑换码无效或已被使用', 'invalid_code', 400);

  const { data: me } = await supabase.from('users').select('points').eq('id', uid).maybeSingle();
  const cur = Number(me?.points || 0);
  const added = Number(codeRow.points || 0);
  const newBal = cur + added;
  await supabase.from('users').update({ points: newBal }).eq('id', uid);

  return ok({ points_added: added, balance: newBal });
}
