-- =============================================================
-- migration-paywall-rls.sql
-- 会员墙加固：Skills / Workflows / 版本快照的完整内容仅服务端可读
--
-- 问题（2026-08-05 全站测试发现，两个根因）：
--   A) RLS 权限层面：skills.content / workflows.steps / asset_versions.content
--      的 RLS 是"公开读取已发布"，匿名直连 PostgREST 可拿付费内容
--   B) ★更严重的根因：NEXT_PUBLIC_SUPABASE_ANON_KEY 被误填成 service_role key，
--     导致浏览器 JS 包里内联了 service_role key（BYPASSRLS 全库读写）。
--     这使 A) 的所有权限/RLS 加固都形同虚设（PostgREST 以 service_role 执行）。
--     → 修复 = 换回真 anon key + 重部署（本迁移外的 env 操作）
--
-- 本迁移完成 DB 层加固（方案：彻底撤销表级 SELECT + 服务端 service_role 读取）：
--   - anon/authenticated 对 skills/workflows/asset_versions 无任何 SELECT
--     → 即使拿到 anon key 也直读不到（42501 permission denied）
--   - 全部服务端读取（列表/详情/版本/API/MCP/推荐）改走 createAdminClient()
--     （service_role，仅服务器持有），由 Server Component 按会员门控输出
--   - 保留 INSERT/UPDATE/DELETE：提交/作者管理自己的资产（RLS 按行约束）
--   - workflows 新增 steps_count 生成列：步骤数作为元数据对外展示
-- =============================================================

-- 1) workflows.steps_count 生成列（由 steps 自动计算，无需回填）
ALTER TABLE public.workflows
  ADD COLUMN IF NOT EXISTS steps_count INT
  GENERATED ALWAYS AS (jsonb_array_length(COALESCE(steps, '[]'::jsonb))) STORED;

-- 2) 彻底撤销 skills/workflows/asset_versions 的 anon/authenticated 权限（表级+列级）
REVOKE ALL ON public.skills FROM anon, authenticated;
REVOKE ALL ON public.workflows FROM anon, authenticated;
REVOKE ALL ON public.asset_versions FROM anon, authenticated;

-- 3) 保留写权限（提交资产 / 作者编辑自己的资产，RLS 按行约束）
GRANT INSERT, UPDATE, DELETE ON public.skills TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.workflows TO anon, authenticated;

-- 4) 删除匿名 SELECT 的 RLS 策略（anon/authenticated 无任何行可见；
--    作者读自己 + INSERT/UPDATE/DELETE 策略保留）
DROP POLICY IF EXISTS "公开读取已发布技能" ON public.skills;
DROP POLICY IF EXISTS "公开读取已发布工作流" ON public.workflows;
DROP POLICY IF EXISTS "公开读取版本历史" ON public.asset_versions;

-- 验证：
--   SELECT grantee, privilege_type FROM information_schema.role_table_grants
--   WHERE table_name IN ('skills','workflows','asset_versions') AND privilege_type='SELECT';
--   -- 期望：无 anon/authenticated 行
--
-- 待办（需要用户在 Supabase Dashboard 操作，API 不返回 secret key 明文）：
--   ① 轮换 service_role key（旧 key 已因内联进 JS 包而泄露）
--   ② 新值更新 Vercel env 的 SUPABASE_SERVICE_ROLE_KEY + .env.local
--   ③ 删除/吊销旧的 legacy service_role key
