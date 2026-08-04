-- ============================================================
-- PromptHub - 每日活跃 + 使用 Streaks
-- user_activity：每个用户每天的活跃记录（用于连续使用 streak）
-- 使用方法：Supabase Dashboard → SQL Editor → 粘贴执行
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_activity (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  active_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, active_date)
);

CREATE INDEX IF NOT EXISTS idx_user_activity_user
  ON public.user_activity(user_id, active_date DESC);

ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

-- 用户只能管理自己的活动记录
CREATE POLICY "用户管理自己的活动" ON public.user_activity
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
