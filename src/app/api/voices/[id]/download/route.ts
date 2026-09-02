// ============================================================
// GET /api/voices/[id]/download - 下载音源包 zip（Bearer）
// ============================================================

import { NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase/admin';
import { downloadBytes } from '@/lib/storage';
import { err, uidFromReq } from '@/lib/api';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const uid = uidFromReq(req);
  if (!uid) return err('未登录', 'unauthorized', 401);

  const supabase = adminClient();
  const { data } = await supabase.from('voices').select('*').eq('id', Number(params.id)).maybeSingle();
  if (!data || data.enabled !== 1) return err('音源不存在', 'not_found', 404);

  const buf = await downloadBytes(data.zip_file);
  // 下载数 +1
  await supabase.from('voices').update({ downloads: (data.downloads || 0) + 1 }).eq('id', data.id);

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(data.name)}.zip"`,
    },
  });
}
