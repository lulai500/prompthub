// ============================================================
// Workflow 详情页（骨架）
// 展示步骤可视化（编号流程卡片）、依赖工具、配置内容、预期输出
// ============================================================

import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, Workflow as WorkflowIcon, ListOrdered, Eye, Lightbulb } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/server';
import { getCachedVersionInfo, getCachedVerifyCount } from '@/lib/query-cache';
import RelatedPillars, { type RelatedPillarItem } from '@/components/prompts/RelatedPillars';
import ForkButton from '@/components/prompts/ForkButton';
import AddToCollectionButton from '@/components/collections/AddToCollectionButton';
import VerifyButton from '@/components/prompts/VerifyButton';
import type { Workflow, WorkflowStep } from '@/types';

// 全站免费：内容不随登录态变化，可 ISR 缓存（5 分钟）
export const revalidate = 300;

interface Props {
  params: { id: string };
}

/** 按 slug 或 id 查询已发布工作流（内容仅服务端 admin 可读，generateMetadata 与页面共用） */
async function fetchWorkflow(id: string) {
  const supabase = createAdminClient();
  const isNumericId = /^\d+$/.test(id);
  let query = supabase
    .from('workflows')
    .select('*, category:workflow_categories(*)')
    .eq('is_published', true);
  if (isNumericId) {
    query = query.eq('id', parseInt(id, 10));
  } else {
    query = query.eq('slug', id);
  }
  const { data } = await query.single();
  return data as Workflow | null;
}

/** 详情页 SEO 元数据：独立标题/描述 + OG + Twitter Card（与 prompts 详情页对齐） */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const workflow = await fetchWorkflow(params.id);
  if (!workflow) return { title: 'Workflow not found' };

  const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const slug = workflow.slug || String(workflow.id);
  const url = `${site}/workflows/${slug}`;
  const description =
    workflow.description ||
    `A multi-step ${workflow.workflow_type || 'AI'} workflow. Reproduce, export, adapt at PromptHub.`;

  // 动态 OG 图（/api/og 生成 1200x630 卡片）
  const og = new URLSearchParams({
    title: workflow.title,
    category: workflow.category?.name || 'AI Workflow',
    model: workflow.tools_required?.[0] || workflow.workflow_type || '',
  });
  const ogImage = `${site}/api/og?${og.toString()}`;

  return {
    title: `${workflow.title} — AI Workflow`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: workflow.title,
      description,
      type: 'article',
      url,
      siteName: 'PromptHub',
      images: [{ url: ogImage, width: 1200, height: 630, alt: workflow.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: workflow.title,
      description,
      images: [ogImage],
    },
  };
}

