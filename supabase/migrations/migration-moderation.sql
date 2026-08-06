-- ============================================================
-- PromptHub — Content Moderation Migration
--
-- Run in Supabase SQL Editor to enable moderation:
--   1. Allows authors to see their own unpublished prompts
--   2. (Optional) Set all existing prompts to published
-- ============================================================

-- 1. Add policy: authors can read their own prompts regardless of publish status
--    This allows users to see their pending submissions on their dashboard.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = '作者读取自己的提示词'
    AND tablename = 'prompts'
  ) THEN
    CREATE POLICY "作者读取自己的提示词" ON public.prompts
      FOR SELECT USING (auth.uid() = author_id);
  END IF;
END $$;

-- 2. Ensure all existing prompts are published (backfill)
--    Comment this out if you want to manually review existing prompts.
UPDATE public.prompts SET is_published = true WHERE is_published IS NOT true;

-- 3. Verify policy state
SELECT tablename, policyname, cmd, permissive, qual
FROM pg_policies
WHERE tablename = 'prompts'
ORDER BY policyname;
