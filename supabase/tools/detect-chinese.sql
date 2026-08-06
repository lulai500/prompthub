-- ============================================================
-- 检测数据库中包含中文的提示词
-- 在 Supabase SQL Editor 中运行此脚本
-- ============================================================

-- 1. 统计：中文提示词 vs 英文提示词
SELECT
  CASE
    WHEN title ~ '[一-鿿]' THEN '中文 (Chinese)'
    ELSE '英文 (English)'
  END AS language,
  COUNT(*) AS count
FROM public.prompts
WHERE is_published = true
GROUP BY language;

-- 2. 列出所有中文提示词的标题和 ID
SELECT
  id,
  title,
  CASE
    WHEN description ~ '[一-鿿]' THEN '含中文描述'
    ELSE '英文描述'
  END AS desc_lang,
  CASE
    WHEN content ~ '[一-鿿]' THEN '含中文内容'
    ELSE '英文内容'
  END AS content_lang,
  category_id,
  usage_count,
  created_at
FROM public.prompts
WHERE is_published = true
  AND (title ~ '[一-鿿]' OR description ~ '[一-鿿]' OR content ~ '[一-鿿]')
ORDER BY id;

-- 3. 导出中文提示词的完整数据（用于翻译后重新导入）
SELECT
  id,
  title,
  slug,
  description,
  content,
  category_id,
  model_name,
  tips,
  tags,
  usage_count,
  is_published
FROM public.prompts
WHERE is_published = true
  AND (title ~ '[一-鿿]' OR description ~ '[一-鿿]' OR content ~ '[一-鿿]')
ORDER BY id;
