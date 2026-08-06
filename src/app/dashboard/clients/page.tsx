// ============================================================
// 旧路径重定向：客户管理后台已迁移到 /admin/clients
// ============================================================

import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function ClientsRedirectPage() {
  redirect('/admin/clients');
}
