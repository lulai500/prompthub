-- ============================================================
-- PromptHub 全量迁移+种子（一条龙执行）
-- 顺序：3 个迁移（建表）→ 4 个种子（填内容）
-- 使用方法：Supabase SQL Editor → 粘贴整个文件 → Run
-- ============================================================

-- ########## 1/7 migration-skills-workflows ##########
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

-- ########## 2/7 migration-newsletter ##########
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

-- ########## 3/7 migration-verifications ##########
-- ============================================================
-- PromptHub - "我测试过"验证表
-- 用户标记某条提示词"我测试过，有效"，累积验证数强化 tested 叙事
-- 使用方法：Supabase Dashboard → SQL Editor → 粘贴执行
-- ============================================================

CREATE TABLE IF NOT EXISTS public.verifications (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt_id INT NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, prompt_id)              -- 同一用户对同一提示词只能验证一次
);

CREATE INDEX IF NOT EXISTS idx_verifications_prompt ON public.verifications(prompt_id);

ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;

-- 公开可读（详情页展示验证数量）
CREATE POLICY "公开读取验证" ON public.verifications
  FOR SELECT USING (true);

-- 登录用户管理自己的验证（增删查）
CREATE POLICY "用户管理自己的验证" ON public.verifications
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ########## 4/7 seed-skills-workflows ##########
-- ============================================================
-- PromptHub - Phase 1 内容种子：Skills + 示例 Workflows
-- ⚠️ 必须先执行 supabase/migration-skills-workflows.sql，再运行本文件
-- 使用方法：Supabase Dashboard → SQL Editor → 粘贴执行
-- 幂等：ON CONFLICT (slug) DO NOTHING，可安全重复执行
-- ============================================================

-- ============================================================
-- 一、Skills（24 条：Coding 6 / Writing 6 / Research 6 / General 6）
-- ============================================================

INSERT INTO public.skills
  (title, slug, description, content, skill_format, compatible_models, install_instructions, example_output, category_id, tags)
VALUES
-- ---------- Coding ----------
(
  'Senior Code Reviewer',
  'senior-code-reviewer',
  'Reviews code for quality, security, and performance with actionable, prioritized feedback.',
  $$---
name: senior-code-reviewer
description: Reviews code with actionable, prioritized feedback.

You are a senior software engineer conducting a code review.

1. Analyze the provided code for: correctness, security, performance, readability, error handling.
2. Prioritize every finding: Critical / Warning / Suggestion.
3. For each finding show: the issue, why it matters, and a concrete fix with code.
4. End with a summary of strengths and the top 3 priorities.
5. If the code is missing or ambiguous, ask before assuming.$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','DeepSeek V3'],
  $$## Install
1. Create folder: `~/.claude/skills/code-reviewer/`
2. Save this content as `SKILL.md`
3. Invoke: "Use the code reviewer skill on this snippet"$$,
  $$### Finding 1 (Critical) — SQL Injection
`query = "SELECT * FROM users WHERE id = " + user_id`

Concatenating user input into SQL is an injection vector.

**Fix:**
```python
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
```

**Top 3 priorities:**
1. Parameterize all SQL queries
2. Add input validation for `user_id`
3. Add a regression test for injection cases$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'coding'),
  ARRAY['code-review','security','best-practices','quality']
),
(
  'Unit Test Generator',
  'unit-test-generator',
  'Generates comprehensive unit tests covering normal, error, and edge cases.',
  $$---
name: unit-test-generator
description: Generates unit tests for the given function or component.

You are a test engineer writing unit tests.

1. Identify the function signature and its inputs/outputs.
2. Generate tests for three groups: normal cases, error cases, edge cases.
3. Use the target test framework and naming conventions.
4. Mock external dependencies; keep tests isolated and fast.
5. Include one test for each documented behavior.$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','Llama 3.3'],
  $$## Install
1. Create folder: `~/.claude/skills/unit-test-generator/`
2. Save as `SKILL.md`
3. Invoke: "Generate unit tests for this function"$$,
  $$describe('parseConfig', () => {
  it('returns default values when config is empty', () => {
    expect(parseConfig({})).toEqual(DEFAULTS);
  });

  it('throws on invalid port', () => {
    expect(() => parseConfig({ port: 'abc' })).toThrow('Invalid port');
  });

  it('clamps negative timeout to zero', () => {
    expect(parseConfig({ timeout: -5 }).timeout).toBe(0);
  });
});$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'coding'),
  ARRAY['testing','unit-tests','quality','jest']
),
(
  'Git Commit Message Writer',
  'git-commit-message-writer',
  'Writes clear, conventional commit messages from a diff.',
  $$---
name: git-commit-message-writer
description: Writes conventional, descriptive commit messages.

You are a version-control expert.

1. Read the diff and summarize the change in one line.
2. Use Conventional Commits: type(scope): description.
3. Add a body explaining why the change was made and any breaking notes.
4. Keep the summary under 72 characters; wrap body at 72.
5. If multiple concerns exist, suggest splitting the commit.$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','Gemini 2.0 Flash'],
  $$## Install
1. Create folder: `~/.claude/skills/commit-message/`
2. Save as `SKILL.md`
3. Invoke: "Write a commit message for this diff"$$,
  $$fix(auth): validate refresh token expiry before reuse

The refresh token endpoint accepted expired tokens and returned a
400 with a confusing message. Validate expiry client-side and return
a clear 401 so callers can re-authenticate.

Breaking: callers must now handle 401 for expired refresh tokens.$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'coding'),
  ARRAY['git','commit','conventional-commits','workflow']
),
(
  'Regex Builder & Explainer',
  'regex-builder',
  'Builds robust regular expressions and explains them step by step.',
  $$---
name: regex-builder
description: Builds and explains regular expressions.

You are a regex specialist.

1. Given a pattern or a goal, produce a working regex.
2. Include flags (i, g, m, s) and a character-by-character breakdown.
3. Show 3 test cases: a match, a non-match, and a tricky edge case.
4. Prefer readable, maintainable expressions over clever ones.
5. Warn about catastrophic backtracking if relevant.$$,
  'claude-skill',
  ARRAY['GPT-4o','Claude 3.7 Sonnet','Gemini 2.0 Flash'],
  $$## Install
1. Create folder: `~/.claude/skills/regex-builder/`
2. Save as `SKILL.md`
3. Invoke: "Build a regex for email addresses"$$,
  $$Pattern: ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$

Breakdown:
- ^[A-Za-z0-9._%+-]+  → local part
- @                  → literal at sign
- [A-Za-z0-9.-]+     → domain
- \.[A-Za-z]{2,}$    → TLD (2+ letters)

Tests:
- user@example.com   → match
- user@example       → no match (missing TLD)
- user+tag@sub.co.uk → match$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'coding'),
  ARRAY['regex','text-processing','tools']
),
(
  'API Documentation Generator',
  'api-doc-generator',
  'Generates clear API documentation from code or OpenAPI specs.',
  $$---
name: api-doc-generator
description: Generates clear API documentation.

You are an API documentation writer.

1. For each endpoint, document: purpose, method, path, auth, params, request body, response, errors.
2. Provide a minimal working example (curl or SDK call).
3. Note rate limits, pagination, and versioning.
4. Write for a developer who has never seen the codebase.$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','Gemini 1.5 Pro'],
  $$## Install
1. Create folder: `~/.claude/skills/api-doc-generator/`
2. Save as `SKILL.md`
3. Invoke: "Document this endpoint"$$,
  $$### GET /v1/users/:id
Returns a single user by ID.

Auth: Bearer token (read scope)

Params:
| Name | Type | Required | Notes |
|------|------|----------|-------|
| id   | uuid | yes      | User ID |

Example:
```bash
curl -H "Authorization: Bearer $TOKEN" /v1/users/9b1f
```

Response 200:
```json
{ "id": "9b1f", "name": "Ada", "plan": "pro" }
```
Errors: 401 (no token), 404 (not found), 429 (rate limited)$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'coding'),
  ARRAY['api','documentation','openapi','developer-tools']
),
(
  'SQL Query Optimizer',
  'sql-query-optimizer',
  'Analyzes slow SQL queries and suggests concrete optimizations.',
  $$---
name: sql-query-optimizer
description: Optimizes slow SQL queries.

You are a database performance engineer.

1. Analyze the query for: missing indexes, full table scans, N+1 patterns, inefficient joins, over-fetching.
2. Explain the cost of the current approach.
3. Propose an optimized query and explain why it is faster.
4. Recommend the specific index to add, if any.
5. Mention when to use EXPLAIN ANALYZE to verify.$$,
  'claude-skill',
  ARRAY['GPT-4o','Claude 3.7 Sonnet','DeepSeek V3'],
  $$## Install
1. Create folder: `~/.claude/skills/sql-optimizer/`
2. Save as `SKILL.md`
3. Invoke: "Optimize this query"$$,
  $$Problem: `SELECT * FROM orders o JOIN customers c ON o.customer_id = c.id WHERE c.country = 'US'` scans 8M rows.

Fix 1 — Filter first, join later:
```sql
SELECT o.* FROM orders o
JOIN (SELECT id FROM customers WHERE country = 'US') c ON o.customer_id = c.id;
```

Fix 2 — Add index:
```sql
CREATE INDEX idx_customers_country ON customers (country);
CREATE INDEX idx_orders_customer ON orders (customer_id);
```

Verify with: `EXPLAIN ANALYZE SELECT ...`$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'coding'),
  ARRAY['sql','database','performance','optimization']
),

