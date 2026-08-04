-- ============================================================
-- PromptHub - 公开收藏集（Collections）
-- 用户把精选资产做成可分享的公开列表 → 网络效应 + 切换成本
-- 使用方法：Supabase Dashboard → SQL Editor → 粘贴执行
-- ============================================================

CREATE TABLE IF NOT EXISTS public.collections (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_collections_user ON public.collections(user_id);

CREATE TABLE IF NOT EXISTS public.collection_items (
  id SERIAL PRIMARY KEY,
  collection_id INT NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('prompt', 'skill', 'workflow')),
  asset_id INT NOT NULL,
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(collection_id, asset_type, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_collection_items_collection ON public.collection_items(collection_id);

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;

-- collections：公开的任何人可读；owner 管理自己的
CREATE POLICY "公开读取公开收藏集" ON public.collections
  FOR SELECT USING (is_public = true);
CREATE POLICY "用户管理自己的收藏集" ON public.collections
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- collection_items：所属收藏集公开或 owner 时可读；owner 可管理条目
CREATE POLICY "公开读取收藏集条目" ON public.collection_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.collections c
            WHERE c.id = collection_id AND (c.is_public = true OR c.user_id = auth.uid()))
  );
CREATE POLICY "用户插入收藏集条目" ON public.collection_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.collections c
            WHERE c.id = collection_id AND c.user_id = auth.uid())
  );
CREATE POLICY "用户更新收藏集条目" ON public.collection_items
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.collections c
            WHERE c.id = collection_id AND c.user_id = auth.uid())
  ) WITH CHECK (true);
CREATE POLICY "用户删除收藏集条目" ON public.collection_items
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.collections c
            WHERE c.id = collection_id AND c.user_id = auth.uid())
  );
