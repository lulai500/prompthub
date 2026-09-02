// ============================================================
// POST /api/sync/backup - 上传备份（multipart: file + note）
//   Bearer；返回 {id}
// ============================================================

import { NextRequest } from 'next/server';
import { adminClient } from '@/lib/supabase/admin';
import { uploadBytes } from '@/lib/storage';
import { ok, err, uidFromReq } from '@/lib/api';

const MAX_BACKUP_BYTES = 100 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const uid = uidFromReq(req);
  if (!uid) return err('未登录', 'unauthorized', 401);

  const form = await req.formData().catch(() => null);
  const file = form?.get('file') as File | null;
  const note = String(form?.get('note') || '').slice(0, 200);
  if (!file) return err('缺少文件', 'bad_request');

  if (file.size > MAX_BACKUP_BYTES) return err('文件过大', 'too_large', 413);
  const buf = Buffer.from(await file.arrayBuffer());
  const filename = file.name || 'backup.zip';
  const storagePath = `backups/${uid}/${Date.now()}-${filename}`;

  try {
    await uploadBytes(storagePath, buf, 'application/zip');
  } catch (e) {
    return err('上传失败', 'storage_error', 500);
  }

  const supabase = adminClient();
  const { data, error } = await supabase
    .from('backups')
    .insert({
      user_id: uid,
      filename,
      size: buf.length,
      note,
      created_at: Math.floor(Date.now() / 1000),
      storage_path: storagePath,
    })
    .select('id')
    .single();
  if (error) return err('保存失败', 'db_error', 500);

  return ok({ id: data.id });
}