-- ---------- Writing ----------
(
  'Blog Post Writer',
  'blog-post-writer',
  'Plans and drafts SEO-friendly blog posts from a topic and audience.',
  $$---
name: blog-post-writer
description: Plans and drafts blog posts.

You are a professional content strategist and writer.

1. Clarify topic, audience, and goal before drafting.
2. Produce: working title, 3 title options, outline with H2/H3.
3. Write the draft in clear sections, 150-200 words each.
4. Include a hook, concrete examples, and a clear conclusion with CTA.
5. Match the brand voice provided; default to friendly and confident.$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','Gemini 2.0 Flash'],
  $$## Install
1. Create folder: `~/.claude/skills/blog-writer/`
2. Save as `SKILL.md`
3. Invoke: "Write a blog post about prompt engineering for non-coders"$$,
  $$Title: 5 Prompt Rules That Make AI 10x More Useful (No Coding Needed)

Outline:
- H2: Why prompts fail for most people
- H2: Rule 1 — Give the AI a role
- H2: Rule 2 — Bound the input
- H2: Rule 3 — Specify the output format
- H2: Rule 4 — Add one example
- H2: Rule 5 — Iterate, don't restart
- H2: A before/after example
- H2: Your first prompt exercise
- H2: Conclusion + CTA$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'writing'),
  ARRAY['blogging','content-strategy','seo','writing']
),
(
  'AIDA Copywriter',
  'aida-copywriter',
  'Writes marketing copy using the Attention-Interest-Desire-Action framework.',
  $$---
name: aida-copywriter
description: Writes AIDA marketing copy.

You are a direct-response copywriter.

1. Gather the product, audience, and key benefit.
2. Write copy following AIDA: Attention, Interest, Desire, Action.
3. Use concrete specifics over adjectives.
4. Provide one headline option and one alternative angle.
5. Keep it scannable: short lines, subheads, a clear CTA.$$,
  'claude-skill',
  ARRAY['GPT-4o','Claude 3.7 Sonnet','Gemini 2.0 Flash'],
  $$## Install
1. Create folder: `~/.claude/skills/aida-copywriter/`
2. Save as `SKILL.md`
3. Invoke: "Write AIDA copy for a scheduling app"$$,
  $$ATTENTION: Your calendar is lying to you.
INTEREST: Studies show 40% of the workday disappears into switching between tools.
DESIRE: Meet Plana — one place to plan, delegate, and actually finish your week.
ACTION: Start free. No card required. → plana.app$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'writing'),
  ARRAY['copywriting','marketing','aida','conversion']
),
(
  'SEO Article Writer',
  'seo-article-writer',
  'Writes search-optimized articles that target a keyword without sacrificing readability.',
  $$---
name: seo-article-writer
description: Writes SEO articles targeting a primary keyword.

You are an SEO content writer.

1. Use the primary keyword naturally in: title, H1, intro, one H2, and conclusion.
2. Include 1-2 related semantic keywords.
3. Write for humans first; never keyword-stuff.
4. Structure with H2/H3 so the article can rank for featured snippets.
5. End with a practical takeaway, not a sales pitch.$$,
  'claude-skill',
  ARRAY['GPT-4o','Claude 3.7 Sonnet','Gemini 2.0 Flash'],
  $$## Install
1. Create folder: `~/.claude/skills/seo-writer/`
2. Save as `SKILL.md`
3. Invoke: "Write an SEO article targeting 'best project management tools'"$$,
  $$Keyword: best project management tools
Semantic terms: task management, team collaboration, kanban

H1: 7 Best Project Management Tools in 2026 (Tested)
- H2: How we tested
- H2: 1. [Tool] — best for [use case] (+ pros/cons)
- H2: What to look for in a project tool
- H2: Quick comparison table
- H2: FAQ: Which tool is best for small teams?$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'writing'),
  ARRAY['seo','content-marketing','blogging','keyword-research']
),
(
  'Technical Documentation Writer',
  'tech-doc-writer',
  'Writes clear technical docs: quickstarts, references, and troubleshooting guides.',
  $$---
name: tech-doc-writer
description: Writes clear technical documentation.

You are a technical writer.

1. Match the provided doc type: quickstart, reference, or troubleshooting.
2. Lead with a one-paragraph summary of what the reader will accomplish.
3. Use numbered steps for procedures; never assume background knowledge.
4. Show exact commands/code blocks with expected output.
5. Add a troubleshooting section with the 3 most common errors.$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','Gemini 1.5 Pro'],
  $$## Install
1. Create folder: `~/.claude/skills/tech-doc-writer/`
2. Save as `SKILL.md`
3. Invoke: "Write a quickstart for installing the SDK"$$,
  $$# Quickstart: Install the SDK

In 5 minutes you will make your first API call.

1. Install the package
```bash
npm install @acme/sdk
```

2. Set your key
```bash
export ACME_API_KEY=sk_...
```

3. Make your first call
```js
import { createClient } from '@acme/sdk';
const client = createClient({ apiKey: process.env.ACME_API_KEY });
const res = await client.ping();
console.log(res.ok); // true
```

Troubleshooting:
- `ACME_API_KEY` not set → you will see "missing credentials".
- Timeouts → set `timeout` in options (default 10s).$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'writing'),
  ARRAY['documentation','technical-writing','quickstart','developer-education']
),
(
  'Newsletter Writer',
  'newsletter-writer',
  'Drafts a concise, engaging weekly newsletter from notes or topics.',
  $$---
name: newsletter-writer
description: Drafts engaging newsletters.

You are an email newsletter editor.

1. Build a 3-5 section newsletter: opening, main topic, quick links, CTA.
2. Keep the opening under 80 words; make it personal.
3. Write the main topic as a story or framework, not a listicle dump.
4. Include a one-line takeaway readers can act on.
5. Match a friendly, direct voice.$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','Gemini 2.0 Flash'],
  $$## Install
1. Create folder: `~/.claude/skills/newsletter-writer/`
2. Save as `SKILL.md`
3. Invoke: "Write this week's newsletter about our new AI feature"$$,
  $$Subject: AI that writes your release notes

Hi Ada,

Last week I kept writing release notes by hand. This week, I don't.

THE NEW THING
We shipped an AI writer inside the app. Drop in a diff, get a
human-sounding changelog in seconds.

WHY IT MATTERS
Small teams skip docs because docs are boring. Now they are 30
seconds, not 30 minutes.

READ THIS
- How we tested the AI writer against 500 real diffs
- The prompt template we use (copy it)

TAKEAWAY
If a task is boring and repeatable, it is automatable.

— Alex$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'writing'),
  ARRAY['newsletter','email','content','engagement']
),
(
  'Copy Editor & Proofreader',
  'copy-editor-proofreader',
  'Edits text for clarity, grammar, and consistency while preserving the author voice.',
  $$---
name: copy-editor-proofreader
description: Edits text for clarity and correctness.

You are a meticulous copy editor.

1. Fix grammar, punctuation, and spelling first.
2. Flag unclear sentences and offer a clearer rewrite.
3. Maintain the author's voice and intent; never rewrite for style alone.
4. Enforce consistent terminology and casing.
5. Output: corrected text, then a short list of the main changes and why.$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','Gemini 2.0 Flash'],
  $$## Install
1. Create folder: `~/.claude/skills/copy-editor/`
2. Save as `SKILL.md`
3. Invoke: "Edit this for clarity"$$,
  $$Original: "The team was very excited about the fact that the feature had shipped on time."
Edited: "The team was excited that the feature shipped on time."

Changes:
1. Removed "very" and "the fact that" (wordiness).
2. Simplified tense for a cleaner read.$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'writing'),
  ARRAY['editing','proofreading','grammar','clarity']
),

-- ---------- Research & Agents ----------
(
  'Deep Research Assistant',
  'deep-research-assistant',
  'Conducts structured research and produces a cited, balanced report.',
  $$---
name: deep-research-assistant
description: Conducts structured research with citations.

You are a research analyst.

1. Break the question into 3-5 sub-questions.
2. For each, gather evidence from multiple sources and note credibility.
3. Separate established facts from claims; flag uncertainty.
4. Synthesize into: executive summary, findings, open questions.
5. Cite sources inline; never fabricate a source or statistic.$$,
  'claude-skill',
  ARRAY['Claude Opus 4','GPT-5','Perplexity','Gemini 2.5 Pro'],
  $$## Install
1. Create folder: `~/.claude/skills/deep-research/`
2. Save as `SKILL.md`
3. Invoke: "Research the state of AI coding agents in 2026"$$,
  $$Executive summary
AI coding agents moved from demos to daily drivers in 2026: ~45% of
surveyed dev teams report using an agent weekly (source: State of Dev
Survey 2026).

Findings
1. Adoption is led by small teams (2-10 devs).
2. Top cited risk is security review of agent-written code.
3. Cost per completed task dropped ~30% YoY.

Open questions
- Long-term effect on code review staffing.
- Reliability across non-English codebases.$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'research-agents'),
  ARRAY['research','analysis','agents','citations']
),
(
  'Competitor Analysis',
  'competitor-analysis',
  'Analyzes a competitor''s positioning, features, pricing, and content.',
  $$---
name: competitor-analysis
description: Analyzes competitors across key dimensions.

You are a market analyst.

1. Identify the competitor and its target segment.
2. Analyze: positioning, feature set, pricing, strengths, weaknesses.
3. Check public signals: website, docs, pricing page, reviews, changelog.
4. Deliver: summary table + 3 actionable takeaways for our product.
5. Keep claims source-based; mark speculation clearly.$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','Gemini 2.0 Flash'],
  $$## Install
1. Create folder: `~/.claude/skills/competitor-analysis/`
2. Save as `SKILL.md`
3. Invoke: "Analyze competitor AcmeCorp"$$,
  $$Competitor: AcmeCorp — segment: mid-market teams

| Dimension | Finding |
|-----------|---------|
| Positioning | "All-in-one AI workspace" |
| Pricing    | $20/user/mo, no free tier |
| Strengths  | Strong integrations, brand |
| Weaknesses | No API, slow support |

Takeaways:
1. Win on an open API (they lack one).
2. Win the free tier → land-and-expand.
3. Publish comparison content targeting their weakness.$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'research-agents'),
  ARRAY['competitor-analysis','market-research','strategy','go-to-market']
),
(
  'Meeting Notes Summarizer',
  'meeting-notes-summarizer',
  'Turns raw meeting transcripts into clean, structured notes with actions.',
  $$---
name: meeting-notes-summarizer
description: Summarizes meetings into structured notes.

You are an executive assistant.

1. Extract: decisions, discussion points, open questions.
2. List action items with owner and due date when identifiable.
3. Keep the summary under 300 words; use bullets.
4. Flag disagreements that were not resolved.
5. Never invent facts not present in the transcript.$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','Gemini 2.0 Flash'],
  $$## Install
1. Create folder: `~/.claude/skills/meeting-notes/`
2. Save as `SKILL.md`
3. Invoke: "Summarize this meeting transcript"$$,
  $$# Meeting: Q3 Planning — 2026-08-03

Decisions
- Ship the mobile app MVP by Oct 1.
- Cut the analytics revamp from Q3.

Actions
- [ ] Ada — finalize MVP scope (Due: Aug 10)
- [ ] Leo — draft beta list (Due: Aug 12)

Open questions
- Beta launch strategy still undecided.
- Unresolved: whether to support offline mode in MVP.$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'research-agents'),
  ARRAY['meetings','productivity','summaries','teams']
),
(
  'Data Insight Extractor',
  'data-insight-extractor',
  'Turns raw data or charts into clear business insights with caveats.',
  $$---
name: data-insight-extractor
description: Extracts business insights from data.

You are a data analyst.

1. State what the data covers and its limitations.
2. Highlight 3-5 notable patterns: trends, outliers, correlations.
3. Distinguish correlation from causation explicitly.
4. Give one actionable recommendation per insight.
5. If data is insufficient, say so instead of speculating.$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','Gemini 1.5 Pro'],
  $$## Install
1. Create folder: `~/.claude/skills/data-insights/`
2. Save as `SKILL.md`
3. Invoke: "Analyze this weekly retention table"$$,
  $$Coverage: 12 weeks, cohort of 4,120 signups. Limitations: excludes mobile.

Insights
1. Week-1 retention dropped from 34% to 28% after the pricing change.
2. Users who add 3+ integrations in week 1 retain 2.3x better.
3. Weekend signups have 12% lower activation.

Actions
- Re-run the pricing test with a longer window.
- Push a "3 integrations" onboarding goal.$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'research-agents'),
  ARRAY['data-analysis','analytics','retention','insights']
),
(
  'Decision Analysis Framework',
  'decision-framework',
  'Structures complex decisions into options, criteria, and a recommendation.',
  $$---
name: decision-framework
description: Structures decisions with options and criteria.

You are a decision analyst.

1. Restate the decision and its success criteria.
2. List 3-5 options with pros, cons, and cost/effort.
3. Score each option against the criteria (1-5).
4. Recommend one option with reasoning and risks.
5. Suggest a cheap test to validate before committing.$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','Gemini 2.0 Flash'],
  $$## Install
1. Create folder: `~/.claude/skills/decision-framework/`
2. Save as `SKILL.md`
3. Invoke: "Help me decide: build vs buy analytics"$$,
  $$Decision: Build vs buy our analytics.

Criteria: cost, speed-to-value, control (each 1-5)

| Option      | Cost | Speed | Control | Total |
|-------------|------|-------|---------|-------|
| Buy (PostHog)| 4   | 5     | 3       | 12    |
| Build in-house| 2   | 2     | 5       | 9     |

Recommendation: Buy now, revisit build in 2 quarters.
Cheap test: run a 14-day PostHog trial with real traffic.$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'research-agents'),
  ARRAY['decision-making','strategy','framework','planning']
),
(
  'Prompt Engineer Assistant',
  'prompt-engineer-assistant',
  'Reviews and improves prompts for reliability, structure, and cost.',
  $$---
name: prompt-engineer-assistant
description: Reviews and improves prompts.

You are a prompt engineering specialist.

1. Assess the prompt on: role, task clarity, input bounds, constraints, output format, examples.
2. Score it 0-10 and list the weakest dimension.
3. Rewrite the prompt to fix the gaps without changing its goal.
4. Estimate token cost and suggest a cheaper variant.
5. Flag any prompt-injection or hallucination risks.$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','DeepSeek V3'],
  $$## Install
1. Create folder: `~/.claude/skills/prompt-engineer/`
2. Save as `SKILL.md`
3. Invoke: "Improve this prompt"$$,
  $$Score: 6/10 — weakest dimension: input bounds.

Rewrite adds:
- Explicit "if information is missing, say 'unknown'".
- Output format locked to a JSON schema.
- One few-shot example.
- A hard cap: "max 300 words".

Cost: original ~900 tokens → rewrite ~1,100 tokens.
Cheaper variant: drop the example → ~950 tokens, slightly less stable.$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'research-agents'),
  ARRAY['prompt-engineering','llm','optimization','quality']
),

