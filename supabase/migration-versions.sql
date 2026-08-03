-- ============================================================
-- PromptHub - 资产版本历史
-- asset_versions 表 + 触发器：内容变化时自动快照
-- 详情页显示版本数 + 最后更新；版本历史页可查看快照
-- 使用方法：Supabase Dashboard → SQL Editor → 粘贴执行
-- ============================================================

CREATE TABLE IF NOT EXISTS public.asset_versions (
  id SERIAL PRIMARY KEY,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('prompt', 'skill', 'workflow')),
  asset_id INT NOT NULL,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asset_versions_asset
  ON public.asset_versions(asset_type, asset_id, id DESC);

ALTER TABLE public.asset_versions ENABLE ROW LEVEL SECURITY;
-- 公开可读（版本历史展示）
CREATE POLICY "公开读取版本历史" ON public.asset_versions
  FOR SELECT USING (true);
-- 写入仅由触发器（SECURITY DEFINER）完成，不开放客户端 INSERT


-- 触发器函数：按表取版本内容，内容变化才记录
CREATE OR REPLACE FUNCTION public.record_asset_version()
RETURNS TRIGGER AS $$
DECLARE
  c TEXT;
  h TEXT;
  t TEXT;
BEGIN
  t := CASE TG_TABLE_NAME
         WHEN 'prompts' THEN 'prompt'
         WHEN 'skills' THEN 'skill'
         WHEN 'workflows' THEN 'workflow'
       END;
  c := CASE TG_TABLE_NAME
         WHEN 'prompts' THEN NEW.content
         WHEN 'skills' THEN NEW.content
         WHEN 'workflows' THEN NEW.steps::text || ' ' || COALESCE(NEW.description, '')
       END;
  h := md5(c);

  -- UPDATE 时若内容未变则不记录（避免噪声）
  IF TG_OP = 'UPDATE' THEN
    IF EXISTS (
      SELECT 1 FROM public.asset_versions
      WHERE asset_type = t AND asset_id = NEW.id
      HAVING max(content_hash) = h
    ) THEN
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.asset_versions (asset_type, asset_id, content, content_hash)
  VALUES (t, NEW.id, c, h);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';


-- 三张资产表各建触发器
DROP TRIGGER IF EXISTS trg_prompt_version ON public.prompts;
CREATE TRIGGER trg_prompt_version
  AFTER INSERT OR UPDATE OF content ON public.prompts
  FOR EACH ROW EXECUTE FUNCTION public.record_asset_version();

DROP TRIGGER IF EXISTS trg_skill_version ON public.skills;
CREATE TRIGGER trg_skill_version
  AFTER INSERT OR UPDATE OF content ON public.skills
  FOR EACH ROW EXECUTE FUNCTION public.record_asset_version();

DROP TRIGGER IF EXISTS trg_workflow_version ON public.workflows;
CREATE TRIGGER trg_workflow_version
  AFTER INSERT OR UPDATE OF steps, description ON public.workflows
  FOR EACH ROW EXECUTE FUNCTION public.record_asset_version();


-- 回填：现有资产各记录为 v1（幂等：无版本记录的才插入）
INSERT INTO public.asset_versions (asset_type, asset_id, content, content_hash)
SELECT 'prompt', id, content, md5(content) FROM public.prompts p
WHERE is_published = true
  AND NOT EXISTS (SELECT 1 FROM public.asset_versions v WHERE v.asset_type = 'prompt' AND v.asset_id = p.id);

INSERT INTO public.asset_versions (asset_type, asset_id, content, content_hash)
SELECT 'skill', id, content, md5(content) FROM public.skills s
WHERE is_published = true
  AND NOT EXISTS (SELECT 1 FROM public.asset_versions v WHERE v.asset_type = 'skill' AND v.asset_id = s.id);

INSERT INTO public.asset_versions (asset_type, asset_id, content, content_hash)
SELECT 'workflow', id, steps::text || ' ' || COALESCE(description, ''), md5(steps::text || ' ' || COALESCE(description, ''))
FROM public.workflows w
WHERE is_published = true
  AND NOT EXISTS (SELECT 1 FROM public.asset_versions v WHERE v.asset_type = 'workflow' AND v.asset_id = w.id);
