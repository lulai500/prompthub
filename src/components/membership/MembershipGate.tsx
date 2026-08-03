// ============================================================
// 会员门控卡片
// 非会员访问会员专属内容时展示：锁图标 + 说明 + 解锁 CTA
// 可传入 preview 显示内容开头的一小段（渐变遮罩截断），
// 完整内容仅会员可见
// ============================================================

import Link from 'next/link';
import { Lock } from 'lucide-react';

export default function MembershipGate({
  label,
  preview,
}: {
  label: string;
  preview?: string;
}) {
  return (
    <div className="card p-6 mt-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          This {label} is for members
        </h2>
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        The full {label} content is available to PromptHub members. Join to unlock it.
      </p>

      {/* 部分免费预览（渐变遮罩截断，不泄露完整内容） */}
      {preview && (
        <div className="relative rounded-xl bg-slate-100 dark:bg-dark-800 border border-slate-200 dark:border-dark-700">
          <pre className="p-4 text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed max-h-32 overflow-hidden select-none">
            {preview}
          </pre>
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-slate-100 dark:from-dark-800 to-transparent pointer-events-none" />
        </div>
      )}

      <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
        Preview only — the full {label} unlocks with membership.
      </p>

      <Link href="/pricing" className="btn-primary mt-4 inline-flex items-center gap-2">
        <Lock className="w-4 h-4" />
        Unlock with Membership
      </Link>
    </div>
  );
}
