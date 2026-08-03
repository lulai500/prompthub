-- ============================================================
-- PromptHub - "我测试过"验证表
-- 用户标记某条提示词"我测试过，有效"，累积验证数强化 tested 叙事
-- 使用方法：Supabase Dashboard → SQL Editor → 粘贴执行
-- ============================================================

CREATE TABLE IF NOT EXISTS public.verifications (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt_id INT NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, prompt_id)              -- 同一用户对同一提示词只能验证一次
);

CREATE INDEX IF NOT EXISTS idx_verifications_prompt ON public.verifications(prompt_id);

ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;

-- 公开可读（详情页展示验证数量）
CREATE POLICY "公开读取验证" ON public.verifications
  FOR SELECT USING (true);

-- 登录用户管理自己的验证（增删查）
CREATE POLICY "用户管理自己的验证" ON public.verifications
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
