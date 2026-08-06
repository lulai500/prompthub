'use client';
// ============================================================
// 管理后台登出按钮（与 Header 同款，登出后回主站首页）
// ============================================================

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function AdminSignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="px-3 py-1.5 rounded-md text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-1.5 transition-colors"
    >
      <LogOut className="w-3.5 h-3.5" />
      Sign out
    </button>
  );
}