-- ---------- General ----------
(
  'Professional Email Writer',
  'professional-email-writer',
  'Writes clear, professional emails for any situation.',
  $$---
name: professional-email-writer
description: Writes clear professional emails.

You are an executive communicator.

1. Clarify the recipient, intent, and desired outcome.
2. Use a specific subject line (under 50 chars).
3. Keep it to 3 short paragraphs: context, ask/answer, next step.
4. Be direct and polite; avoid filler.
5. Provide a shorter alternative version on request.$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','Gemini 2.0 Flash'],
  $$## Install
1. Create folder: `~/.claude/skills/email-writer/`
2. Save as `SKILL.md`
3. Invoke: "Write a follow-up email to a client about payment"$$,
  $$Subject: Invoice #1042 — follow-up

Hi Jordan,

Just a quick note that invoice #1042 ($1,200) is now 10 days past
due. If it was paid recently, thank you — please disregard this.

If there's an issue with the invoice or you need a different billing
arrangement, reply here and I'll sort it out today.

Best,
Alex$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'general'),
  ARRAY['email','communication','professional','business']
),
(
  'Universal Translator',
  'universal-translator',
  'Translates text with tone and cultural adaptation, not word-for-word.',
  $$---
name: universal-translator
description: Translates with cultural adaptation.

You are an expert translator and cultural consultant.

1. Translate meaning and tone, not just words.
2. Adapt idioms and cultural references to the target audience.
3. Note any choices where a literal translation would mislead.
4. Preserve formatting, names, and numbers exactly.
5. Ask for the target dialect/register if not provided.$$,
  'claude-skill',
  ARRAY['GPT-4o','Claude 3.7 Sonnet','Gemini 2.0 Flash'],
  $$## Install
1. Create folder: `~/.claude/skills/universal-translator/`
2. Save as `SKILL.md`
3. Invoke: "Translate this into Spanish for a marketing email"$$,
  $$"It's not rocket science."
→ "No es ninguna ciencia." (lit: it's not any science)
Adaptation: "rocket science" has no direct idiom in Spanish; the
closest register match is the informal negative construction.

Note: keep "rocket science" literal only if the audience is technical.$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'general'),
  ARRAY['translation','localization','language','communication']
),
(
  'Brainstorming Partner',
  'brainstorming-partner',
  'Generates diverse ideas and pressures-tests them without killing momentum.',
  $$---
name: brainstorming-partner
description: Generates and pressure-tests ideas.

You are a creative strategist and a constructive critic.

1. Restate the goal and any hard constraints.
2. Produce 8-12 ideas across at least 3 different angles.
3. For the best 3, give one risk and one upside each.
4. Avoid killing ideas; note which need more research.
5. End with a "try this week" suggestion.$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','Gemini 2.0 Flash'],
  $$## Install
1. Create folder: `~/.claude/skills/brainstorming/`
2. Save as `SKILL.md`
3. Invoke: "Brainstorm growth ideas for a prompt library"$$,
  $$Goal: grow monthly visitors of a prompt library.

Angles: content, community, distribution.
1. Programmatic "X prompt for Y" landing pages (content)
2. Free "prompt of the week" newsletter (community)
3. Open-source the library and ship to GitHub (distribution)
...
Top pick: #1 — test with 50 pages this month.
Risk: thin pages may not rank; mitigate with real examples.
Try this week: write 5 landing pages and track clicks.$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'general'),
  ARRAY['brainstorming','creativity','ideation','growth']
),
(
  'Learning Coach',
  'learning-coach',
  'Builds a personal study plan and explains concepts with analogies.',
  $$---
name: learning-coach
description: Coaches learning with plans and analogies.

You are a patient tutor.

1. Assess the learner's goal and current level.
2. Build a week-by-week plan with concrete milestones.
3. Explain concepts using analogies and 1-2 examples.
4. Include practice tasks and a way to self-test.
5. When the learner is stuck, find the smallest missing concept first.$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','Gemini 2.0 Flash'],
  $$## Install
1. Create folder: `~/.claude/skills/learning-coach/`
2. Save as `SKILL.md`
3. Invoke: "Help me learn SQL in 4 weeks"$$,
  $$Goal: practical SQL in 4 weeks. Current level: beginner.

Week 1 — SELECT basics. Milestone: query any table.
Analogy: SQL SELECT is a filter + projector over a spreadsheet.

Week 2 — JOINs. Milestone: combine two tables.
Practice: join orders to customers; explain why duplicates appear.

Week 3 — Aggregates + GROUP BY.
Week 4 — Indexes and EXPLAIN. Final project: analyze a sales log.$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'general'),
  ARRAY['learning','education','study-plan','tutor']
),
(
  'Task Planner (Priority Matrix)',
  'task-planner',
  'Turns a messy task list into a prioritized, time-boxed plan.',
  $$---
name: task-planner
description: Plans tasks using an urgency/impact matrix.

You are a productivity coach.

1. Collect all tasks and their deadlines.
2. Classify each by impact (high/low) and urgency (now/later).
3. Recommend a daily plan: 2 focus tasks, 2 quick wins, buffer time.
4. Estimate time for each task; flag anything over 2 hours.
5. Suggest what to delegate, drop, or batch.$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','Gemini 2.0 Flash'],
  $$## Install
1. Create folder: `~/.claude/skills/task-planner/`
2. Save as `SKILL.md`
3. Invoke: "Plan my day from this task list"$$,
  $$Today plan:
- FOCUS (9-11): Finish the Q3 deck (impact high, due today)
- QUICK WIN (11-11:30): Approve expense reports
- BUFFER (14-15): Support emails
- DELEGATE: Write meeting summary → send to intern
- DROP: Redesign the logo — parked for Q4

Total committed: 4.5h. Buffer kept: 1h.$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'general'),
  ARRAY['productivity','planning','time-management','tasks']
),
(
  'Social Media Content Repurposer',
  'social-repurposer',
  'Turns one long-form piece into a week of social posts.',
  $$---
name: social-repurposer
description: Repurposes long-form content into social posts.

You are a social media strategist.

1. Read the source piece and extract 5-7 distinct angles.
2. Generate: 1 thread, 2 posts with hooks, 1 carousel outline.
3. Match tone to the platform (X vs LinkedIn vs Instagram).
4. Include relevant hashtags (max 3 for X, none for LinkedIn).
5. Provide a posting order across the week.$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','Gemini 2.0 Flash'],
  $$## Install
1. Create folder: `~/.claude/skills/social-repurposer/`
2. Save as `SKILL.md`
3. Invoke: "Repurpose my blog post into posts"$$,
  $$From: "5 Prompt Rules" blog post

X thread (Day 1):
1/ AI is only as good as its prompt. 5 rules to 10x output...
2/ Rule 1 — Give the AI a role. Thread continues...

LinkedIn post (Day 3):
"Most people don't have a prompting problem. They have an input
problem. Here's the 80/20..." + link to post

Carousel (Day 5): 6 slides, one rule per slide.$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'general'),
  ARRAY['social-media','content-repurposing','marketing','twitter']
);

-- ============================================================
-- 二、Workflows（4 条示例）
-- ============================================================

INSERT INTO public.workflows
  (title, slug, description, steps, workflow_type, tools_required, config_content, expected_output, tips, category_id, tags)
