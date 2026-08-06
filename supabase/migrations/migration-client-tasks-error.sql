-- ============================================================
-- PromptHub - 客户任务失败原因字段
-- run/retry/regenerate 失败时由服务端写入友好文案，客户可见
-- 使用方法：Supabase Dashboard → SQL Editor → 粘贴执行
-- ============================================================

ALTER TABLE public.client_tasks ADD COLUMN IF NOT EXISTS error TEXT;
