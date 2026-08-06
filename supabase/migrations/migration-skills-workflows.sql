-- ============================================================
-- PromptHub - Skills / Workflows 支柱扩展（Phase 0）
-- 在既有 prompts 体系之外，新增两个平行板块：
--   skills     → 可安装的技能包（Claude Skill / Cursor Rules / Codex…）
--   workflows  → 可编排的多步骤工作流（Agent 编排 / 自动化模板 / 开发脚手架）
-- 使用方法：Supabase Dashboard → SQL Editor → 粘贴执行
-- ============================================================

-- 一、技能分类表
CREATE TABLE IF NOT EXISTS public.skill_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.skill_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "公开读取技能分类" ON public.skill_categories
  FOR SELECT USING (true);


-- 二、技能表（Skill：可安装的能力包）
CREATE TABLE IF NOT EXISTS public.skills (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  content TEXT NOT NULL,                    -- 技能正文（SKILL.md / 规则文本 / 指令）
  skill_format TEXT DEFAULT 'claude-skill'
    CHECK (skill_format IN ('claude-skill','claude-code','cursor-rules','codex','gpt-actions','gemini-extension','cross-model','tool-server')),
  compatible_models TEXT[] DEFAULT '{}',    -- 适配模型
  install_instructions TEXT,                -- 安装步骤（Markdown / 命令）
  example_output TEXT,                      -- 测试过的输出
  category_id INT REFERENCES public.skill_categories(id) ON DELETE SET NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  usage_count INT DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skills_category ON public.skills(category_id);
CREATE INDEX IF NOT EXISTS idx_skills_tags ON public.skills USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_skills_title_search ON public.skills
  USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '')));

ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "公开读取已发布技能" ON public.skills
  FOR SELECT USING (is_published = true);
CREATE POLICY "作者读取自己的技能" ON public.skills
  FOR SELECT USING (auth.uid() = author_id);
CREATE POLICY "用户提交技能" ON public.skills
  FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "用户修改自己的技能" ON public.skills
  FOR UPDATE USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE POLICY "用户删除自己的技能" ON public.skills
  FOR DELETE USING (auth.uid() = author_id);


-- 三、工作流分类表
CREATE TABLE IF NOT EXISTS public.workflow_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.workflow_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "公开读取工作流分类" ON public.workflow_categories
  FOR SELECT USING (true);


-- 四、工作流表（Workflow：可编排的多步骤流程）
CREATE TABLE IF NOT EXISTS public.workflows (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  steps JSONB DEFAULT '[]',                 -- [{step,title,tool,action,config}]
  workflow_type TEXT DEFAULT 'agent-orchestration'
    CHECK (workflow_type IN ('agent-orchestration','automation-template','dev-scaffold')),
  tools_required TEXT[] DEFAULT '{}',       -- 依赖工具（Claude Code / n8n / Make / Cursor…）
  config_content TEXT,                      -- 可复制的配置 / 导入 JSON
  expected_output TEXT,                     -- 测试过的预期输出
  tips TEXT,                                -- 调参/使用建议
  category_id INT REFERENCES public.workflow_categories(id) ON DELETE SET NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  usage_count INT DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflows_category ON public.workflows(category_id);
CREATE INDEX IF NOT EXISTS idx_workflows_tags ON public.workflows USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_workflows_title_search ON public.workflows
  USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '')));

ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "公开读取已发布工作流" ON public.workflows
  FOR SELECT USING (is_published = true);
CREATE POLICY "作者读取自己的工作流" ON public.workflows
  FOR SELECT USING (auth.uid() = author_id);
CREATE POLICY "用户提交工作流" ON public.workflows
  FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "用户修改自己的工作流" ON public.workflows
  FOR UPDATE USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE POLICY "用户删除自己的工作流" ON public.workflows
  FOR DELETE USING (auth.uid() = author_id);


-- 五、统一资源视图（跨三支柱搜索用）
-- 供未来 /search 与"按任务聚合页"使用
CREATE OR REPLACE VIEW public.assets_v AS
  SELECT 'prompt' AS asset_type, id, title, COALESCE(slug, id::text) AS slug, description,
         tags, COALESCE(model_name, '') AS model_name, usage_count, created_at, updated_at
  FROM public.prompts WHERE is_published = true
  UNION ALL
  SELECT 'skill' AS asset_type, id, title, COALESCE(slug, id::text) AS slug, description,
         tags, COALESCE(compatible_models[1], '') AS model_name, usage_count, created_at, updated_at
  FROM public.skills WHERE is_published = true
  UNION ALL
  SELECT 'workflow' AS asset_type, id, title, COALESCE(slug, id::text) AS slug, description,
         tags, COALESCE(tools_required[1], '') AS model_name, usage_count, created_at, updated_at
  FROM public.workflows WHERE is_published = true;


-- 六、种子分类
INSERT INTO public.skill_categories (name, slug, description, sort_order) VALUES
  ('Coding Skills', 'coding', 'Skills for developers: code review, refactoring, testing, debugging', 1),
  ('Writing Skills', 'writing', 'Skills for writing and content creation', 2),
  ('Research & Agents', 'research-agents', 'Skills for research, analysis, and autonomous agents', 3),
  ('General Skills', 'general', 'General purpose skills', 4),
  ('Video Production', 'video-production', 'Skills for video creation: scripting, editing, grading, subtitles, SEO', 5);

INSERT INTO public.workflow_categories (name, slug, description, sort_order) VALUES
  ('Content Pipeline', 'content-pipeline', 'Multi-step content creation workflows', 1),
  ('Dev Workflow', 'dev-workflow', 'Development and engineering workflows', 2),
  ('Data & Research', 'data-research', 'Data analysis and research workflows', 3),
  ('General Workflows', 'general', 'General purpose workflows', 4);
