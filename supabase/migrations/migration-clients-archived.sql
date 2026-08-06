-- ============================================================
-- PromptHub - clients.status 扩展 archived（归档客户）
-- 归档 = 从默认列表隐藏 + 禁止执行任务；可随时恢复为 active
-- ============================================================

ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_status_check;
ALTER TABLE public.clients
  ADD CONSTRAINT clients_status_check CHECK (status IN ('active', 'paused', 'archived'));
