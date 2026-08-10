// ============================================================
// Skill 详情页（骨架）
// 展示技能正文、兼容模型、标签、示例输出、安装步骤
// ============================================================

import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, Wrench, Eye, Boxes } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/server';
import { getCachedVersionInfo, getCachedVerifyCount } from '@/lib/query-cache';
import RelatedPillars, { type RelatedPillarItem } from '@/components/prompts/RelatedPillars';
import SkillFormatExport from '@/components/skills/SkillFormatExport';
import ForkButton from '@/components/prompts/ForkButton';
import AddToCollectionButton from '@/components/collections/AddToCollectionButton';
import VerifyButton from '@/components/prompts/VerifyButton';
import type { Skill } from '@/types';

// 全站免费：内容不随登录态变化，可 ISR 缓存（5 分钟）
export const revalidate = 300;

interface Props {
  params: { id: string };
}

/** 按 slug 或 id 查询已发布技能（内容仅服务端 admin 可读，generateMetadata 与页面共用） */
async function fetchSkill(id: string) {
  const supabase = createAdminClient();
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
  return data as Skill | null;
}

/** 详情页 SEO 元数据：独立标题/描述 + OG + Twitter Card（与 prompts 详情页对齐） */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const skill = await fetchSkill(params.id);
  if (!skill) return { title: 'Skill not found' };

  const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const slug = skill.slug || String(skill.id);
  const url = `${site}/skills/${slug}`;
  const description =
    skill.description ||
    `An installable ${skill.skill_format || 'AI'} skill. Tested and open-source at PromptHub.`;

  // 动态 OG 图（/api/og 生成 1200x630 卡片）
  const og = new URLSearchParams({
    title: skill.title,
    category: skill.category?.name || 'AI Skill',
    model: skill.compatible_models?.[0] || skill.skill_format || '',
  });
  const ogImage = `${site}/api/og?${og.toString()}`;

  return {
    title: `${skill.title} — AI Skill`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: skill.title,
      description,
      type: 'article',
      url,
      siteName: 'PromptHub',
      images: [{ url: ogImage, width: 1200, height: 630, alt: skill.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: skill.title,
      description,
      images: [ogImage],
    },
  };
}

export default async function SkillDetailPage({ params }: Props) {
  const { id } = params;
  // 完整内容（content 等）仅服务端 admin 读取；anon 已无 skills 表权限
  const supabase = createAdminClient();
  const skill = await fetchSkill(id);
  if (!skill) notFound();

  // 版本信息
  const versionInfo = await getCachedVersionInfo('skill', skill.id);
  // "我测试过"验证数
  const verifyCount = await getCachedVerifyCount('skill', skill.id);

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

  // ---- JSON-LD 结构化数据（CreativeWork，争取富结果）----
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const slug = skill.slug || String(skill.id);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: skill.title,
    description: skill.description,
    url: `${site}/skills/${slug}`,
    ...(skill.tags && skill.tags.length > 0 ? { keywords: skill.tags.join(', ') } : {}),
    datePublished: skill.created_at,
    dateModified: skill.updated_at,
  };

  return (
    <div className="container-page py-10">
      {/* JSON-LD 结构化数据 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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

          {/* 技能正文（全站免费） */}
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
            {versionInfo.count > 0 && (
              <Link
                href={`/versions/skill/${skill.id}`}
                className="block text-xs text-slate-400 dark:text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 transition-colors mb-2"
              >
                v{versionInfo.count} · version history
              </Link>
            )}
            <AddToCollectionButton assetType="skill" assetId={skill.id} />
            <VerifyButton assetId={skill.id} assetType="skill" initialCount={verifyCount} />
            <ForkButton
              data={{
                type: 'skill',
                title: skill.title,
                description: skill.description || '',
                content: skill.content,
                skill_format: skill.skill_format,
                compatible_models: skill.compatible_models.join(', '),
                install_instructions: skill.install_instructions || '',
                example_output: skill.example_output || '',
              }}
            />
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

      {/* 多格式导出 */}
      <SkillFormatExport skill={skill} />

      {/* 跨板块"搭配使用"推荐 */}
      <RelatedPillars items={relatedItems} />
    </div>
  );
}
