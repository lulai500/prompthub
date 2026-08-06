-- ============================================================
-- PromptHub - 收藏集关注（Collection Followers）
-- 用户关注他人公开收藏集 → 网络效应第二层（订阅彼此精选）
-- 使用方法：Supabase Dashboard → SQL Editor → 粘贴执行
-- ============================================================

CREATE TABLE IF NOT EXISTS public.collection_followers (
  id SERIAL PRIMARY KEY,
  collection_id INT NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(collection_id, user_id)          -- 同一用户对同一收藏集只能关注一次
);

CREATE INDEX IF NOT EXISTS idx_collection_followers_collection
  ON public.collection_followers(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_followers_user
  ON public.collection_followers(user_id, created_at DESC);

ALTER TABLE public.collection_followers ENABLE ROW LEVEL SECURITY;

-- 公开可读（详情页展示关注者数，登录用户可查自己的关注）
CREATE POLICY "公开读取关注" ON public.collection_followers
  FOR SELECT USING (true);

-- 登录用户管理自己的关注
CREATE POLICY "用户管理自己的关注" ON public.collection_followers
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
