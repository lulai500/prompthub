// ============================================================
// GET /api/voices - 音源商店列表（Bearer），返回 {voices:[...]}
// ============================================================

import { adminClient } from '@/lib/supabase/admin';
import { ok, err, uidFromReq } from '@/lib/api';

export async function GET(req: Request) {
  const uid = uidFromReq(req);
  if (!uid) return err('未登录', 'unauthorized', 401);

  const supabase = adminClient();
  const { data } = await supabase
    .from('voices')
    .select('id, name, category, summary, price, file_size, sample_file, engine_voice, pitch, rate, sentences_count, downloads')
    .eq('enabled', 1)
    .order('id', { ascending: true });

  return ok({ voices: data || [] });
}
