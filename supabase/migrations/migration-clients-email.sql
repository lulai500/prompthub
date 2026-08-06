-- ============================================================
-- PromptHub - clients 增加 email 列（denormalize）
-- 供站主后台列表显示/搜索邮箱，避免每次 listUsers 拉 auth.users
-- 新建客户由创建 API 写入；存量用 scripts/backfill-client-email.mjs 回填
-- ============================================================

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS email TEXT;
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(email);
