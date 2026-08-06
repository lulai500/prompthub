// ============================================================
// 客户工作站 - 共享工具（临时密码等）
// ============================================================

import { randomBytes } from 'crypto';

/** 生成 12 位临时密码（去歧义字符，含大小写与数字） */
export function generateTempPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = randomBytes(12);
  let pwd = '';
  for (let i = 0; i < 12; i++) pwd += alphabet[bytes[i] % alphabet.length];
  // 确保含大小写与数字，满足常见强度要求
  if (!/[A-Z]/.test(pwd) || !/[a-z]/.test(pwd) || !/[0-9]/.test(pwd)) {
    return 'A' + pwd.slice(1, 9) + '7' + pwd.slice(9);
  }
  return pwd;
}
