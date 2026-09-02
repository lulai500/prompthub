// ============================================================
// 小精霊 - 密码哈希/校验（PBKDF2-SHA256，Node 内置 crypto，无新依赖）
// 存储格式：salt:hash（十六进制）
// ============================================================

import crypto from 'crypto';

const ITER = 100000;
const KEYLEN = 32;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, ITER, KEYLEN, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(stored: string, password: string): boolean {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const test = crypto.pbkdf2Sync(password, salt, ITER, KEYLEN, 'sha256').toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(test, 'hex'));
  } catch {
    return false;
  }
}
