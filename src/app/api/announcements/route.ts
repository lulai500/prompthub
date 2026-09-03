// ============================================================
// GET /api/announcements - 公告/福利列表（Bearer），返回 {announcements:[...]}
// ============================================================

import { adminClient } from '@/lib/supabase/admin';
import { ok, err, uidFromReq } from '@/lib/api';

export async function GET(req: Request) {
  const uid = uidFromReq(req);
  if (!uid) return err('未登录', 'unauthorized', 401);

  const supabase = adminClient();
  const { data } = await supabase
    .from('announcements')
    .select('id, kind, title, body, code, points, created_at')
    .eq('enabled', 1)
    .order('id', { ascending: false })
    .limit(10);

  return ok({ announcements: data || [] });
}
