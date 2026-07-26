// ============================================================
// Supabase 未配置时的占位提示组件
// ============================================================

import Link from 'next/link';
import { Database } from 'lucide-react';

export default function SupabaseMissing() {
  return (
    <div className="container-page py-20 text-center">
      <Database className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-6" />
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
        Database Not Configured
      </h2>
      <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
        Supabase environment variables are not set. Add{' '}
        <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-dark-700 text-brand-600 dark:text-brand-400 text-sm">
          NEXT_PUBLIC_SUPABASE_URL
        </code>{' '}
        and{' '}
        <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-dark-700 text-brand-600 dark:text-brand-400 text-sm">
          NEXT_PUBLIC_SUPABASE_ANON_KEY
        </code>{' '}
        to your Vercel environment variables.
      </p>
      <Link href="/" className="btn-primary text-sm">
        Go Home
      </Link>
    </div>
  );
}
