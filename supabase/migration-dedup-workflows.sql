-- =============================================================
-- migration-dedup-workflows.sql
-- Workflows 去重：58 → 43（软删 15 条重复 + 吸收 4 处独有步骤 + 2 条改标题区分）
-- 判定依据：标题+描述+标签+steps 步骤正文 diff（2026-08-05，基于 wf-full.json 全量正文比对）
-- 默认用软删（is_published=false）：数据可回滚，不影响 RLS 依赖（asset_verifications/user_usage 均按 asset_id 引用）。
-- 若要硬删，将下方 UPDATE 改为 DELETE 即可（不推荐，见上文）。
-- 审核通过后执行方式：Supabase SQL Editor / Management API / PostgREST PATCH(service_role)。
-- =============================================================

-- =============================================================
-- 1) 软删 15 条重复工作流
--    id -> slug
--    7   secure-microservice-scaffold
--    41  secure-microservice-scaffold-generator
--    55  competitor-feature-gap-analyzer
--    37  automated-invoice-processing-reconciliation
--    38  ai-powered-customer-feedback-summarizer
--    6   data-cleaning-pipeline
--    18  feedback-theme-clustering
--    15  bug-triage-assignment-pipeline
--    26  sales-lead-qualification-routing
--    9   competitor-price-monitoring-agent
--    53  data-pipeline-health-monitor
--    3   content-repurposing
--    17  content-repurposing-social-media
--    23  fullstack-feature-scaffold
--    50  financial-report-reconciliation
-- =============================================================
UPDATE public.workflows
SET is_published = false, updated_at = NOW()
WHERE id IN (7, 41, 55, 37, 38, 6, 18, 15, 26, 9, 53, 3, 17, 23, 50);

-- =============================================================
-- 2) 吸收：把待删条里"保留条缺少"的独有步骤补进保留条
--    保留条 keep45 缺测试步骤 -> 吸收 del41 的 "Write Initial Tests"
-- =============================================================
UPDATE public.workflows
SET steps = steps || jsonb_build_array(
    jsonb_build_object(
        'step', 8,
        'tool', 'Pytest/Jest',
        'title', 'Write Initial Tests',
        'action', 'Generate basic unit tests for the health check and authentication middleware to ensure the scaffold works out-of-the-box.',
        'config', E'test_framework: ''pytest'' OR ''jest'''
    )
  ),
  updated_at = NOW()
WHERE id = 45;

--    保留条 keep48 缺堆栈提取 -> 吸收 del15 的 "Extract Stack Trace"
UPDATE public.workflows
SET steps = steps || jsonb_build_array(
    jsonb_build_object(
        'step', 7,
        'tool', 'Regex',
        'title', 'Extract Stack Trace',
        'action', 'Parse logs for stack trace patterns and identify error codes',
        'config', E'Pattern: r''Error: (.*?) at (.*?) line (\\d+)'''
    )
  ),
  updated_at = NOW()
WHERE id = 48;

--    保留条 keep14 缺 CRM 记录 -> 吸收 del26 的 "Log to CRM"
UPDATE public.workflows
SET steps = steps || jsonb_build_array(
    jsonb_build_object(
        'step', 6,
        'tool', 'Salesforce',
        'title', 'Log to CRM',
        'action', 'Create a task and log all activities for the lead in the CRM for full traceability.',
        'config', E'Create Task: ''Follow up on lead'' due in 2 hours, related to Account/Contact.'
    )
  ),
  updated_at = NOW()
WHERE id = 14;

--    保留条 keep28 缺提交/开 PR -> 吸收 del23 的 "Commit and Create PR"
UPDATE public.workflows
SET steps = steps || jsonb_build_array(
    jsonb_build_object(
        'step', 8,
        'tool', 'GitHub CLI',
        'title', 'Commit and Create PR',
        'action', 'Create a new branch, commit all files, and open a pull request',
        'config', E'branch_prefix: ''feature/'', pr_template: ''default'''
    )
  ),
  updated_at = NOW()
WHERE id = 28;

-- =============================================================
-- 3) 改标题区分（不动 slug，避免 URL/SEO 抖动）
-- =============================================================
-- Feature Gap Analyzer 三条保留两条：11=爬虫+评论挖掘, 43=内部对比
UPDATE public.workflows
SET title = 'Competitive Feature Gap Analyzer (Review Mining)', updated_at = NOW()
WHERE id = 11;

UPDATE public.workflows
SET title = 'Competitive Feature Gap Analyzer (Internal Comparison)', updated_at = NOW()
WHERE id = 43;

-- 价格监控保留两条：42=监控+降价告警, 30=定价策略调整（区分开）
UPDATE public.workflows
SET title = 'AI-Powered Competitive Pricing Strategy Agent', updated_at = NOW()
WHERE id = 30;

-- =============================================================
-- 回滚说明（软删无需回滚，把 is_published 改回 true 即可）：
--   UPDATE public.workflows SET is_published = true
--   WHERE id IN (7,41,55,37,38,6,18,15,26,9,53,3,17,23,50);
-- 若吸收步骤需要撤销：从对应 keep 行 steps 数组中移除最后一步即可。
-- =============================================================
