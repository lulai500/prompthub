-- =============================================================
-- migration-paywall-rls-rollback.sql
-- 全站免费化：撤销会员付费墙，恢复 skills/workflows/asset_versions 公开读取
--
-- 背景（2026-08-10）：产品决策"除工作台 AI 功能外全部免费"。
--   网站会员体系废除 → Skills/Workflows/版本历史完整内容对所有访客公开。
--   工作台 AI（clients.tier 配额 + Lemon Squeezy）不受影响，继续保留。
--
-- 本迁移与 migration-paywall-rls.sql 反向：
--   - 恢复 anon/authenticated 对三张表的 SELECT（表级权限）
--   - 恢复公开读已发布内容的 RLS 策略
--
-- 保留不动：
--   - workflows.steps_count 生成列（纯元数据，无付费语义）
--   - profiles.membership_tier / membership_expires_at 列（休眠，不再门控）
--   - clients.tier / pro_expires_at（工作站 AI 额度，属保留范围）
-- =============================================================

-- 1) 恢复三张表的公开 SELECT 权限（anon = 未登录访客，authenticated = 已登录用户）
GRANT SELECT ON public.skills TO anon, authenticated;
GRANT SELECT ON public.workflows TO anon, authenticated;
GRANT SELECT ON public.asset_versions TO anon, authenticated;

-- 2) 恢复公开读已发布内容的 RLS 策略（原先被 paywall 迁移删除）
CREATE POLICY "公开读取已发布技能" ON public.skills
  FOR SELECT USING (is_published = true);
CREATE POLICY "公开读取已发布工作流" ON public.workflows
  FOR SELECT USING (is_published = true);
CREATE POLICY "公开读取版本历史" ON public.asset_versions
  FOR SELECT USING (true);

-- 验证：
--   SELECT grantee, privilege_type FROM information_schema.role_table_grants
--   WHERE table_name IN ('skills','workflows','asset_versions') AND privilege_type='SELECT';
--   -- 期望：anon、authenticated 各有 SELECT 行
