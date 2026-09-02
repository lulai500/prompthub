// ============================================================
// GET /api/sync/backup/[id]   - 下载备份（Bearer，任意 octet）
// DELETE /api/sync/backup/[id] - 删除备份
// ============================================================

import { NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase/admin';
import { downloadBytes, removeBytes } from '@/lib/storage';
import { err, uidFromReq } from '@/lib/api';

type Ctx = { params: { id: string } };

async function ownBackup(uid: number, id: number) {
  const supabase = adminClient();
  const { data } = await supabase.from('backups').select('*').eq('id', id).eq('user_id', uid).maybeSingle();
  return data;
}

export async function GET(req: Request, { params }: Ctx) {
  const uid = uidFromReq(req);
  if (!uid) return err('未登录', 'unauthorized', 401);
  const row = await ownBackup(uid, Number(params.id));
  if (!row) return err('备份不存在', 'not_found', 404);

  const buf = await downloadBytes(row.storage_path);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(row.filename)}"`,
    },
  });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const uid = uidFromReq(req);
  if (!uid) return err('未登录', 'unauthorized', 401);
  const row = await ownBackup(uid, Number(params.id));
  if (!row) return err('备份不存在', 'not_found', 404);

  const supabase = adminClient();
  await supabase.from('backups').delete().eq('id', row.id);
  await removeBytes(row.storage_path);
  return NextResponse.json({ ok: true, data: { id: row.id } });
}
