// ============================================================
// Skill 详情页（骨架）
// 展示技能正文、兼容模型、标签、示例输出、安装步骤
// ============================================================

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Wrench, Eye, Boxes } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import RelatedPillars, { type RelatedPillarItem } from '@/components/prompts/RelatedPillars';
import type { Skill } from '@/types';

export const dynamic = 'force-dynamic';

interface Props {
  params: { id: string };
}

export default async function SkillDetailPage({ params }: Props) {
  const supabase = createServerSupabaseClient();
  const { id } = params;

  // 通过 slug 或 id 查询
  const isNumericId = /^\d+$/.test(id);
  let query = supabase
    .from('skills')
    .select('*, category:skill_categories(*)')
    .eq('is_published', true);
  if (isNumericId) {
    query = query.eq('id', parseInt(id, 10));
  } else {
    query = query.eq('slug', id);
  }

  const { data } = await query.single();
  const skill = data as Skill | null;
  if (!skill) notFound();

  // ---- 跨板块"搭配使用"推荐（按共享标签匹配）----
  let relatedItems: RelatedPillarItem[] = [];
  if (skill.tags && skill.tags.length > 0) {
    const [promptsRes, workflowsRes] = await Promise.all([
      supabase
        .from('prompts')
        .select('id, title, slug, model_name')
        .overlaps('tags', skill.tags)
        .eq('is_published', true)
        .limit(3),
      supabase
        .from('workflows')
        .select('id, title, slug, workflow_type')
        .overlaps('tags', skill.tags)
        .eq('is_published', true)
        .limit(3),
    ]);
    relatedItems = [
      ...(promptsRes.data || []).map((p) => ({
        type: 'prompt' as const,
        id: p.id,
        title: p.title,
        slug: p.slug,
        label: p.model_name || 'Prompt',
      })),
      ...(workflowsRes.data || []).map((w) => ({
        type: 'workflow' as const,
        id: w.id,
        title: w.title,
        slug: w.slug,
        label: w.workflow_type,
      })),
    ];
  }

  return (
    <div className="container-page py-10">
      {/* 返回链接 */}
      <Link
        href="/skills"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to skills
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ---- 左侧主内容 ---- */}
        <div className="lg:col-span-2 space-y-6">
          {/* 基本信息 */}
          <div className="card p-6">
            {skill.category && (
              <Link
                href={`/skills?category=${skill.category.slug}`}
                className="badge-primary mb-4 inline-block hover:opacity-80"
              >
                {skill.category.name}
              </Link>
            )}
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-3">
              {skill.title}
            </h1>
            {skill.description && (
              <p className="text-slate-600 dark:text-slate-400 mb-4">{skill.description}</p>
            )}
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Wrench className="w-4 h-4" />
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {skill.skill_format}
              </span>
            </div>
          </div>

          {/* 技能正文 */}
          {skill.content && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Skill Content
              </h2>
              <pre className="p-4 rounded-xl bg-slate-950 dark:bg-dark-950 border border-slate-800 overflow-x-auto">
                <code className="text-sm text-slate-200 whitespace-pre-wrap font-mono leading-relaxed">
                  {skill.content}
                </code>
              </pre>
            </div>
          )}

          {/* 示例输出 */}
          {skill.example_output && (
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="w-5 h-5 text-green-500" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Example Output
                </h2>
              </div>
              <pre className="p-4 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {skill.example_output}
              </pre>
            </div>
          )}
        </div>

        {/* ---- 右侧边栏 ---- */}
        <div className="space-y-4">
          <div className="card p-5 lg:sticky lg:top-24">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Details</h3>
            {skill.compatible_models.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">
                  Compatible Models
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {skill.compatible_models.map((m) => (
                    <span key={m} className="badge-default text-xs">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {skill.tags.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {skill.tags.map((t) => (
                    <span key={t} className="badge-default text-xs">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Usage: {skill.usage_count} installs
            </p>
          </div>
        </div>
      </div>

      {/* 安装步骤 */}
      {skill.install_instructions && (
        <div className="card p-6 mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Boxes className="w-5 h-5 text-yellow-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Install Instructions
            </h2>
          </div>
          <pre className="p-4 rounded-xl bg-slate-100 dark:bg-dark-800 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
            {skill.install_instructions}
          </pre>
        </div>
      )}

      {/* 跨板块"搭配使用"推荐 */}
      <RelatedPillars items={relatedItems} />
    </div>
  );
}