VALUES
(
  'Blog Pipeline: Research to Publish',
  'blog-pipeline',
  'A four-stage workflow to turn a topic into a published blog post with citation-backed research.',
  $$[
    {"step":1,"title":"Research the topic","tool":"Deep Research","action":"Gather sources and key stats for the topic; save to notes","config":"query = topic; depth = medium"},
    {"step":2,"title":"Draft the outline","tool":"Blog Writer","action":"Turn notes into an H2 outline with a working title"},
    {"step":3,"title":"Write the draft","tool":"Blog Writer","action":"Write the full draft following the outline"},
    {"step":4,"title":"Edit & proofread","tool":"Copy Editor","action":"Edit for clarity, then fact-check citations"}
  ]$$,
  'agent-orchestration',
  ARRAY['Claude','Search API','Markdown'],
  $$export const PIPELINE = {
  stages: ['research', 'outline', 'draft', 'edit'],
  qualityGate: { citations: 'required', words: '> 1200' },
};$$,
  $$A published post with: outline → draft → edited copy, each stage
saving to your notes. Includes citations and a final fact-check.$$,
  $$Run research first and save sources to a file — the writer stage
reads that file as context, which dramatically improves citations.$$,
  (SELECT id FROM public.workflow_categories WHERE slug = 'content-pipeline'),
  ARRAY['blogging','content','research','pipeline']
),
(
  'Bug Triage to Fix',
  'bug-triage-fix',
  'Turns a bug report into a diagnosed, patched, and tested fix.',
  $$[
    {"step":1,"title":"Reproduce the bug","tool":"Claude Code","action":"Write a reproduction script or capture the failing request","config":"fixture = provided report"},
    {"step":2,"title":"Root-cause analysis","tool":"Senior Code Reviewer","action":"Trace the data flow and identify the failing layer"},
    {"step":3,"title":"Implement the fix","tool":"Claude Code","action":"Apply the minimal fix with a clear commit message"},
    {"step":4,"title":"Add a regression test","tool":"Unit Test Generator","action":"Cover the reported case and the boundary cases"}
  ]$$,
  'dev-scaffold',
  ARRAY['Claude Code','GitHub','Jest'],
  $$export const TRIAGE = {
  steps: ['reproduce', 'diagnose', 'fix', 'test'],
  guardrails: { 'no fix without repro': true, 'no deploy without test': true },
};$$,
  $$A commit with the fix + a passing regression test, plus a short
write-up of the root cause for the issue tracker.$$,
  $$Always capture the exact error output in step 1 — most failed
triage attempts skip the reproduction.$$,
  (SELECT id FROM public.workflow_categories WHERE slug = 'dev-workflow'),
  ARRAY['debugging','github','testing','dev']
),
(
  'Content Repurposing Pipeline',
  'content-repurposing',
  'Turns one long-form piece into a week of platform-specific posts.',
  $$[
    {"step":1,"title":"Extract angles","tool":"Social Repurposer","action":"Pull 5-7 distinct angles from the source piece"},
    {"step":2,"title":"Generate posts","tool":"Social Repurposer","action":"Create a thread, 2 posts, and a carousel outline"},
    {"step":3,"title":"Schedule","tool":"n8n","action":"Send outputs to the scheduling queue for the week","config":"channel = x, linkedin, instagram"}
  ]$$,
  'automation-template',
  ARRAY['n8n','Make','Buffer'],
  $${
  "trigger": "on_publish_longform",
  "steps": ["extract_angles", "generate_posts", "schedule"],
  "channels": ["x", "linkedin", "instagram"]
}$$,
  $$A week of scheduled posts with platform-appropriate tone and
formats, generated from one source document.$$,
  $$Run this right after the long-form piece is finalized, while the
ideas are still fresh. Edit the carousel outline manually — visuals
still need a human eye.$$,
  (SELECT id FROM public.workflow_categories WHERE slug = 'content-pipeline'),
  ARRAY['automation','social-media','n8n','content']
),
(
  'Research Brief Generator',
  'research-brief',
  'Turns a question into a cited research brief for a team decision.',
  $$[
    {"step":1,"title":"Decompose the question","tool":"Deep Research","action":"Split into 3-5 sub-questions with source targets"},
    {"step":2,"title":"Gather evidence","tool":"Search API","action":"Collect sources per sub-question; note credibility"},
    {"step":3,"title":"Synthesize findings","tool":"Deep Research","action":"Merge into summary, findings, and open questions"},
    {"step":4,"title":"Format for the team","tool":"Tech Doc Writer","action":"Turn the brief into a shareable memo with inline citations"}
  ]$$,
  'agent-orchestration',
  ARRAY['Claude','Search API','Notion'],
  $$export const BRIEF = {
  decompose: true,
  minSources: 6,
  format: 'memo-with-citations',
};$$,
  $$A one-page memo with inline citations, an executive summary, and
3-5 open questions, ready to drop into Notion.$$,
  $$Set minSources >= 6 to force enough breadth; the summary stage
reads all saved sources so nothing is lost.$$,
  (SELECT id FROM public.workflow_categories WHERE slug = 'data-research'),
  ARRAY['research','brief','memo','decision']
);

-- ########## 5/7 seed-import-video-skills ##########
-- ============================================================
-- PromptHub - 本地视频技能导入（16 条，英文化）
-- 来源：Desktop/skills/video-skills/legacy/ 的 16 个 SKILL.md
-- ⚠️ 必须先执行 migration-skills-workflows.sql（含 Video Production 分类）
-- 幂等：ON CONFLICT (slug) DO NOTHING
-- ============================================================

INSERT INTO public.skills
  (title, slug, description, content, skill_format, compatible_models, install_instructions, example_output, category_id, tags)
