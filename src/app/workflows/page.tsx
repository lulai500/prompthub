// ============================================================
// Workflows 板块列表页（骨架）
// 展示可编排的多步骤工作流：Agent 编排 / 自动化模板 / 开发脚手架
// 若未执行 supabase/migrations/migration-skills-workflows.sql（表不存在），
// 查询自动返回空 → 显示空态，不报错
// ============================================================

import Link from 'next/link';
import { Workflow as WorkflowIcon, FolderOpen, GitBranch } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/server';
import { getCachedVerifyCountsBatch } from '@/lib/query-cache';
import WorkflowCard from '@/components/workflows/WorkflowCard';
import type { Workflow, WorkflowCategory } from '@/types';

// ISR：无登录态依赖，整页缓存 120s
export const revalidate = 120;

interface SearchParams {
  category?: string;
}

export default async function WorkflowsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createAdminClient();
  const categorySlug = searchParams.category || '';

  const [categoriesRes, workflowsRes] = await Promise.all([
    supabase.from('workflow_categories').select('*').order('sort_order', { ascending: true }),
    supabase
      .from('workflows')
      .select(
        'id, title, slug, description, workflow_type, tools_required, tags, usage_count, steps_count, created_at, category:workflow_categories(*)'
      )
      .eq('is_published', true)
      .order('created_at', { ascending: false }),
  ]);

  const categories: WorkflowCategory[] = categoriesRes.data || [];
  // 列表只取元数据列（RLS 收紧后 steps 等受保护），断言为 Workflow 供卡片展示
  const allWorkflows: Workflow[] = (workflowsRes.data || []) as unknown as Workflow[];
  // 骨架阶段数据量小，在内存筛选；内容规模化后改为 SQL 筛选
  const workflows = categorySlug
    ? allWorkflows.filter((w) => w.category?.slug === categorySlug)
    : allWorkflows;

  // 验证数（"我测试过"，卡片可信徽标）
  let workflowVerifyMap: Record<number, number> = {};
  if (workflows.length > 0) {
    const verifyData = await getCachedVerifyCountsBatch('workflow', workflows.map((w) => w.id));
    for (const v of verifyData) workflowVerifyMap[v.asset_id] = v.count;
  }

  return (
    <div className="container-page py-10">
      {/* 页头 */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-sm font-medium mb-3">
          <WorkflowIcon className="w-4 h-4" />
          New section
        </div>
        <h1 className="page-title">Workflows</h1>
        <p className="page-subtitle">
          Multi-step AI workflows — agent orchestration, automation templates &amp; dev
          scaffolds. Reproduce, export, adapt.
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
                href="/workflows"
                className={`block px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  !categorySlug
                    ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 font-medium'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-700'
                }`}
              >
                All Workflows
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/workflows?category=${cat.slug}`}
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

        {/* ---- 工作流列表 ---- */}
        <div className="flex-1">
          {workflows.length === 0 ? (
            <div className="card p-12 text-center">
              <GitBranch className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No workflows yet</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4">
                Workflows are being built and tested. Check back soon — or submit your own.
              </p>
              <Link href="/submit" className="btn-primary text-sm">
                Submit a Workflow
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {workflows.map((w) => (
                <WorkflowCard key={w.id} workflow={w} verifyCount={workflowVerifyMap[w.id] || 0} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
