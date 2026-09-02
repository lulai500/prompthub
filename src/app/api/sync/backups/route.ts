// ============================================================
// GET /api/sync/backups - 我的备份列表（Bearer），返回 {backups:[...]}
// ============================================================

import { adminClient } from '@/lib/supabase/admin';
import { ok, err, uidFromReq } from '@/lib/api';

export async function GET(req: Request) {
  const uid = uidFromReq(req);
  if (!uid) return err('未登录', 'unauthorized', 401);

  const supabase = adminClient();
  const { data } = await supabase
    .from('backups')
    .select('id, filename, size, note, created_at')
    .eq('user_id', uid)
    .order('id', { ascending: false });

  return ok({ backups: data || [] });
}
