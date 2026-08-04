// ============================================================
// 客户暂停锁屏卡（站主暂停客户时显示）
// ============================================================

import { CircleStop } from 'lucide-react';

export default function PausedGate() {
  return (
    <div className="container-page py-16 max-w-lg">
      <div className="card p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
          <CircleStop className="w-7 h-7 text-amber-600 dark:text-amber-400" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Workstation paused
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          This workstation has been paused by the account owner. Please contact them to resume
          access — your previous tasks and deliverables will still be here when it reactivates.
        </p>
      </div>
    </div>
  );
}
