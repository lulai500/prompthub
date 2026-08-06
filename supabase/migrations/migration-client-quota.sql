-- ============================================================
-- PromptHub - 客户工作站 AI 额度会员化（B2B 变现）
-- clients.tier + pro_expires_at + client_subscriptions
-- free=20 次/月，pro=500 次/月（额度常量在代码 src/lib/client-quota.ts）
-- ============================================================

-- 1. clients 增加额度分档（pro 判断以 pro_expires_at 为权威，tier 仅展示）
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'free'
  CHECK (tier IN ('free', 'pro'));
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS pro_expires_at TIMESTAMPTZ; -- NULL=无有效订阅；过期自动回落 free

-- 2. 客户订阅记录（Lemon Squeezy subscription 落点；幂等键防 webhook 重试）
CREATE TABLE IF NOT EXISTS public.client_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  client_id INT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  lemon_squeezy_subscription_id TEXT NOT NULL UNIQUE,
  variant_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_client_subs_client ON public.client_subscriptions(client_id);

ALTER TABLE public.client_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "客户读自己的订阅" ON public.client_subscriptions
  FOR SELECT USING (client_id = public.my_client_id());
CREATE POLICY "站主管理订阅" ON public.client_subscriptions
  FOR ALL USING (public.is_owner()) WITH CHECK (public.is_owner());
