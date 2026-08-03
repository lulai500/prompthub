// ============================================================
// 跨板块"搭配使用"推荐（Pairs well with）
// 把三支柱串起来：提示词 ↔ 技能 ↔ 工作流 互链
// 数据由各详情页按共享标签匹配后传入，空时渲染 null
// ============================================================

import Link from 'next/link';
import { ArrowUpRight, Wrench, GitBranch, MessageSquareText, Sparkles } from 'lucide-react';

export interface RelatedPillarItem {
  /** 被推荐的资产类型 */
  type: 'prompt' | 'skill' | 'workflow';
  id: number;
  title: string;
  slug: string | null;
  /** 类型标签：如 model_name / skill_format / workflow_type */
  label: string;
}

const TYPE_META = {
  prompt: { icon: MessageSquareText, href: '/prompts/' },
  skill: { icon: Wrench, href: '/skills/' },
  workflow: { icon: GitBranch, href: '/workflows/' },
} as const;

export default function RelatedPillars({ items }: { items: RelatedPillarItem[] }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="card p-6 mt-6">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-5 h-5 text-brand-500" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Pairs well with
        </h2>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Complete this asset with a matching prompt, skill, or workflow.
      </p>
      <div className="space-y-2">
        {items.map((item) => {
          const meta = TYPE_META[item.type];
          const Icon = meta.icon;
          return (
            <Link
              key={`${item.type}-${item.id}`}
              href={`${meta.href}${item.slug || item.id}`}
              className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 dark:border-dark-700 hover:border-brand-300 dark:hover:border-brand-700 hover:bg-brand-50 dark:hover:bg-brand-900/10 transition-all group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-sm text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 truncate">
                    {item.title}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{item.label}</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-brand-500 shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
