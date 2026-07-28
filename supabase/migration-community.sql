-- ============================================================
-- Migration #2: 社区功能升级
-- 新增：作者关联 + 评分系统
-- 在 Supabase SQL Editor 中运行
-- ============================================================

-- ============================================================
-- 一、prompts 表增加 author_id
-- ============================================================
ALTER TABLE public.prompts
  ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 索引：加速按作者查询
CREATE INDEX IF NOT EXISTS idx_prompts_author ON public.prompts(author_id);

-- ============================================================
-- 二、评分表
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ratings (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt_id INT NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, prompt_id)  -- 每个用户对每个提示词只能评分一次
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_ratings_prompt ON public.ratings(prompt_id);
CREATE INDEX IF NOT EXISTS idx_ratings_user ON public.ratings(user_id);

-- RLS
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "公开读取评分" ON public.ratings
  FOR SELECT USING (true);
CREATE POLICY "用户管理自己的评分" ON public.ratings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 三、prompt_stats 视图（收藏数 + 平均评分 + 评分人数）
-- ============================================================
CREATE OR REPLACE VIEW public.prompt_stats AS
SELECT
  p.id AS prompt_id,
  COUNT(DISTINCT f.id) AS favorite_count,
  COALESCE(AVG(r.rating), 0) AS avg_rating,
  COUNT(DISTINCT r.id) AS rating_count
FROM public.prompts p
LEFT JOIN public.favorites f ON f.prompt_id = p.id
LEFT JOIN public.ratings r ON r.prompt_id = p.id
GROUP BY p.id;

-- ============================================================
-- 四、profiles 公开视图（脱敏：只暴露公开信息）
-- ============================================================
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT
  id,
  username,
  avatar_url,
  bio,
  created_at
FROM public.profiles;

-- ============================================================
-- 五、触发器：prompts 更新时自动更新 updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prompts_updated_at ON public.prompts;
CREATE TRIGGER trg_prompts_updated_at
  BEFORE UPDATE ON public.prompts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 六、更新 RLS：允许用户创建和修改自己的提示词
-- ============================================================
CREATE POLICY "用户创建提示词" ON public.prompts
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "用户修改自己的提示词" ON public.prompts
  FOR UPDATE USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);

CREATE POLICY "用户删除自己的提示词" ON public.prompts
  FOR DELETE USING (auth.uid() = author_id);

-- ============================================================
-- 完成！
-- ============================================================