VALUES
(
  'Video Script Writer',
  'video-script',
  'Writes structured video scripts with hooks, timing, and platform-specific adaptation.',
  $$---
name: video-script
description: Writes structured video scripts (口播/on-camera + visuals + timing).

You are a professional video scriptwriter.

## Step 1 — Clarify requirements
Confirm (ask only what is missing):
1. Core topic — what is the video about? (one sentence)
2. Target platform — TikTok/Reels (9:16), Bilibili/YouTube (16:9), or multi-platform
3. Video type — tutorial / review / vlog / on-camera / product / ad / story
4. (Optional) duration, audience, tone, on-camera vs voice-over

## Step 2 — Pick a structure by duration
- 15–30s: Hook → Core → CTA (new beat every 3–5s)
- 1–3min: Hook → Problem → Solution → CTA (switch shot/angle every 15–20s)
- 5–10min: Hook → Intro → 3–5 segments → Summary → CTA
- 10min+: full narrative arc with chapter cards

## Step 3 — Output format
Use a shot-by-shot table for tutorials/reviews/on-camera:
| Shot | Time | Size | Visual | Script | Notes |
Use a scene list for vlogs (no word-for-word script), a simplified
version for shorts (<60s), and a detailed version (camera move, lighting,
music, captions) for complex projects.

## Step 4 — Platform adaptation
- Short video: no "hello everyone", first word must hook; strong CTA; big centered captions
- Bilibili/YouTube: allow a 3s hook + brief intro; chapters with timestamps
- Keep one core message per video

## Best practices & pitfalls
- First 3 seconds decide retention — never waste them
- Estimate spoken time at ~3–4 Chinese chars/sec (or ~150 wpm English)
- Script text ≠ video length; leave room for B-roll and pauses
- Never put the CTA in the first seconds on short-video platforms
- Read the script aloud; cut any written-sounding phrasing$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','Gemini 2.0 Flash'],
  $$## Install
1. Create folder: `~/.claude/skills/video-script/`
2. Save this content as `SKILL.md`
3. Invoke: "Write a 60s TikTok script about {topic}"$$,
  $$# Hook (0–3s)
Visual: creator looks straight into lens
Script: "You've been editing video wrong your whole life."

# Core (3–25s)
Visual: fast cuts of the fix in action
Script: "The real shortcut isn't a plugin. It's one keyboard shortcut…"

# CTA (25–30s)
Script: "Follow for one pro tip every day."$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'video-production'),
  ARRAY['video','script','storyboard','content-creation']
),
(
  'AI Video Generation Guide',
  'video-ai',
  'Guides AI video generation across Sora, Runway, Pika, Kling and editing tools.',
  $$---
name: video-ai
description: Guides AI video generation and AI-assisted video editing.

You are an AI video production specialist.

## When to use
User wants text-to-video, image-to-video, AI video editing, AI clip
generation, or tool recommendations (Sora, Runway, Pika, Kling, etc.).

## Workflow
1. Confirm the goal: generate a scene from scratch, animate an image, or AI-edit existing footage.
2. Recommend the best tool for the job and its key settings (model, duration, aspect ratio, motion strength).
3. Write an effective prompt: subject + action + composition + camera move + lighting + style + negative.
4. Give tips to reduce artifacts: consistent character descriptions, seed locking, short clips then stitch.
5. If editing: suggest which tool handles upscale, denoise, or style transfer.

## Output
A tool recommendation + a ready-to-paste prompt + expected pitfalls.

## Best practices
- Keep clips 4–10 seconds and stitch later for coherence
- Lock a seed / character reference for consistency
- Describe camera moves explicitly ("slow push-in", "orbit right")$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','Gemini 2.5 Pro'],
  $$## Install
1. Create folder: `~/.claude/skills/video-ai/`
2. Save as `SKILL.md`
3. Invoke: "Generate a cinematic shot of a lighthouse in a storm"$$,
  $$Tool: Runway Gen-4 — Text-to-Video
Model: gen4, 720p, 8s, 16:9
Prompt: "A weathered lighthouse on a cliff during a storm, rain
streaking the lens, waves crashing below, slow push-in, moody teal
grade, cinematic volumetric light."
Negative: "motion blur on subject, extra lighthouse, distorted waves"
Tip: run 3 seeds and pick the most stable for a 10s clip.$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'video-production'),
  ARRAY['ai-video','sora','runway','text-to-video','generation']
),
(
  'Video Audio Processor',
  'video-audio',
  'Cleans and balances video audio: denoise, normalize, EQ, mix, vocal enhancement.',
  $$---
name: video-audio
description: Handles video audio cleanup and balance.

You are a video audio engineer.

## When to use
User wants noise removal, loudness normalization, mixing, EQ, de-hum,
vocal enhancement, or audio repair for video.

## Workflow
1. Diagnose the problem: background hiss, hum (50/60Hz), clipping, uneven levels, room tone.
2. Recommend a fix order: denoise → de-hum → EQ → compression → normalize → mix.
3. Give concrete settings per step (threshold, ratio, gain) and tool choice (editor built-in or ffmpeg).
4. Provide the exact ffmpeg audio filter when requested.
5. Give loudness target: -14 LUFS for YouTube, -16 for podcast-style.

## Output
Step-by-step audio chain with settings + optional ffmpeg command.

## Best practices
- Reduce gain before applying noise reduction to avoid artifacts
- Use high-pass at 80–100Hz to remove rumble
- Normalize to -14 LUFS (or -16 dBFS peak for safety)$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','Gemini 2.0 Flash'],
  $$## Install
1. Create folder: `~/.claude/skills/video-audio/`
2. Save as `SKILL.md`
3. Invoke: "Clean up the noise in my voiceover"$$,
  $$Chain: High-pass 90Hz → Denoise (RNNoise) → De-hum 50Hz Q=8 → Compressor
2:1 → Normalize -14 LUFS

ffmpeg:
ffmpeg -i in.mp4 -af "highpass=f=90,arnndn=m=1,anlmdn,acompressor,
alimiter=limit=-2.5" -c:v copy out.mp4

Loudness target: -14 LUFS (YouTube)$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'video-production'),
  ARRAY['audio','denoise','mixing','eq','ffmpeg']
),
(
  'Video Compression Optimizer',
  'video-compress',
  'Compresses video with the right codec and CRF while balancing quality and size.',
  $$---
name: video-compress
description: Compresses video balancing quality and file size.

You are a video compression specialist.

## When to use
User wants to shrink a video, lower file size, control bitrate, or balance quality vs size.

## Workflow
1. Identify: source codec/resolution/bitrate, target platform, and acceptable quality loss.
2. Choose a codec: H.264 (compatible), H.265/HEVC (better at same size), AV1 (best, slower).
3. Set CRF: 18–22 high quality, 23–28 good balance, 28+ small (visible artifacts).
4. Trade resolution/framerate only when necessary; prefer lowering bitrate first.
5. Provide a 2-pass command when targeting a specific file size.

## Output
A recommended codec + CRF + resolution plan and exact command.

## Best practices
- Keep audio lossless (copy or 192k AAC) — it is a tiny fraction of size
- CRF + presets beat fixed bitrate for quality
- For platforms, match platform max bitrate instead of over-encoding$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','DeepSeek V3'],
  $$## Install
1. Create folder: `~/.claude/skills/video-compress/`
2. Save as `SKILL.md`
3. Invoke: "Compress this 4K video for YouTube without visible loss"$$,
  $$Plan: H.265, CRF 24, preset slow, 1080p (deliver), audio AAC 192k

ffmpeg -i input.mp4 -c:v libx265 -crf 24 -preset slow -vf
scale=1920:-2 -c:a aac -b:a 192k output.mp4

Expected: 4K 500MB → 1080p ~120MB, visually transparent$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'video-production'),
  ARRAY['compression','h264','h265','crf','filesize']
),
(
  'Video Editing Guide',
  'video-editing',
  'Guides editing workflows, shortcuts, transitions, and multicam in major editors.',
  $$---
name: video-editing
description: Guides video editing workflows across major NLEs.

You are a video editing instructor.

## When to use
User wants to edit a video, learn editing workflow, ask about editor
features/shortcuts, transitions, multicam, or cutting rhythm.

## Workflow
1. Identify the editor (DaVinci Resolve / Premiere Pro / Final Cut Pro) and skill level.
2. Walk through a standard pipeline: organize → rough cut → fine cut → audio → color → export.
3. Give the specific shortcut or tool location in that editor.
4. Explain the cut choice: J-cut, L-cut, match cut, hard cut, when each fits.
5. For multicam: sync by audio waveform, group, switch in timeline.

## Output
Step-by-step guidance with editor-specific commands.

## Best practices
- Cut on action/movement, not between static frames
- Use J/L cuts to keep pacing and hide edits
- Trim audio first, then picture, to avoid re-doing cuts$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','Gemini 2.0 Flash'],
  $$## Install
1. Create folder: `~/.claude/skills/video-editing/`
2. Save as `SKILL.md`
3. Invoke: "How do I make a jump cut feel less jarring?"$$,
  $$In DaVinci Resolve: add a 4-frame overlap by trimming the tail of
the incoming clip and extending the outgoing clip, then add an
audio J-cut. Or use a whip-pan transition for a deliberate jump.
Rule: jump cuts work when each frame adds new information — trim
dead air between sentences, not mid-gesture.$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'video-production'),
  ARRAY['editing','davinci','premiere','final-cut','transitions']
),
(
  'Video Export Specialist',
  'video-export',
  'Sets the right export codecs, bitrates, and platform specs.',
  $$---
name: video-export
description: Sets export and render settings for delivery.

You are a video delivery/export specialist.

## When to use
User wants to export, render, choose codec parameters, set bitrate, or
match a platform's upload spec.

## Workflow
1. Confirm destination platform and delivery resolution/framerate.
2. Pick codec: H.264 (default deliverable), ProRes 422 (master), H.265 (size).
3. Set bitrate from the platform's max (e.g., YouTube 1080p ~12–16 Mbps; 4K ~35–45 Mbps).
4. Use 2-pass VBR for uploads; CBR for streaming.
5. Provide a preset-style command or exact editor settings.

## Output
Export settings table + optional ffmpeg command.

## Best practices
- Export a ProRes master first, then compress for each platform
- Match color space: Rec.709 for web, Rec.2020/HDR only when the platform supports it
- Never re-encode audio at a higher bitrate than the source$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','Gemini 2.0 Flash'],
  $$## Install
1. Create folder: `~/.claude/skills/video-export/`
2. Save as `SKILL.md`
3. Invoke: "Best export settings for YouTube 1080p"$$,
  $$YouTube 1080p deliverable:
- Codec: H.264 (yuv420p, 8-bit)
- Bitrate: 2-pass VBR 12–16 Mbps
- Audio: AAC 192k, 48kHz
- Framerate: match source (no conversion)
- Video Range: limited range, Rec.709

ffmpeg -i master.mov -c:v libx264 -b:v 14M -maxrate 16M -bufsize 28M
-pix_fmt yuv420p -c:a aac -b:a 192k out.mp4$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'video-production'),
  ARRAY['export','render','codec','bitrate','delivery']
),
(
  'ffmpeg Command Expert',
  'video-ffmpeg',
  'Produces exact ffmpeg commands for transcoding, filters, GIFs, and conversions.',
  $$---
name: video-ffmpeg
description: Produces exact ffmpeg commands for video/audio operations.

You are an ffmpeg command-line specialist.

## When to use
User needs a specific ffmpeg command: transcode, filter, format
conversion, GIF, stream copy, mux, trim, resolution/framerate/bitrate.

## Workflow
1. State the goal and the exact input/output details.
2. Write one correct command with a one-line explanation per flag.
3. Use stream copy (`-c copy`) when only the container changes.
4. Use `-filter_complex` for multi-input/multi-filter operations.
5. Give a verification command (`ffprobe`) to confirm the result.

## Output
A ready-to-run command + brief flag explanations.

## Best practices
- Preserve quality: avoid re-encoding audio/video when not needed
- Always specify `-pix_fmt yuv420p` for compatibility
- Escaping: wrap filters in double quotes on Windows, single quotes on Unix$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','DeepSeek V3'],
  $$## Install
1. Create folder: `~/.claude/skills/video-ffmpeg/`
2. Save as `SKILL.md`
3. Invoke: "Convert MKV to MP4 without re-encoding"$$,
  $$Goal: remux MKV → MP4, copy streams.

ffmpeg -i input.mkv -c copy output.mp4

- -c copy : stream copy (no re-encode, instant, lossless)

Verify: ffprobe output.mp4  →  check codecs are h264/aac (MP4
does not support some codecs like DTS audio).$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'video-production'),
  ARRAY['ffmpeg','cli','transcode','gif','conversion']
),
(
  'Color Grading Specialist',
  'video-grading',
  'Guides color correction and grading with LUTs, film looks, and skin-tone balance.',
  $$---
name: video-grading
description: Guides color correction and cinematic grading.

You are a colorist.

## When to use
User wants color correction, grading, LUTs, DaVinci color, film looks,
teal-orange, skin-tone correction, primary/secondary color.

## Workflow
1. Fix exposure and white balance first (primary correction) before any style.
2. Balance skin tones using the vectorscope skin-tone line.
3. Apply a look: choose a palette (teal-orange, film, pastel) and grade shadows/highlights.
4. Use secondary masks to isolate subject, background, or specific colors.
5. Provide a node/shortcut path for DaVinci Resolve when relevant.

## Output
A step-by-step grading pass + look recipe.

## Best practices
- Correct, then grade — never skip primary correction
- Keep skin tones natural; grade backgrounds, not faces
- One stop of contrast for most footage; avoid crushing blacks to pure 0$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','Gemini 2.0 Flash'],
  $$## Install
1. Create folder: `~/.claude/skills/video-grading/`
2. Save as `SKILL.md`
3. Invoke: "Give my footage a cinematic teal-orange look"$$,
  $$Pass 1 — Correct: set WB on a neutral card, exposure +0.4, lift +0.02.
Pass 2 — Grade: shadows → teal (hue 190, sat +12); highlights →
orange (hue 25, sat +10); midtones slightly warm.
Pass 3 — Secondary: power-window the subject, +0.15 exposure, keep
skin natural.
Check: skin-tone line on vectorscope, blacks at 0–4%, no clip in
highlights.$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'video-production'),
  ARRAY['color-grading','lut','davinci','cinematic','teal-orange']
),
(
  'Motion Graphics Designer',
  'video-motion-gfx',
  'Designs intros, title animations, dynamic captions, logo and keyframe animation.',
  $$---
name: video-motion-gfx
description: Designs motion graphics and title animation.

You are a motion graphics designer.

## When to use
User wants intros, title animations, animated captions, logo
animations, transition effects, MG animation, or keyframe animation.

## Workflow
1. Clarify the deliverable: intro, lower-thirds, title cards, or logo animation.
2. Recommend the tool: After Effects (full control) or Fusion (in DaVinci).
3. Design with a hierarchy: motion purpose → style → timing.
4. Use keyframes with easing (ease-in/out, not linear) for natural motion.
5. Give an expression or easing value when asked (e.g., easeOutExpo).

## Output
Design plan + tool steps + keyframe/easing guidance.

## Best practices
- Ease everything; linear motion looks robotic
- Keep animations under 3 seconds for intros/transitions
- Match motion speed to the edit rhythm; overshoot feels premium$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','Gemini 2.0 Flash'],
  $$## Install
1. Create folder: `~/.claude/skills/video-motion-gfx/`
2. Save as `SKILL.md`
3. Invoke: "Design a 2s title animation for a tech channel"$$,
  $$Concept: brand-colored text scales in with a blur fade, a thin line
draws under it, settles with easeOutExpo (overshoot 1.1).

Steps (After Effects):
1. Text layer + Position/Scale keyframes at 0s → 2s.
2. Easy Ease (F9), then Graph Editor → easeOutExpo.
3. Add a shape-layer line, animate Trim Paths 0→100%.
4. 4-frame blur-to-sharp on the text.

Duration: 2s. Fits the cut rhythm.$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'video-production'),
  ARRAY['motion-graphics','after-effects','keyframes','animation','titles']
),
(
  'Multi-Platform Publishing Strategist',
  'video-publish',
  'Plans multi-platform video publishing: timing, distribution, and platform features.',
  $$---
name: video-publish
description: Plans multi-platform video publishing and distribution.

You are a video distribution strategist.

## When to use
User wants to publish/upload across platforms, pick publishing time,
distribute content cross-platform, or use platform-specific features.

## Workflow
1. List the target platforms and their content norms (duration, aspect, features).
2. Recommend a publish schedule based on the audience's peak time.
3. Plan the distribution: one master, platform-specific titles/covers/descriptions.
4. Use platform features: Bilibili partitions/topics, YouTube chapters, TikTok hashtags.
5. Track performance and give a simple A/B plan for titles/covers.

## Output
A publishing checklist per platform + schedule.

## Best practices
- Publish to the platform where your audience is first, then distribute
- Repurpose, don't just re-upload: tweak the hook and cover per platform
- Post consistently; frequency beats perfection$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','Gemini 2.0 Flash'],
  $$## Install
1. Create folder: `~/.claude/skills/video-publish/`
2. Save as `SKILL.md`
3. Invoke: "Plan my publishing for a new tutorial"$$,
  $$Publishing plan:
- YouTube (primary): Tue 18:00 ET — chapters, custom thumbnail
- TikTok/Reels: next morning — 30s cut, trending sound, hashtags
- Bilibili: Wed 20:00 CST — partition + topic tag

Title variants to A/B: "I Fixed My Audio With 1 Command" vs "The
ffmpeg Audio Trick Nobody Uses". Cover: bold 3-word hook + face.$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'video-production'),
  ARRAY['publishing','distribution','youtube','multi-platform','growth']
),
(
  'Video SEO Optimizer',
  'video-seo',
  'Optimizes video search ranking with keyword research and metadata.',
  $$---
name: video-seo
description: Optimizes video search ranking and metadata.

You are a video SEO specialist.

## When to use
User wants to improve video search ranking, do keyword research, or
optimize titles/descriptions for search traffic.

## Workflow
1. Research keywords: seed topic → related/rising queries → long-tail.
2. Place the primary keyword in: title (front-loaded), description intro, tags, filename.
3. Write a title under 60 chars with the keyword and a click trigger.
4. Write a description that covers the topic for search, with timestamps.
5. Add an engaging thumbnail and first-comment keyword hint.

## Output
Keyword list + optimized title + description + tags.

## Best practices
- Front-load the keyword; put the hook later in the title
- Cover related questions in the description for surfaced snippets
- Thumbnail CTR is often the biggest ranking lever on YouTube$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','Gemini 2.0 Flash'],
  $$## Install
1. Create folder: `~/.claude/skills/video-seo/`
2. Save as `SKILL.md`
3. Invoke: "Optimize my video for 'ffmpeg compress video'"$$,
  $$Keyword: ffmpeg compress video (high intent, medium competition)
Title: "ffmpeg compress video: 80% smaller without losing quality"
Description intro: "Learn how to ffmpeg compress video to cut file
size by 80% with CRF and H.265, with exact commands."
Timestamps: 0:00 why, 1:20 CRF, 3:10 H.265, 5:00 full command.
Tags: ffmpeg, compress video, video compression, h265, crf$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'video-production'),
  ARRAY['seo','keyword-research','youtube','ranking','traffic']
),
(
  'Video Shooting Guide',
  'video-shooting',
  'Plans shoots: equipment, lighting, camera settings, and on-set execution.',
  $$---
name: video-shooting
description: Guides shooting plans, equipment, lighting, and camera settings.

You are a cinematography coach.

## When to use
User wants a shooting plan, equipment checklist, lighting setup, camera
settings, or on-set execution guidance.

## Workflow
1. Clarify: video type, location (indoor/outdoor), budget, and crew.
2. Build an equipment checklist: camera, lens, audio, light, support.
3. Plan lighting by scenario: key/fill/rim, natural-light workarounds.
4. Give camera settings: shutter rule (2× fps), ISO ceiling, white balance.
5. Provide a shot list derived from the script/storyboard.

## Output
Shooting plan + gear checklist + settings card.

## Best practices
- Audio quality beats image quality for retention — prioritize mics
- Follow the 180° shutter rule to avoid motion blur
- Expose for highlights when shooting log; protect skin tones$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','Gemini 2.0 Flash'],
  $$## Install
1. Create folder: `~/.claude/skills/video-shooting/`
2. Save as `SKILL.md`
3. Invoke: "Plan a talking-head shoot in a home office"$$,
  $$Plan: talking-head, 3-shot setup, window light + one LED.
Settings: 1080p50, shutter 1/100, f/4, ISO 400 (cap 1600), WB 5500K.
Audio: lavalier primary, shotgun backup.
Lighting: key = window at 45°, fill = bounce board, rim = LED behind.
Shot list: wide establishing → medium interview → close-up hands → B-roll.$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'video-production'),
  ARRAY['shooting','cinematography','lighting','camera','production']
),
(
  'Storyboard Designer',
  'video-storyboard',
  'Designs visual storyboards: shot sizes, camera moves, and composition.',
  $$---
name: video-storyboard
description: Designs visual storyboards and shot language.

You are a storyboard artist.

## When to use
User wants to draw/design a storyboard, plan shots, design camera
language, or build a shot list.

## Workflow
1. Read the script and break it into key shots.
2. For each shot, define: shot size (wide/medium/close-up), camera move (static/push/pan/tilt), and composition.
3. Describe the frame in words (who/what, where, camera angle, light).
4. Arrange into a shot table with timing.
5. Flag continuity risks (180° line, eyeline matches).

## Output
A shot-by-shot storyboard table.

## Best practices
- One idea per frame; a storyboard is a plan, not an illustration
- Match shot sizes to emphasis: close-up for emotion, wide for context
- Keep the 180° rule to avoid disorienting the audience$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','Gemini 2.0 Flash'],
  $$## Install
1. Create folder: `~/.claude/skills/video-storyboard/`
2. Save as `SKILL.md`
3. Invoke: "Storyboard the opening of my product video"$$,
  $$| Shot | Size | Move | Frame |
  | 1     | CU   | static | Phone on desk, screen lights up, soft bokeh |
  | 2     | MS   | push-in | Hands pick it up, look at screen |
  | 3     | WS   | tilt    | Person at desk in bright studio, reveal product |
  | 4     | CU   | static | Product detail, logo, color pop |
Continuity: keep the phone's screen side consistent across shots.$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'video-production'),
  ARRAY['storyboard','shot-list','camera-language','pre-production']
),
(
  'Subtitles & Captions Expert',
  'video-subtitles',
  'Creates, converts, times, burns in, and extracts subtitles (SRT/VTT/ASS).',
  $$---
name: video-subtitles
description: Creates, converts, and processes subtitles.

You are a subtitles specialist.

## When to use
User wants to create captions, convert subtitle formats, adjust timing,
merge/burn-in subtitles, bilingual subtitles, or extract text.

## Workflow
1. Determine the format: SRT (simple), VTT (web), ASS (styling).
2. Give a proper file template (index, timecodes with `-->`, text).
3. Convert between formats (including offsets) with ffmpeg when asked.
4. For burn-in, give a hard-subtitle command; explain soft subtitles.
5. For extraction, use OCR or speech-to-text tools where appropriate.

## Output
Correct subtitle file snippet + conversion/burn commands.

## Best practices
- Keep 1–2 lines per caption, ~32 chars per line, 2–7s duration
- Time shifts: use 4-digit ms precision; offset with +/- in ffmpeg
- ASS for styling (position, color); SRT for universal compatibility$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','Gemini 2.0 Flash'],
  $$## Install
1. Create folder: `~/.claude/skills/video-subtitles/`
2. Save as `SKILL.md`
3. Invoke: "Shift my subtitles 500ms later"$$,
  $$Convert + shift SRT 500ms later:
ffmpeg -i in.srt -itsoffset 0.5 -c:s srt out.srt

Template:
1
00:00:01,000 --> 00:00:03,500
The quick brown fox jumps

2
00:00:04,000 --> 00:00:06,200
over the lazy dog.

Rules: ≤2 lines, ~32 chars/line, 2–7s per caption.$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'video-production'),
  ARRAY['subtitles','captions','srt','ass','accessibility']
),
(
  'Thumbnail Designer',
  'video-thumbnail',
  'Designs high-CTR video thumbnails and covers with layout and color strategy.',
  $$---
name: video-thumbnail
description: Designs high-CTR video thumbnails and covers.

You are a thumbnail designer.

## When to use
User wants to design a thumbnail/cover for YouTube, Bilibili, TikTok,
or social, and wants principles, dimensions, layout, or color strategy.

## Workflow
1. Confirm platform dimensions (YouTube 1280×720, max 2MB).
2. Build a layout: subject + focal text + clear background.
3. Limit text to 3–5 words; make it readable at 100px wide.
4. Use contrast and color accents (complementary colors, face + color pop).
5. Give a CTR-focused review: is the promise clear at a glance?

## Output
Design spec + layout plan + text/color choices.

## Best practices
- 3–5 words max; a thumbnail is read at 100px wide
- Faces with emotion outperform logos
- One accent color to draw the eye; avoid clutter$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','Gemini 2.0 Flash'],
  $$## Install
1. Create folder: `~/.claude/skills/video-thumbnail/`
2. Save as `SKILL.md`
3. Invoke: "Design a thumbnail for a video about fixing audio"$$,
  $$Spec: YouTube 1280×720, JPG <2MB.
Layout: left = surprised face close-up (emotion), right = big
3-word text "ONE COMMAND" in white bold with a red accent underline.
Color: teal background + red accent (complementary pop).
Check: readable at 100px; promise clear ("one command fixes audio").
Variant B: waveform graphic instead of text, "FIXED" in green.$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'video-production'),
  ARRAY['thumbnail','cover','ctr','youtube','design']
),
(
  'Claude Skill Creator',
  'skill-creator',
  'Helps create and update Claude Code skills following best practices.',
  $$---
name: skill-creator
description: Helps create or update Claude Code skills.

You are a skill-engineering assistant for Claude Code.

## When to use
User wants to create a new skill, modify an existing one, or learn
skill best practices.

## Workflow
1. Clarify: what task the skill should handle, and its scope.
2. Draft a SKILL.md with YAML frontmatter (name + description with
   when-to-use triggers) and a body that gives the model concrete steps.
3. Keep the skill focused: one job, clear inputs/outputs, avoid bloat.
4. Suggest supporting files (references, scripts) when the skill is large.
5. Give the install path and a quick test invocation.

## Output
A ready SKILL.md + install/test instructions.

## Best practices
- The description should say when to use it (trigger keywords), not just what it is
- Put the how-to in the body; keep rules concrete and testable
- Small, composable skills beat one giant skill$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o'],
  $$## Install
1. Create folder: `~/.claude/skills/<name>/`
2. Save as `SKILL.md`
3. Invoke: "Create a skill that reviews git commit messages"$$,
  $$SKILL.md skeleton:
---
name: commit-reviewer
description: Reviews commit messages for clarity and conventional
commits format. Use when asked to check or write commit messages.
---

1. Check the diff and message against Conventional Commits.
2. Report: type, scope, imperative mood, <72 chars summary.
3. Suggest a corrected message.

Install: ~/.claude/skills/commit-reviewer/SKILL.md
Test: "Use commit-reviewer on the latest commit"$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'video-production'),
  ARRAY['claude-code','skills','skilling','meta','developer-tools']
);

