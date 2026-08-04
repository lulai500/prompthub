-- ============================================================
-- PromptHub - 提示词全文检索（复用既有 idx_prompts_title_search GIN）
-- 仅返回当前页 id + 相关度 rank + 匹配总数 total。
-- 注意 SECURITY INVOKER（默认）：RLS 自动过滤未发布行，勿改 SECURITY DEFINER。
-- ============================================================

CREATE OR REPLACE FUNCTION public.search_prompts_fts(
  p_search   text DEFAULT '',
  p_category_id int DEFAULT NULL,
  p_tag      text DEFAULT NULL,
  p_sort     text DEFAULT 'latest',   -- latest | oldest | most_used
  p_page     int  DEFAULT 1,
  p_limit    int  DEFAULT 12
) RETURNS TABLE(id bigint, rank real, total bigint)
LANGUAGE sql STABLE SET search_path = '' AS $$
  WITH ts AS (
    -- NULLIF：仅停用词（如 "the"）→ 空 tsquery → 视为未搜索
    SELECT NULLIF(plainto_tsquery('english', btrim(p_search)), ''::tsquery) AS t
  ),
  base AS (
    SELECT p.id,
           p.usage_count,
           p.created_at,
           to_tsvector('english', p.title || ' ' || COALESCE(p.description, '')) AS tsv,
           count(*) OVER() AS total
    FROM public.prompts p, ts
    WHERE p.is_published = true
      AND (ts.t IS NULL
           OR to_tsvector('english', p.title || ' ' || COALESCE(p.description, '')) @@ ts.t)
      AND (p_category_id IS NULL OR p.category_id = p_category_id)
      AND (p_tag IS NULL OR p.tags @> ARRAY[p_tag])
  )
  SELECT b.id,
         CASE WHEN ts.t IS NULL THEN 0::real ELSE ts_rank(b.tsv, ts.t) END AS rank,
         b.total
  FROM base b, ts
  ORDER BY
    CASE WHEN ts.t IS NOT NULL THEN 0 ELSE 1 END,                 -- 有搜索 → 相关度优先
    CASE WHEN ts.t IS NOT NULL THEN ts_rank(b.tsv, ts.t) END DESC,
    CASE WHEN p_sort = 'most_used' THEN b.usage_count END DESC,
    CASE WHEN p_sort = 'oldest' THEN b.created_at END ASC,
    b.created_at DESC
  LIMIT p_limit OFFSET (GREATEST(p_page, 1) - 1) * p_limit;
$$;

REVOKE ALL ON FUNCTION public.search_prompts_fts(text, int, text, text, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_prompts_fts(text, int, text, text, int, int) TO anon, authenticated;
