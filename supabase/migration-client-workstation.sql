-- ============================================================
-- PromptHub - 客户工作站（B2B 接单工具）数据层
-- profiles.role + clients / client_projects / client_tasks
-- 使用方法：Supabase Dashboard → SQL Editor → 粘贴执行
-- （或 Management API：POST /v1/projects/{ref}/database/query）
-- ============================================================

-- 1. profiles 增加 role 与首次改密标记
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'owner', 'client'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 1-b. 角色判定助手（RLS 与触发器共用；SECURITY DEFINER 供 owner 子查询）
CREATE OR REPLACE FUNCTION public.is_owner() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'owner');
$$;

-- 1-c. 防止越权改 role：非 owner 且非服务端(SQL editor/service role)时强制保持原值
--     现有 profiles UPDATE RLS 允许用户改自己行任意列，加 role 后客户端可自提权，必须拦截
CREATE OR REPLACE FUNCTION public.protect_profile_role() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND NOT public.is_owner()
     AND current_user NOT IN ('service_role', 'postgres') THEN
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

-- 2. 客户表（=客户登录账号的归属档案）
CREATE TABLE IF NOT EXISTS public.clients (
  id SERIAL PRIMARY KEY,
  account_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE, -- 客户登录账号
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,          -- 归属站主
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_clients_account ON public.clients(account_id);
CREATE INDEX IF NOT EXISTS idx_clients_owner   ON public.clients(owner_id);

-- 1-c. 当前登录用户对应的客户 id（非客户返回 null）
-- 需在 clients 表之后定义（SQL 语言函数会解析引用表）
CREATE OR REPLACE FUNCTION public.my_client_id() RETURNS int
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT id FROM public.clients WHERE account_id = auth.uid() LIMIT 1;
$$;

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "客户读自己的档案" ON public.clients
  FOR SELECT USING (account_id = auth.uid());
CREATE POLICY "站主全权管理客户" ON public.clients
  FOR ALL USING (public.is_owner()) WITH CHECK (public.is_owner());

-- 3. 客户项目（站主维护元数据；客户只读）
CREATE TABLE IF NOT EXISTS public.client_projects (
  id SERIAL PRIMARY KEY,
  client_id INT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cp_client ON public.client_projects(client_id);

ALTER TABLE public.client_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "客户读自己的项目" ON public.client_projects
  FOR SELECT USING (client_id = public.my_client_id());
CREATE POLICY "站主管理项目" ON public.client_projects
  FOR ALL USING (public.is_owner()) WITH CHECK (public.is_owner());

-- 4. 客户任务（交付物落点；执行结果由服务端 service_role 写，客户不可篡改）
CREATE TABLE IF NOT EXISTS public.client_tasks (
  id SERIAL PRIMARY KEY,
  project_id INT NOT NULL REFERENCES public.client_projects(id) ON DELETE CASCADE,
  client_id INT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  input TEXT NOT NULL,                       -- 客户原始需求
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','failed')),
  matched_task_slug TEXT,                    -- 匹配到的 TASKS slug
  prompt_id INT,                             -- 实际使用的提示词 id（审计）
  result TEXT,                               -- AI 生成交付物（纯文本）
  tokens INT,                                -- DeepSeek usage.total_tokens（用量）
  asset_ids JSONB DEFAULT '[]',              -- 资产快照
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ct_client ON public.client_tasks(client_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ct_project ON public.client_tasks(project_id);

ALTER TABLE public.client_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "客户读自己的任务" ON public.client_tasks
  FOR SELECT USING (client_id = public.my_client_id());
-- 客户可预建 pending 任务（必须归属自己 + 归属自己的项目 + 初始 pending）
CREATE POLICY "客户新增自己的任务" ON public.client_tasks
  FOR INSERT WITH CHECK (
    client_id = public.my_client_id()
    AND status = 'pending'
    AND result IS NULL
    AND project_id IN (SELECT id FROM public.client_projects WHERE client_id = public.my_client_id())
  );
CREATE POLICY "站主管理任务" ON public.client_tasks
  FOR ALL USING (public.is_owner()) WITH CHECK (public.is_owner());
