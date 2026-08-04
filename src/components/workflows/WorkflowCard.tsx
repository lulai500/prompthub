// ============================================================
// 工作流卡片（列表页用）
// 展示工作流类型、标题、描述、所需工具 + 验证数可信徽标
// ============================================================

import Link from 'next/link';
import { Lock, BadgeCheck } from 'lucide-react';
import type { Workflow } from '@/types';

interface WorkflowCardProps {
  workflow: Workflow;
  /** "我测试过"验证数，>0 时显示绿色可信徽标 */
  verifyCount?: number;
}

export default function WorkflowCard({ workflow: w, verifyCount }: WorkflowCardProps) {
  return (
    <Link
      href={`/workflows/${w.slug || w.id}`}
      className="card p-5 group hover:border-brand-300 dark:hover:border-brand-700 transition-all"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="badge-primary">{w.workflow_type}</span>
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
          <Lock className="w-3 h-3" /> Members
        </span>
      </div>
      <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
        {w.title}
      </h3>
      {w.description && (
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
          {w.description}
        </p>
      )}
      {w.tools_required.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {w.tools_required.slice(0, 3).map((t) => (
            <span key={t} className="badge-default text-xs">
              {t}
            </span>
          ))}
          <span className="badge-default text-xs">
            {Array.isArray(w.steps) ? w.steps.length : 0} steps
          </span>
        </div>
      )}
      {(verifyCount ?? 0) > 0 && (
        <div className="mt-3">
          <span className="badge-success text-xs">
            <BadgeCheck className="w-3 h-3" />
            {verifyCount} tested
          </span>
        </div>
      )}
    </Link>
  );
}
