// ============================================================
// Skills 板块列表页（骨架）
// 展示可安装的技能包：Claude Skill / Cursor Rules / Codex…
// 若未执行 migration-skills-workflows.sql（表不存在），
// 查询自动返回空 → 显示空态，不报错
// ============================================================

import Link from 'next/link';
import { Wrench, FolderOpen, Boxes } from 'lucide-react';
import { createAnonClient } from '@/lib/supabase/server';
import type { Skill, SkillCategory } from '@/types';

// ISR：无登录态依赖，整页缓存 120s
export const revalidate = 120;

interface SearchParams {
  category?: string;
}

export default async function SkillsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createAnonClient();
  const categorySlug = searchParams.category || '';

  const [categoriesRes, skillsRes] = await Promise.all([
    supabase.from('skill_categories').select('*').order('sort_order', { ascending: true }),
    supabase
      .from('skills')
      .select('*, category:skill_categories(*)')
      .eq('is_published', true)
      .order('created_at', { ascending: false }),
  ]);

  const categories: SkillCategory[] = categoriesRes.data || [];
  const allSkills: Skill[] = skillsRes.data || [];
  // 骨架阶段数据量小，在内存筛选；内容规模化后改为 SQL 筛选
  const skills = categorySlug
    ? allSkills.filter((s) => s.category?.slug === categorySlug)
    : allSkills;

  return (
    <div className="container-page py-10">
      {/* 页头 */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-sm font-medium mb-3">
          <Wrench className="w-4 h-4" />
          New section
        </div>
        <h1 className="page-title">AI Skills</h1>
        <p className="page-subtitle">
          Installable skills — Claude Skills, Cursor Rules, Codex, GPT Actions &amp; more.
          Tested, free &amp; open-source.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* ---- 分类筛选 ---- */}
        <aside className="w-full lg:w-56 shrink-0">
          <div className="card p-4 lg:sticky lg:top-24">
            <div className="flex items-center gap-2 mb-3">
              <FolderOpen className="w-4 h-4 text-slate-500" />
              <h3 className="font-semibold text-sm">Category</h3>
            </div>
            <div className="space-y-1">
              <Link
                href="/skills"
                className={`block px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  !categorySlug
                    ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 font-medium'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-700'
                }`}
              >
                All Skills
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/skills?category=${cat.slug}`}
                  className={`block px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    categorySlug === cat.slug
                      ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 font-medium'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-700'
                  }`}
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        </aside>

        {/* ---- 技能列表 ---- */}
        <div className="flex-1">
          {skills.length === 0 ? (
            <div className="card p-12 text-center">
              <Boxes className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No skills yet</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4">
                Skills are being curated and tested. Check back soon — or be the first to
                contribute.
              </p>
              <Link href="/submit" className="btn-primary text-sm">
                Submit a Skill
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {skills.map((skill) => (
                <Link
                  key={skill.id}
                  href={`/skills/${skill.slug || skill.id}`}
                  className="card p-5 group hover:border-brand-300 dark:hover:border-brand-700 transition-all"
                >
                  <span className="badge-primary mb-3 inline-block">{skill.skill_format}</span>
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
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
