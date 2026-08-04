-- ============================================================
-- PromptHub - "我测试过"验证表泛化（三支柱）
-- 旧 verifications 仅支持 prompts；此迁移新建 asset_verifications
-- 覆盖 prompts / skills / workflows，并迁移旧数据。
-- 结构对齐 asset_versions / user_usage（asset_type + asset_id，无外键）。
-- ============================================================

-- 1. 新表：统一验证记录（每人每资产一次）
CREATE TABLE IF NOT EXISTS public.asset_verifications (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('prompt','skill','workflow')),
  asset_id INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, asset_type, asset_id)        -- 每人每资产只能验证一次
);

CREATE INDEX IF NOT EXISTS idx_asset_verifications_asset
  ON public.asset_verifications(asset_type, asset_id);

-- 2. RLS：公开可读计数 / 用户管理自己的验证
ALTER TABLE public.asset_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "公开读取资产验证" ON public.asset_verifications
  FOR SELECT USING (true);

CREATE POLICY "用户管理自己的资产验证" ON public.asset_verifications
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. 迁移旧数据（幂等；旧表保留一个发布周期，确认后再删）
INSERT INTO public.asset_verifications (user_id, asset_type, asset_id, created_at)
SELECT user_id, 'prompt', prompt_id, created_at FROM public.verifications
ON CONFLICT (user_id, asset_type, asset_id) DO NOTHING;

-- 提示：确认新表工作正常后，再执行：
--   DROP TABLE IF EXISTS public.verifications;
--   DROP INDEX IF EXISTS idx_verifications_prompt;
