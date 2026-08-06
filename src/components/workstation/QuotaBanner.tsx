// ============================================================
// 客户工作站 - 用量配额横幅
// 显示当月用量 X/limit + 分档徽章 + 升级（或联系站主）
// ============================================================

import { Gauge, Crown } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { nextMonthStartIso } from '@/lib/client-quota';
import UpgradeButton from '@/components/workstation/UpgradeButton';

interface QuotaBannerProps {
  quota: { tier: 'free' | 'pro'; limit: number; used: number; remaining: number };
  canUpgrade: boolean;
  proExpiresAt: string | null;
}

export default function QuotaBanner({ quota, canUpgrade, proExpiresAt }: QuotaBannerProps) {
  const pct = quota.limit > 0 ? Math.min(100, Math.round((quota.used / quota.limit) * 100)) : 0;
  const resetLabel = formatDate(nextMonthStartIso());

  return (
    <div className="card p-5 mb-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-slate-500" />
          <span className="font-semibold text-slate-900 dark:text-white">Monthly executions</span>
          {quota.tier === 'pro' ? (
            <span className="badge-success text-xs">
              <Crown className="w-3 h-3" /> Pro
            </span>
          ) : (
            <span className="badge-default text-xs">Free</span>
          )}
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {quota.remaining > 0 ? (
            <span>
              <span className="font-mono font-medium text-slate-900 dark:text-white">{quota.remaining}</span> left this month
            </span>
          ) : (
            <span className="text-red-600 dark:text-red-400 font-medium">Limit reached</span>
          )}
        </div>
      </div>

      {/* 用量条 */}
      <div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-dark-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-brand-500'}`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
      <p className="mt-1.5 font-mono text-xs text-slate-400 dark:text-slate-500">
        {quota.used} / {quota.limit} used · resets {resetLabel}
      </p>
      <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
        Failed attempts don&apos;t count — retries are free.
      </p>

      {/* 升级 / 联系站主 */}
      {quota.tier === 'free' && (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-dark-700 flex items-center gap-3">
          {canUpgrade ? (
            <>
              <UpgradeButton />
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Get 500 executions/month.
              </p>
            </>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Upgrade to Pro is not available yet — contact the account owner to enable it.
            </p>
          )}
        </div>
      )}

      {quota.tier === 'pro' && proExpiresAt && (
        <p className="mt-3 pt-3 border-t border-slate-200 dark:border-dark-700 text-xs text-slate-500 dark:text-slate-400">
          Pro active until <span className="font-medium text-slate-700 dark:text-slate-300">{formatDate(proExpiresAt)}</span>
        </p>
      )}
    </div>
  );
}
