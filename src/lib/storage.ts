// ============================================================
// 小精霊 - Supabase Storage 助手（service_role，绕过 RLS）
// bucket 名用 SUPABASE_STORAGE_BUCKET，默认 app-files；首次自动建桶
// ============================================================

import { adminClient } from '@/lib/supabase/admin';

export function bucketName(): string {
  return process.env.SUPABASE_STORAGE_BUCKET || 'app-files';
}

async function ensureBucket(supabase = adminClient()) {
  const { data } = await supabase.storage.getBucket(bucketName());
  if (!data) {
    await supabase.storage.createBucket(bucketName(), { public: false });
  }
}

export async function uploadBytes(path: string, bytes: Buffer, contentType = 'application/zip') {
  const supabase = adminClient();
  await ensureBucket(supabase);
  const { error } = await supabase.storage.from(bucketName()).upload(path, bytes, {
    upsert: true,
    contentType,
  });
  if (error) throw error;
}

export async function downloadBytes(path: string): Promise<Buffer> {
  const supabase = adminClient();
  const { data, error } = await supabase.storage.from(bucketName()).download(path);
  if (error || !data) throw error || new Error('对象不存在');
  return Buffer.from(await data.arrayBuffer());
}

export async function removeBytes(path: string) {
  const supabase = adminClient();
  await supabase.storage.from(bucketName()).remove([path]);
}
