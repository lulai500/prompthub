-- ============================================================
-- PromptHub - 客户自建项目
-- 客户可创建自己的项目（仅 active）、可编辑自己的项目名/描述。
-- 不放开 DELETE（client_projects ON DELETE CASCADE 会连带删任务，危险）。
-- 沿用 my_client_id()（见 migration-client-workstation.sql）。
-- 使用方法：Supabase Dashboard → SQL Editor → 粘贴执行
-- ============================================================

DROP POLICY IF EXISTS "客户自建项目" ON public.client_projects;
CREATE POLICY "客户自建项目" ON public.client_projects
  FOR INSERT WITH CHECK (client_id = public.my_client_id() AND status = 'active');

DROP POLICY IF EXISTS "客户编辑自己项目" ON public.client_projects;
CREATE POLICY "客户编辑自己项目" ON public.client_projects
  FOR UPDATE USING (client_id = public.my_client_id())
  WITH CHECK (client_id = public.my_client_id());