export default async function WorkflowDetailPage({ params }: Props) {
  const { id } = params;
  // 完整内容（steps 等）仅服务端 admin 读取；anon 已无 workflows 表权限
  const supabase = createAdminClient();
  const workflow = await fetchWorkflow(id);
  if (!workflow) notFound();

  // 版本信息
  const versionInfo = await getCachedVersionInfo('workflow', workflow.id);
  // "我测试过"验证数
  const verifyCount = await getCachedVerifyCount('workflow', workflow.id);

  // steps 来自 JSONB，兜底确保为数组
  const steps: WorkflowStep[] = Array.isArray(workflow.steps) ? workflow.steps : [];

  // ---- 跨板块"搭配使用"推荐（按共享标签匹配）----
  let relatedItems: RelatedPillarItem[] = [];
  if (workflow.tags && workflow.tags.length > 0) {
    const [promptsRes, skillsRes] = await Promise.all([
      supabase
        .from('prompts')
        .select('id, title, slug, model_name')
        .overlaps('tags', workflow.tags)
        .eq('is_published', true)
        .limit(3),
      supabase
        .from('skills')
        .select('id, title, slug, skill_format')
        .overlaps('tags', workflow.tags)
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
      ...(skillsRes.data || []).map((s) => ({
        type: 'skill' as const,
        id: s.id,
        title: s.title,
        slug: s.slug,
        label: s.skill_format,
      })),
    ];
  }

  // ---- JSON-LD 结构化数据（CreativeWork，争取富结果）----
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const slug = workflow.slug || String(workflow.id);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: workflow.title,
    description: workflow.description,
    url: `${site}/workflows/${slug}`,
    ...(workflow.tags && workflow.tags.length > 0
      ? { keywords: workflow.tags.join(', ') }
      : {}),
    datePublished: workflow.created_at,
    dateModified: workflow.updated_at,
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
        href="/workflows"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to workflows
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ---- 左侧主内容 ---- */}
        <div className="lg:col-span-2 space-y-6">
          {/* 基本信息 */}
          <div className="card p-6">
            {workflow.category && (
              <Link
                href={`/workflows?category=${workflow.category.slug}`}
                className="badge-primary mb-4 inline-block hover:opacity-80"
              >
                {workflow.category.name}
              </Link>
            )}
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-3">
              {workflow.title}
            </h1>
            {workflow.description && (
              <p className="text-slate-600 dark:text-slate-400 mb-4">{workflow.description}</p>
            )}
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <WorkflowIcon className="w-4 h-4" />
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {workflow.workflow_type}
              </span>
            </div>
          </div>

          {/* 步骤可视化（全站免费） */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <ListOrdered className="w-5 h-5 text-brand-500" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Steps</h2>
            </div>
            {steps.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No steps defined yet.</p>
            ) : (
              <ol className="space-y-3">
                {steps.map((s) => (
                  <li key={s.step} className="flex gap-3">
                    <span className="w-7 h-7 rounded-full bg-brand-600 text-white flex items-center justify-center text-sm font-medium shrink-0">
                      {s.step}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 dark:text-white">{s.title}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {s.tool && <span className="badge-default">{s.tool}</span>}
                        {s.action && <span>{s.action}</span>}
                      </div>
                      {s.config && (
                        <pre className="mt-2 p-3 rounded-lg bg-slate-100 dark:bg-dark-800 text-xs whitespace-pre-wrap overflow-x-auto">
                          {s.config}
                        </pre>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* 配置内容 */}
          {workflow.config_content && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Configuration
              </h2>
              <pre className="p-4 rounded-xl bg-slate-950 dark:bg-dark-950 border border-slate-800 overflow-x-auto">
                <code className="text-sm text-slate-200 whitespace-pre-wrap font-mono leading-relaxed">
                  {workflow.config_content}
                </code>
              </pre>
            </div>
          )}

          {/* 预期输出 */}
          {workflow.expected_output && (
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="w-5 h-5 text-green-500" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Expected Output
                </h2>
              </div>
              <pre className="p-4 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {workflow.expected_output}
              </pre>
            </div>
          )}
        </div>

        {/* ---- 右侧边栏 ---- */}
        <div className="space-y-4">
          <div className="card p-5 lg:sticky lg:top-24">
            {versionInfo.count > 0 && (
              <Link
                href={`/versions/workflow/${workflow.id}`}
                className="block text-xs text-slate-400 dark:text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 transition-colors mb-2"
              >
                v{versionInfo.count} · version history
              </Link>
            )}
            <AddToCollectionButton assetType="workflow" assetId={workflow.id} />
            <VerifyButton assetId={workflow.id} assetType="workflow" initialCount={verifyCount} />
            <ForkButton
              data={{
                type: 'workflow',
                title: workflow.title,
                description: workflow.description || '',
                content: workflow.description || '',
                workflow_type: workflow.workflow_type,
                tools_required: workflow.tools_required.join(', '),
                steps: JSON.stringify(steps),
                config_content: workflow.config_content || '',
                expected_output: workflow.expected_output || '',
                tips: workflow.tips || '',
              }}
            />
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Details</h3>
            {workflow.tools_required.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">
                  Tools Required
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {workflow.tools_required.map((t) => (
                    <span key={t} className="badge-default text-xs">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {workflow.tags.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {workflow.tags.map((t) => (
                    <span key={t} className="badge-default text-xs">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {steps.length} steps · {workflow.usage_count} runs
            </p>
          </div>

          {/* 调参建议 */}
          {workflow.tips && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-yellow-500" />
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Tips</h3>
              </div>
              <pre className="text-xs text-slate-500 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
                {workflow.tips}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* 跨板块"搭配使用"推荐 */}
      <RelatedPillars items={relatedItems} />
    </div>
  );
}
