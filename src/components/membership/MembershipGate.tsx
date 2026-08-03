// ============================================================
// 会员门控卡片
// 非会员访问会员专属内容时展示：锁图标 + 说明 + 解锁 CTA
// 不泄露任何具体内容（严格"预览不公开"）
// ============================================================

import Link from 'next/link';
import { Lock } from 'lucide-react';

export default function MembershipGate({ label }: { label: string }) {
  return (
    <div className="card p-8 mt-6 text-center">
      <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
        <Lock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
      </div>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
        This {label} is for members
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-5">
        The full {label} content — instructions, steps, config, and examples — is
        available to PromptHub members. Join to unlock it.
      </p>
      <Link href="/pricing" className="btn-primary">
        Unlock with Membership
      </Link>
    </div>
  );
}
