// ============================================================
// 小精霊 - API Route Handlers 公共响应/鉴权助手
// 响应形状与 Flask 一致：ok(data) / err(error, code, status)
// ============================================================

import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';

export function ok(data: unknown) {
  return NextResponse.json({ ok: true, data });
}

export function err(error: string, code = 'error', status = 400) {
  return NextResponse.json({ ok: false, error, code }, { status });
}

/** 从 Authorization: Bearer <token> 解出 uid；无/无效返回 null */
export function uidFromReq(req: Request): number | null {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;
  return verifyToken(token);
}
