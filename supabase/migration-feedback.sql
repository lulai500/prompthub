-- ============================================================
-- Migration #3: 用户反馈系统
-- 在 Supabase SQL Editor 中运行
-- ============================================================

-- 反馈类型枚举
CREATE TYPE public.feedback_type AS ENUM ('suggestion', 'bug_report', 'feature_request', 'other');

-- 反馈状态枚举
CREATE TYPE public.feedback_status AS ENUM ('new', 'reviewed', 'planned', 'in_progress', 'completed', 'declined');

-- 反馈表
CREATE TABLE IF NOT EXISTS public.feedback (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- NULL = 匿名反馈
  type feedback_type NOT NULL DEFAULT 'suggestion',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  email TEXT,                                                   -- 可选：便于回复
  status feedback_status NOT NULL DEFAULT 'new',
  admin_notes TEXT,                                             -- 管理员内部备注
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_feedback_type ON public.feedback(type);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_user ON public.feedback(user_id);

-- RLS：任何人都可以提交反馈（匿名或登录）
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "任何人可提交反馈" ON public.feedback
  FOR INSERT WITH CHECK (true);
CREATE POLICY "用户查看自己的反馈" ON public.feedback
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- ============================================================
-- 完成！
-- ============================================================