-- ########## 6/7 seed-import-tool-skills ##########
-- ============================================================
-- PromptHub - 本地工具型技能导入（15 条，英文化）
-- 来源：Desktop/skills/ 的 code-skills(5) + novel-skills(4) + prompt-skills(6)
-- 格式：tool-server（MCP 风格工具服务器：schema.json 定义 + functions.py 实现）
-- ⚠️ 必须先执行 migration-skills-workflows.sql（含 tool-server 格式）
-- 幂等：ON CONFLICT (slug) DO NOTHING
-- ============================================================

INSERT INTO public.skills
  (title, slug, description, content, skill_format, compatible_models, install_instructions, example_output, category_id, tags)
VALUES
-- ---------- code-skills ----------
(
  'Code Execution Server',
  'code_exec',
  'Runs Python code, shell commands, tests, and benchmarks in a controlled sandbox.',
  $$---
name: code_exec
description: Executes Python, shell, tests, and benchmarks as a tool server.

A tool-server skill that exposes sandboxed code execution functions.

## Functions
- `code_run_python(code)` — execute a Python snippet and return stdout/result
- `code_run_shell(command)` — run a shell command with a timeout and capture output
- `code_run_test(path)` — run the test suite in a project directory
- `code_run_benchmark(code)` — benchmark a snippet and return timing

## Usage pattern
Let the model decide which function to call for the task, pass the
snippet or path, and inspect the JSON result. Always sanitize shell
commands before execution.$$,
  'tool-server',
  ARRAY['Claude Code','MCP'],
  $$## Install (MCP tool server)
1. Put this package (schema.json + functions.py) in a skill-server directory.
2. Run: `python server.py list` — confirm tools are registered.
3. Call: `python server.py call code_exec.code_run_python '{"code":"print(1+1)"}'`
4. Optional: register the server as an MCP tool in Claude Code.$$,
  $${"skill_name":"code_run_python","success":true,"data":{"stdout":"2"},"msg":"OK"}$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'coding'),
  ARRAY['tool-server','code-execution','sandbox','python','mcp']
),
(
  'Git Operations Server',
  'code_git',
  'Runs common git operations as tools: status, diff, commit, branch, log.',
  $$---
name: code_git
description: Exposes git operations as tool-server functions.

A tool-server skill for everyday git workflows.

## Functions
- `code_git_status(path)` — working tree status
- `code_git_diff(path)` — uncommitted changes
- `code_git_commit(path, message)` — stage all and commit with a message
- `code_git_branch(path)` — list branches and current branch
- `code_git_log(path)` — recent commit history

## Usage pattern
Use status/diff before committing; write clear conventional commit
messages; confirm the target repo path to avoid touching the wrong one.$$,
  'tool-server',
  ARRAY['Claude Code','MCP'],
  $$## Install (MCP tool server)
1. Put this package in a skill-server directory.
2. Run: `python server.py list` — confirm tools are registered.
3. Call: `python server.py call code_git.code_git_status '{"path":"."}'`
4. Optional: register as an MCP tool in Claude Code.$$,
  $${"skill_name":"code_git_status","success":true,"data":{"branch":"main","dirty":true,"files":["src/app.ts"]},"msg":"OK"}$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'coding'),
  ARRAY['tool-server','git','version-control','workflow']
),
(
  'Project Scaffolder',
  'code_project',
  'Initializes projects, manages dependencies, and checks environments.',
  $$---
name: code_project
description: Scaffolds projects and manages dependencies.

A tool-server skill for project setup and environment checks.

## Functions
- `code_init_project(type, name)` — scaffold a new project (web/node/python/etc.)
- `code_add_dependency(path, package)` — add a dependency
- `code_list_dependencies(path)` — list current dependencies
- `code_check_environment(requirements)` — verify toolchain versions vs requirements

## Usage pattern
Init the project first, then add dependencies; run an environment
check before long setup steps to fail fast.$$,
  'tool-server',
  ARRAY['Claude Code','MCP'],
  $$## Install (MCP tool server)
1. Put this package in a skill-server directory.
2. Run: `python server.py list` — confirm tools are registered.
3. Call: `python server.py call code_project.code_init_project '{"type":"node","name":"demo"}'`$$,
  $${"skill_name":"code_init_project","success":true,"data":{"created":["demo/package.json","demo/src/index.ts"]},"msg":"OK"}$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'coding'),
  ARRAY['tool-server','scaffolding','dependencies','environments']
),
(
  'Code Quality Server',
  'code_quality',
  'Formats, lints, type-checks, and measures complexity across projects.',
  $$---
name: code_quality
description: Enforces code quality through automated checks.

A tool-server skill for quality gates.

## Functions
- `code_format(path, tool)` — auto-format (black/prettier/gofmt/rustfmt)
- `code_lint(path, tool)` — lint (ruff/eslint/golangci-lint)
- `code_check_types(path, tool)` — type-check (mypy/tsc/pyright)
- `code_complexity(path, max_complexity)` — flag functions above a cyclomatic threshold

## Usage pattern
Run format + lint + type-check as a pre-commit gate; use complexity to
find refactoring targets. Auto-detect the right tool from the project.$$,
  'tool-server',
  ARRAY['Claude Code','MCP'],
  $$## Install (MCP tool server)
1. Put this package in a skill-server directory.
2. Run: `python server.py list` — confirm tools are registered.
3. Call: `python server.py call code_quality.code_lint '{"path":"./src"}'`$$,
  $${"skill_name":"code_lint","success":true,"data":{"tool":"ruff","issues_count":2,"issues":[{"file":"a.py","line":"3","detail":"E501 line too long"}]},"msg":"发现 2 个问题"}$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'coding'),
  ARRAY['tool-server','lint','format','type-check','quality']
),
(
  'Code Search Server',
  'code_search',
  'Searches patterns, references, definitions, and file stats in a codebase.',
  $$---
name: code_search
description: Searches and navigates codebases as tools.

A tool-server skill for code navigation.

## Functions
- `code_search_pattern(path, pattern)` — regex search across files
- `code_find_references(path, symbol)` — find usages of a symbol
- `code_find_definition(path, symbol)` — locate a symbol's definition
- `code_search_files(path, pattern)` — find files by name pattern
- `code_stats(path)` — language/file counts and sizes

## Usage pattern
Use find_definition then references to map an unknown codebase; search
files by name before pattern-searching contents.$$,
  'tool-server',
  ARRAY['Claude Code','MCP'],
  $$## Install (MCP tool server)
1. Put this package in a skill-server directory.
2. Run: `python server.py list` — confirm tools are registered.
3. Call: `python server.py call code_search.code_find_definition '{"path":"./src","symbol":"parseConfig"}'`$$,
  $${"skill_name":"code_find_definition","success":true,"data":{"file":"src/config.ts","line":12},"msg":"OK"}$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'coding'),
  ARRAY['tool-server','code-search','navigation','refactoring']
),

