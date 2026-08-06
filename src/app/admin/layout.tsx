// ============================================================
// 管理后台 - 独立壳层（与主站分离）
// owner 专属：未登录 → /auth/login；非 owner → /
// 根布局已按 x-admin 标记跳过公共 Header/Footer，这里提供管理壳
// ============================================================

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Shield, ExternalLink } from 'lucide-react';
import { createServerSupabaseClient, getCurrentRole } from '@/lib/supabase/server';
import AdminSignOutButton from '@/components/admin/AdminSignOutButton';

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const role = await getCurrentRole();
  if (role !== 'owner') redirect('/');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-900">
      {/* 顶栏 */}
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-dark-700 bg-white/80 dark:bg-dark-900/80 backdrop-blur-md">
        <div className="container-page h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white truncate">
              PromptHub Admin
            </span>
          </div>
          <nav className="flex items-center gap-1 flex-wrap justify-end">
            <Link
              href="/admin/clients"
              className="px-3 py-1.5 rounded-md text-sm font-medium bg-brand-600 text-white"
            >
              Clients
            </Link>
            <Link
              href="/"
              className="px-3 py-1.5 rounded-md text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-700 flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Main site
            </Link>
            <AdminSignOutButton />
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
