-- ============================================================
-- PromptHub - Newsletter 订阅表（Phase 1）
-- 收集订阅邮箱；真正发送周报由可选的外部提供商承接（Buttondown 等）
-- 使用方法：Supabase Dashboard → SQL Editor → 粘贴执行
-- ============================================================

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,            -- 订阅邮箱（唯一，防止重复订阅）
  source TEXT DEFAULT 'footer',          -- 订阅来源：footer / prompt_detail / skill_detail / workflow_detail
  status TEXT DEFAULT 'subscribed'
    CHECK (status IN ('subscribed', 'unsubscribed', 'bounced')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_created
  ON public.newsletter_subscribers(created_at DESC);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- 任何人可提交订阅（公开表单，配合 API 端限流防滥用）
CREATE POLICY "任何人可订阅" ON public.newsletter_subscribers
  FOR INSERT WITH CHECK (true);

-- 登录用户可查看订阅列表（Phase 1 单人运营；多管理员后再收紧为仅 owner）
CREATE POLICY "登录用户可查看订阅" ON public.newsletter_subscribers
  FOR SELECT USING (auth.role() = 'authenticated');
