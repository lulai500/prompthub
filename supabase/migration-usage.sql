-- ============================================================
-- PromptHub - 用户使用历史
-- user_usage：记录每个用户复制/使用过的资产（数据沉淀 → 客户依赖）
-- 使用方法：Supabase Dashboard → SQL Editor → 粘贴执行
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_usage (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('prompt', 'skill', 'workflow')),
  asset_id INT NOT NULL,
  use_count INT DEFAULT 1,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, asset_type, asset_id)      -- 每人每资产一条，累计次数
);

CREATE INDEX IF NOT EXISTS idx_user_usage_user
  ON public.user_usage(user_id, last_used_at DESC);

ALTER TABLE public.user_usage ENABLE ROW LEVEL SECURITY;

-- 用户只能管理自己的使用记录
CREATE POLICY "用户管理自己的使用记录" ON public.user_usage
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- 原子递增使用次数（服务端调用，幂等）
CREATE OR REPLACE FUNCTION public.increment_user_usage(
  p_user_id uuid,
  p_asset_type text,
  p_asset_id int
) RETURNS void AS $$
BEGIN
  INSERT INTO public.user_usage (user_id, asset_type, asset_id, use_count, last_used_at)
  VALUES (p_user_id, p_asset_type, p_asset_id, 1, now())
  ON CONFLICT (user_id, asset_type, asset_id)
  DO UPDATE SET use_count = public.user_usage.use_count + 1, last_used_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
