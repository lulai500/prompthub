-- =============================================================
-- migration-fix-version-trigger.sql
-- 修复 record_asset_version() 触发器 bug + 完成 Workflows 吸收步骤
--
-- 背景（2026-08-05）：migration-dedup-workflows.sql 的去重已执行
-- （58→43，软删 15 条 + 3 条重命名均成功），但 4 处"吸收步骤"UPDATE
-- 全部报错 `record "new" has no field "content"`。
--
-- 根因：record_asset_version() 用单个 CASE 表达式同时引用 NEW.content
-- 和 NEW.steps。触发器在 workflows 表上触发时，PG 解析整个表达式，
-- 发现 NEW.content 不存在（workflows 没有 content 列）即抛 42703。
-- 后果：生产环境任何对 workflow 的 steps/description 更新都会 500
-- （连无变化的等值 UPDATE 也触发），属于隐藏的生产 bug。
-- 修复方式：CASE 单表达式改为 IF/ELSIF 分语句，字段按表分支独立解析。
-- =============================================================

-- ---------- 1) 修复触发器函数（保留原触发器，无需重建） ----------
CREATE OR REPLACE FUNCTION public.record_asset_version()
RETURNS TRIGGER AS $$
DECLARE
  c TEXT;
  h TEXT;
  t TEXT;
BEGIN
  t := CASE TG_TABLE_NAME
         WHEN 'prompts' THEN 'prompt'
         WHEN 'skills' THEN 'skill'
         WHEN 'workflows' THEN 'workflow'
       END;

  IF TG_TABLE_NAME IN ('prompts', 'skills') THEN
    c := NEW.content;
  ELSE
    c := NEW.steps::text || ' ' || COALESCE(NEW.description, '');
  END IF;
  h := md5(c);

  -- UPDATE 时若内容未变则不记录（避免噪声）
  IF TG_OP = 'UPDATE' THEN
    IF EXISTS (
      SELECT 1 FROM public.asset_versions
      WHERE asset_type = t AND asset_id = NEW.id
      HAVING max(content_hash) = h
    ) THEN
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.asset_versions (asset_type, asset_id, content, content_hash)
  VALUES (t, NEW.id, c, h);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ---------- 2) 重跑 4 处吸收步骤（修复后触发器正常记录版本快照） ----------
-- keep45 缺测试步骤 -> 吸收 del41 的 "Write Initial Tests"
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

-- keep48 缺堆栈提取 -> 吸收 del15 的 "Extract Stack Trace"
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

-- keep14 缺 CRM 记录 -> 吸收 del26 的 "Log to CRM"
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

-- keep28 缺提交/开 PR -> 吸收 del23 的 "Commit and Create PR"
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

-- ---------- 3) 验证（执行后应看到 4 行 affected；随后可查 steps 长度） ----------
SELECT id, title, jsonb_array_length(steps) AS steps FROM public.workflows WHERE id IN (45, 48, 14, 28);