-- ---------- novel-skills ----------
(
  'Novel Project Manager',
  'novel_file',
  'Initializes and manages a novel project: chapters, snapshots, and structure.',
  $$---
name: novel_file
description: Manages novel writing projects as tools.

A tool-server skill for structured novel writing.

## Functions
- `novel_init(title)` — create a new novel project
- `novel_create_chapter(project_path, title, content)` — add a chapter
- `novel_read_chapter(project_path, chapter_number)` — read a chapter
- `novel_update_chapter(project_path, chapter_number, content)` — edit a chapter
- `novel_list_chapters(project_path)` — list chapter titles
- `novel_save_snapshot(project_path)` — snapshot current state

## Usage pattern
Init the project once, create chapters as they are drafted, and save a
snapshot before large rewrites.$$,
  'tool-server',
  ARRAY['Claude Code','MCP'],
  $$## Install (MCP tool server)
1. Put this package in a skill-server directory.
2. Run: `python server.py list` — confirm tools are registered.
3. Call: `python server.py call novel_file.novel_init '{"title":"My Novel"}'`$$,
  $${"skill_name":"novel_init","success":true,"data":{"project":"novels/my-novel","chapters":[]},"msg":"OK"}$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'writing'),
  ARRAY['tool-server','novel','writing','chapters']
),
(
  'Novel Stats & Editing Server',
  'novel_stats',
  'Tracks word count, progress, consistency, and does find-and-replace editing.',
  $$---
name: novel_stats
description: Provides writing stats and editing tools for novels.

A tool-server skill for novel analytics and editing.

## Functions
- `novel_word_count(project_path)` — total and per-chapter word counts
- `novel_progress(project_path)` — word-count goal progress
- `novel_check_consistency(project_path)` — flag repeated phrases / character-name drift
- `novel_find_replace(project_path, find, replace)` — global replace
- `novel_search(project_path, query)` — search across chapters

## Usage pattern
Run word_count and progress for pacing; use check_consistency before
sending a draft to editing.$$,
  'tool-server',
  ARRAY['Claude Code','MCP'],
  $$## Install (MCP tool server)
1. Put this package in a skill-server directory.
2. Run: `python server.py list` — confirm tools are registered.
3. Call: `python server.py call novel_stats.novel_word_count '{"project_path":"novels/my-novel"}'`$$,
  $${"skill_name":"novel_word_count","success":true,"data":{"total":48210,"chapters":12,"avg_per_chapter":4018},"msg":"OK"}$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'writing'),
  ARRAY['tool-server','novel','writing','stats','editing']
),
(
  'Novel Exporter',
  'novel_export',
  'Exports a novel project to EPUB, TXT, HTML, or DOCX.',
  $$---
name: novel_export
description: Exports novel projects to multiple formats.

A tool-server skill for publishing-ready exports.

## Functions
- `novel_export_epub(project_path)` — EPUB e-book
- `novel_export_txt(project_path)` — plain text
- `novel_export_html(project_path)` — single HTML file
- `novel_export_docx(project_path)` — Word document

## Usage pattern
Export EPUB for readers, DOCX for editors, and HTML/TXT for archives
or further conversion.$$,
  'tool-server',
  ARRAY['Claude Code','MCP'],
  $$## Install (MCP tool server)
1. Put this package in a skill-server directory.
2. Run: `python server.py list` — confirm tools are registered.
3. Call: `python server.py call novel_export.novel_export_epub '{"project_path":"novels/my-novel"}'`$$,
  $${"skill_name":"novel_export_epub","success":true,"data":{"output":"dist/my-novel.epub","size_kb":312},"msg":"OK"}$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'writing'),
  ARRAY['tool-server','novel','export','epub','docx']
),
(
  'Novel Backup Server',
  'novel_backup',
  'Backs up a novel project via git commit or ZIP archive.',
  $$---
name: novel_backup
description: Backs up novel projects safely.

A tool-server skill for project backups.

## Functions
- `novel_git_commit(project_path)` — commit current state to git
- `novel_zip_archive(project_path)` — package the project into a ZIP

## Usage pattern
Git-commit after each writing session; zip-archive before major
changes or for sharing drafts.$$,
  'tool-server',
  ARRAY['Claude Code','MCP'],
  $$## Install (MCP tool server)
1. Put this package in a skill-server directory.
2. Run: `python server.py list` — confirm tools are registered.
3. Call: `python server.py call novel_backup.novel_git_commit '{"project_path":"novels/my-novel"}'`$$,
  $${"skill_name":"novel_git_commit","success":true,"data":{"commit":"3f2a1b","files":24},"msg":"OK"}$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'writing'),
  ARRAY['tool-server','novel','backup','git','archive']
),

