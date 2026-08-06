// ============================================================
// 旧路径重定向：客户详情已迁移到 /admin/clients/[id]
// ============================================================

import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function ClientDetailRedirectPage({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/admin/clients/${params.id}`);
}
