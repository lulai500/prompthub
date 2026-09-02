// ============================================================
// 小精霊 - JWT 签发/校验（HS256，Node 内置 crypto，无新依赖）
// token 载荷 {uid, iat, exp}，与 Flask make_token 语义一致
// ============================================================

import crypto from 'crypto';

const secret = process.env.JWT_SECRET || 'dev-secret-change-me';

function b64u(input: string): string {
  return Buffer.from(input).toString('base64url');
}

/** 给用户签发 JWT（默认 180 天） */
export function signToken(uid: number, expDays = 180): string {
  const header = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64u(JSON.stringify({ uid, iat: now, exp: now + expDays * 86400 }));
  const sig = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
}

/** 校验 JWT，返回 uid；无效或过期返回 null */
export function verifyToken(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payload, sig] = parts;
    const expect = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
    if (expect.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!data || typeof data.uid !== 'number') return null;
    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) return null;
    return data.uid;
  } catch {
    return null;
  }
}