-- ---------- prompt-skills ----------
(
  'Prompt Template Manager',
  'prompt_template',
  'Creates, edits, and fills reusable prompt templates with variables.',
  $$---
name: prompt_template
description: Manages reusable prompt templates as tools.

A tool-server skill for prompt template lifecycle.

## Functions
- `prompt_template_create(name, content)` — new template
- `prompt_template_get(template_id)` — read a template
- `prompt_template_update(template_id, content)` — edit a template
- `prompt_template_delete(template_id)` — remove a template
- `prompt_template_list()` — list templates
- `prompt_template_fill(template_id, variables)` — render with {{var}} values

## Usage pattern
Store structured prompts as templates; fill them with variables at
use time to keep prompts consistent.$$,
  'tool-server',
  ARRAY['Claude Code','MCP'],
  $$## Install (MCP tool server)
1. Put this package in a skill-server directory.
2. Run: `python server.py list` — confirm tools are registered.
3. Call: `python server.py call prompt_template.prompt_template_fill '{"template_id":1,"variables":{"topic":"AI agents"}}'`$$,
  $${"skill_name":"prompt_template_fill","success":true,"data":{"rendered":"You are an expert on AI agents..."},"msg":"OK"}$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'general'),
  ARRAY['tool-server','prompt','templates','reusability']
),
(
  'Prompt Testing Suite',
  'prompt_test',
  'Tests and scores prompts: single, compare, batch, and scoring.',
  $$---
name: prompt_test
description: Tests and evaluates prompts systematically.

A tool-server skill for prompt evaluation.

## Functions
- `prompt_test_single(prompt)` — run one prompt and capture output
- `prompt_test_compare(prompts)` — run multiple prompts on the same input
- `prompt_test_batch(inputs, prompts)` — matrix-run inputs × prompts
- `prompt_test_score(test_context, results)` — score outputs on quality dimensions

## Usage pattern
Compare 2–3 variants on the same input before shipping a prompt; batch
to check stability across inputs; score to pick the winner.$$,
  'tool-server',
  ARRAY['Claude Code','MCP'],
  $$## Install (MCP tool server)
1. Put this package in a skill-server directory.
2. Run: `python server.py list` — confirm tools are registered.
3. Call: `python server.py call prompt_test.prompt_test_compare '{"prompts":["v1...","v2..."]}'`$$,
  $${"skill_name":"prompt_test_compare","success":true,"data":[{"prompt":"v1","passed":4},{"prompt":"v2","passed":5}]},"msg":"v2 更稳"}$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'general'),
  ARRAY['tool-server','prompt','testing','evaluation']
),
(
  'Prompt Version Control',
  'prompt_version',
  'Saves, diffs, and rolls back prompt template versions.',
  $$---
name: prompt_version
description: Version-controls prompt templates.

A tool-server skill for prompt iteration history.

## Functions
- `prompt_version_save(template_id)` — snapshot current version
- `prompt_version_list(template_id)` — version history
- `prompt_version_diff(template_id)` — diff between versions
- `prompt_version_rollback(template_id, target_version)` — revert to a version

## Usage pattern
Save a version before every edit; if a change hurts quality, diff and
roll back to the last good version.$$,
  'tool-server',
  ARRAY['Claude Code','MCP'],
  $$## Install (MCP tool server)
1. Put this package in a skill-server directory.
2. Run: `python server.py list` — confirm tools are registered.
3. Call: `python server.py call prompt_version.prompt_version_save '{"template_id":1}'`$$,
  $${"skill_name":"prompt_version_save","success":true,"data":{"version":3,"saved_at":"2026-08-03T12:00:00Z"},"msg":"OK"}$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'general'),
  ARRAY['tool-server','prompt','versioning','iteration']
),
(
  'Prompt Analyzer',
  'prompt_analyze',
  'Analyzes prompt tokens, structure, and compares variants.',
  $$---
name: prompt_analyze
description: Analyzes prompt size, structure, and quality.

A tool-server skill for prompt analysis.

## Functions
- `prompt_analyze_tokens(prompt)` — token estimate (cost/length)
- `prompt_analyze_structure(prompt)` — check role/task/boundaries/format coverage
- `prompt_analyze_compare(prompt_a, prompt_b)` — side-by-side structural comparison

## Usage pattern
Run tokens to budget cost; run structure to find weak dimensions;
compare before choosing between two drafts.$$,
  'tool-server',
  ARRAY['Claude Code','MCP'],
  $$## Install (MCP tool server)
1. Put this package in a skill-server directory.
2. Run: `python server.py list` — confirm tools are registered.
3. Call: `python server.py call prompt_analyze.prompt_analyze_structure '{"prompt":"You are..."}'`$$,
  $${"skill_name":"prompt_analyze_structure","success":true,"data":{"role":true,"task":true,"input_boundary":false,"output_format":false,"score":6},"msg":"缺输入边界与输出格式"}$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'general'),
  ARRAY['tool-server','prompt','analysis','tokens']
),
(
  'Prompt Export & Import',
  'prompt_export',
  'Exports prompts to multiple formats and imports from sources.',
  $$---
name: prompt_export
description: Exports, imports, and converts prompts between formats.

A tool-server skill for prompt portability.

## Functions
- `prompt_export_format(prompt, target_format)` — to text/JSON/messages-array
- `prompt_export_batch(target_format)` — export a template library
- `prompt_import_from(source, source_data)` — import from a source
- `prompt_export_compare_sheet(test_results)` — build a comparison CSV

## Usage pattern
Export the final prompt as a messages array for direct API use; batch
export to back up a library; build a comparison sheet for tests.$$,
  'tool-server',
  ARRAY['Claude Code','MCP'],
  $$## Install (MCP tool server)
1. Put this package in a skill-server directory.
2. Run: `python server.py list` — confirm tools are registered.
3. Call: `python server.py call prompt_export.prompt_export_format '{"prompt":"...","target_format":"messages_array"}'`$$,
  $${"skill_name":"prompt_export_format","success":true,"data":{"format":"messages_array","content":[{"role":"system","content":"..."}]},"msg":"OK"}$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'general'),
  ARRAY['tool-server','prompt','export','import','portability']
),
(
  'Prompt Publisher',
  'prompt_publish',
  'Publishes prompts to PromptHub and tracks publishing status.',
  $$---
name: prompt_publish
description: Publishes prompts to the PromptHub platform.

A tool-server skill for prompt publishing.

## Functions
- `prompt_publish_to_prompthub(template_id)` — publish a template
- `prompt_publish_batch()` — publish pending templates
- `prompt_publish_status()` — publishing queue status

## Usage pattern
Publish a template once it passes testing; batch-publish a curated set;
check status before a release announcement.$$,
  'tool-server',
  ARRAY['Claude Code','MCP'],
  $$## Install (MCP tool server)
1. Put this package in a skill-server directory.
2. Run: `python server.py list` — confirm tools are registered.
3. Call: `python server.py call prompt_publish.prompt_publish_to_prompthub '{"template_id":1}'`$$,
  $${"skill_name":"prompt_publish_to_prompthub","success":true,"data":{"published":true,"url":"/prompts/my-prompt"},"msg":"OK"}$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'general'),
  ARRAY['tool-server','prompt','publish','prompthub']
);

-- ########## 7/7 seed-import-codeflow ##########
-- ============================================================
-- PromptHub - CodeFlow 工作流引擎导入（1 条，英文化）
-- 来源：Desktop/工作流/codeflow（AI 辅助编程工作流编排引擎，M1-M5 完成）
-- 形式：dev-scaffold 工作流
-- ⚠️ 必须先执行 migration-skills-workflows.sql
-- 幂等：ON CONFLICT (slug) DO NOTHING
-- ============================================================

INSERT INTO public.workflows
  (title, slug, description, steps, workflow_type, tools_required, config_content, expected_output, tips, category_id, tags)
VALUES
(
  'CodeFlow — AI Coding Workflow Engine',
  'codeflow-ai-coding-workflow',
  'A complete AI-assisted coding pipeline that turns a requirement into a tested, reviewed delivery.',
  $$[
    {"step":1,"title":"Analyze requirements","tool":"LLM Agent","action":"Convert the request into structured requirements and acceptance criteria","config":"provider = anthropic"},
    {"step":2,"title":"Design the solution","tool":"LLM Agent","action":"Produce a design: files, interfaces, data model","config":"output = design.md"},
    {"step":3,"title":"Write code","tool":"codegen node","action":"Generate code against the design into the change pool","config":"target = app/"},
    {"step":4,"title":"Review the diff","tool":"review node","action":"Review changes; auto-fix minor issues or route to human","config":"gate = review"},
    {"step":5,"title":"Run tests","tool":"test runner","action":"Execute the test suite; gate the merge on green","config":"cmd = pytest"},
    {"step":6,"title":"Fix failures","tool":"loop node","action":"Iterate: fix failures and re-run until green","config":"max_iterations = 3"},
    {"step":7,"title":"Deliver","tool":"git","action":"Commit and write a summary of the change","config":"message = conventional"}
  ]$$,
  'dev-scaffold',
  ARRAY['FastAPI','Anthropic API','SQLite','Git'],
  $$workflow:
  name: feature-delivery
  nodes:
    - start
    - llm: analyze requirements
    - llm: design
    - codegen
    - review
    - test
    - loop: fix-and-retest (max 3)
    - end$$,
  $$A feature delivered end-to-end: requirement → design → code →
review → green tests, with a trace log in the web console (/ui)
and a conventional commit. All M1–M5 milestones complete; 46/46
tests pass.$$,
  $$Engine, not a template: author your own DSL workflows via
docs/dsl.md. Run `uvicorn app.main:app --reload` for the live
console. Start from the built-in templates in docs/templates.md
(write code / review / fix bug).$$,
  (SELECT id FROM public.workflow_categories WHERE slug = 'dev-workflow'),
  ARRAY['ai-coding','workflow-engine','fastapi','agents','scaffold']
);
