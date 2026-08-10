// ============================================================
// 技能卡片（列表页用）
// 展示技能格式、标题、描述、兼容模型 + 验证数可信徽标
// ============================================================

import Link from 'next/link';
import { BadgeCheck } from 'lucide-react';
import type { Skill } from '@/types';

interface SkillCardProps {
  skill: Skill;
  /** "我测试过"验证数，>0 时显示绿色可信徽标 */
  verifyCount?: number;
}

export default function SkillCard({ skill, verifyCount }: SkillCardProps) {
  return (
    <Link
      href={`/skills/${skill.slug || skill.id}`}
      className="card p-5 group hover:border-brand-300 dark:hover:border-brand-700 transition-all"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="badge-primary">{skill.skill_format}</span>
      </div>
      <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
        {skill.title}
      </h3>
      {skill.description && (
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
          {skill.description}
        </p>
      )}
      {skill.compatible_models.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {skill.compatible_models.slice(0, 3).map((m) => (
            <span key={m} className="badge-default text-xs">
              {m}
            </span>
          ))}
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
