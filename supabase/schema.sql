-- ============================================================
-- PromptHub - Supabase 数据库初始化 SQL
-- 使用方法：登录 Supabase Dashboard → SQL Editor → 粘贴全部执行
-- ============================================================

-- 一、用户扩展资料表（关联 Supabase Auth 的 auth.users）
-- 存储用户的额外信息：昵称、头像、会员状态等
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,                                      -- 用户昵称
  avatar_url TEXT,                                           -- 头像链接
  bio TEXT DEFAULT '',                                       -- 个人简介
  membership_tier TEXT DEFAULT 'free' CHECK (membership_tier IN ('free', 'monthly', 'quarterly', 'yearly')),
                                                             -- 会员等级：free(免费)/monthly(月付)/quarterly(季付)/yearly(年付)
  membership_expires_at TIMESTAMPTZ,                         -- 会员到期时间（免费用户为 NULL）
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 行级安全策略：用户只能读取自己的 profile，但可以查看他人的基本信息
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "公开读取 profiles" ON public.profiles
  FOR SELECT USING (true);                                   -- 所有登录用户可查看他人 profile
CREATE POLICY "用户修改自己的 profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "用户插入自己的 profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);


-- 二、提示词分类表
CREATE TABLE IF NOT EXISTS public.categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,                                 -- 分类名称：Code Prompt / Novel Writing / Agent LLM / General Prompt
  slug TEXT NOT NULL UNIQUE,                                 -- URL 友好标识
  description TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "公开读取分类" ON public.categories
  FOR SELECT USING (true);                                   -- 所有人可读


-- 三、提示词表（核心资源表）
CREATE TABLE IF NOT EXISTS public.prompts (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,                                       -- 提示词标题
  slug TEXT UNIQUE,                                          -- SEO 友好的 URL
  description TEXT,                                          -- 简短描述
  content TEXT NOT NULL,                                     -- 完整 Prompt 文本
  category_id INT REFERENCES public.categories(id) ON DELETE SET NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- 提交者（NULL = 匿名/种子数据）
  model_name TEXT,                                           -- 适配大模型名称，如 "GPT-4 / Claude 3.5"
  tips TEXT,                                                 -- 调参建议（Markdown 格式）
  screenshot_urls TEXT[] DEFAULT '{}',                       -- 使用案例截图 URL 数组
  tags TEXT[] DEFAULT '{}',                                  -- 标签数组
  usage_count INT DEFAULT 0,                                 -- 被使用/复制次数
  is_published BOOLEAN DEFAULT true,                         -- 是否发布
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引：加速搜索和筛选
CREATE INDEX IF NOT EXISTS idx_prompts_category ON public.prompts(category_id);
CREATE INDEX IF NOT EXISTS idx_prompts_author ON public.prompts(author_id);
CREATE INDEX IF NOT EXISTS idx_prompts_tags ON public.prompts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_prompts_title_search ON public.prompts USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '')));

ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "公开读取已发布提示词" ON public.prompts
  FOR SELECT USING (is_published = true);                    -- 所有人可读已发布的提示词
CREATE POLICY "用户提交提示词" ON public.prompts
  FOR INSERT WITH CHECK (auth.uid() = author_id);            -- 登录用户可以提交
CREATE POLICY "用户修改自己的提示词" ON public.prompts
  FOR UPDATE USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE POLICY "用户删除自己的提示词" ON public.prompts
  FOR DELETE USING (auth.uid() = author_id);


-- 三-B、用户公开信息视图（脱敏 profiles 表，用于 JOIN 显示作者信息）
-- 应用程序的所有作者查询均通过此视图，避免暴露敏感字段
CREATE OR REPLACE VIEW public.profiles_public AS
  SELECT id, username, avatar_url, bio, created_at
  FROM public.profiles;


-- 四、收藏文件夹表
CREATE TABLE IF NOT EXISTS public.folders (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                                        -- 文件夹名称，如 "GPT 精选"、"小说创作"
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "用户管理自己的文件夹" ON public.folders
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- 五、收藏表（用户收藏的提示词）
CREATE TABLE IF NOT EXISTS public.favorites (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt_id INT NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE,
  folder_id INT REFERENCES public.folders(id) ON DELETE SET NULL, -- 所属文件夹（NULL = 未分类）
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, prompt_id)                                 -- 同一用户不能重复收藏同一提示词
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "用户管理自己的收藏" ON public.favorites
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- 六、订单表（付费功能暂未启用，预建表结构）
-- 记录 Lemon Squeezy 支付回调的订单数据
CREATE TABLE IF NOT EXISTS public.orders (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lemon_squeezy_order_id TEXT UNIQUE,                        -- Lemon Squeezy 订单 ID
  lemon_squeezy_subscription_id TEXT,                        -- Lemon Squeezy 订阅 ID
  product_name TEXT,                                         -- 产品名称：Monthly / Quarterly / Yearly
  amount DECIMAL(10, 2),                                     -- 支付金额
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'refunded', 'cancelled')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "用户读取自己的订单" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);                   -- 用户只能看自己的订单


-- 七、反馈表
-- 用户提交的建议、Bug 报告、功能请求
CREATE TABLE IF NOT EXISTS public.feedback (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,   -- NULL = 匿名反馈
  type TEXT NOT NULL CHECK (type IN ('suggestion', 'bug_report', 'feature_request', 'other')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  email TEXT,                                                  -- 可选的联系邮箱
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "所有人可提交反馈" ON public.feedback
  FOR INSERT WITH CHECK (true);
CREATE POLICY "用户查看自己的反馈" ON public.feedback
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);


-- 八、评分表
-- 用户对提示词的 1-5 星评分
CREATE TABLE IF NOT EXISTS public.ratings (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt_id INT NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, prompt_id)                                   -- 每个用户对每个提示词只能评一次
);

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "公开读取评分" ON public.ratings
  FOR SELECT USING (true);
CREATE POLICY "用户管理自己的评分" ON public.ratings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- 九、提示词统计视图
-- 聚合评分和收藏数据，避免在应用层做多次查询
CREATE OR REPLACE VIEW public.prompt_stats AS
  SELECT
    p.id AS prompt_id,
    COALESCE(AVG(r.rating), 0) AS avg_rating,
    COUNT(r.id) AS rating_count,
    COUNT(f.id) AS favorite_count
  FROM public.prompts p
  LEFT JOIN public.ratings r ON r.prompt_id = p.id
  LEFT JOIN public.favorites f ON f.prompt_id = p.id
  GROUP BY p.id;


-- ============================================================
-- 触发器：新用户注册时自动创建 profile
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 如果触发器已存在则删除重建
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- 种子数据：预置分类
-- ============================================================
INSERT INTO public.categories (name, slug, description, sort_order) VALUES
  ('Code Prompt', 'code-prompt', 'Programming and development related prompts', 1),
  ('Novel Writing', 'novel-writing', 'Creative writing and storytelling prompts', 2),
  ('Agent LLM', 'agent-llm', 'AI agent and autonomous system prompts', 3),
  ('General Prompt', 'general-prompt', 'General purpose and miscellaneous prompts', 4);


-- ============================================================
-- 种子数据：示例提示词（方便开发测试）
-- ============================================================
INSERT INTO public.prompts (title, slug, description, content, category_id, model_name, tips, tags) VALUES
(
  'Python Code Reviewer',
  'python-code-reviewer',
  'A professional Python code reviewer that provides detailed feedback on code quality, performance, and best practices.',
  'You are a senior Python developer and code reviewer. Please review the following Python code with a focus on:
1. Code quality and readability
2. Performance optimizations
3. PEP 8 compliance
4. Security vulnerabilities
5. Error handling

For each issue found, provide:
- The severity level (Critical / Warning / Suggestion)
- The specific line or section
- A clear explanation of the problem
- A suggested fix with code example

Code to review:
```
{code}
```

Please format your response in a structured way with clear sections.',
  (SELECT id FROM public.categories WHERE slug = 'code-prompt'),
  'GPT-4 / Claude 3.5 / DeepSeek',
  '## Tuning Tips
- For best results, provide complete code snippets rather than fragments
- You can specify additional review criteria based on your project needs
- Temperature: 0.3 for consistent, focused reviews',
  ARRAY['python', 'code-review', 'programming', 'debugging']
),
(
  'Fantasy World Builder',
  'fantasy-world-builder',
  'Create rich, detailed fantasy worlds with unique cultures, magic systems, and histories.',
  'You are a master world-builder and fantasy author. Help me create a detailed fantasy world with the following elements:

**World Name:** {world_name}
**Genre/Theme:** {genre}
**Magic Level:** {magic_level} (Low/Medium/High)

Please develop the following aspects in rich detail:
1. **Geography & Environment** - Landscapes, climate, unique natural features
2. **Magic System** - Rules, limitations, sources of magical power
3. **Cultures & Societies** - Major civilizations, customs, social structures
4. **History & Lore** - Key historical events, myths, legends
5. **Creatures & Beings** - Unique flora, fauna, and sentient species
6. **Conflicts & Tensions** - Current political or existential threats

Make the world feel lived-in and real. Include sensory details and avoid common fantasy clichés.',
  (SELECT id FROM public.categories WHERE slug = 'novel-writing'),
  'Claude 3.5 / GPT-4',
  '## Tuning Tips
- Set temperature to 0.8-0.9 for maximum creativity
- Iterate: start with a broad overview, then drill into specific elements
- Combine with character creation prompts for complete story building',
  ARRAY['fantasy', 'world-building', 'creative-writing', 'storytelling']
),
(
  'AI Research Assistant Agent',
  'ai-research-assistant-agent',
  'An autonomous AI agent prompt that conducts comprehensive research on any topic and produces structured reports.',
  'You are an autonomous AI Research Assistant. Your task is to conduct thorough research on a given topic and produce a comprehensive report.

**Research Topic:** {topic}
**Depth Level:** {depth} (Basic/Intermediate/Advanced)
**Output Format:** {format} (Executive Summary/Full Report/Literature Review)

Follow this research methodology:

### Phase 1: Information Gathering
- Identify key concepts and terminology related to the topic
- Map out the major schools of thought, debates, and consensus views
- Note important researchers, institutions, and publications in the field

### Phase 2: Analysis
- Evaluate the credibility and relevance of different sources
- Identify patterns, trends, and contradictions in the information
- Assess the strength of evidence for different claims

### Phase 3: Synthesis
- Organize findings into a coherent narrative structure
- Highlight areas of consensus and controversy
- Identify gaps in current knowledge and promising future directions

### Phase 4: Output Generation
- Executive Summary (200-300 words)
- Main Body with clear sections and subheadings
- Key Findings bullet points
- Recommended Further Reading
- Limitations and Caveats

Maintain academic rigor while being accessible. Cite specific studies, researchers, and data points to support claims.',
  (SELECT id FROM public.categories WHERE slug = 'agent-llm'),
  'Claude 3.5 Opus / GPT-4 Turbo',
  '## Tuning Tips
- This prompt works best with models that have large context windows
- For very broad topics, consider chaining multiple research sessions
- Temperature: 0.4 for factual accuracy with some creative synthesis',
  ARRAY['research', 'agent', 'autonomous', 'academic', 'analysis']
),
(
  'Universal Translator & Cultural Adapter',
  'universal-translator-cultural-adapter',
  'Translate text while adapting it culturally and contextually for the target audience.',
  'You are an expert translator and cultural consultant. Translate the following text from {source_language} to {target_language}, with special attention to cultural adaptation.

**Context:** {context}
**Target Audience:** {audience}
**Tone:** {tone} (Formal/Casual/Professional/Creative)

For the translation:
1. **Literal Translation** - Provide the direct translation first
2. **Cultural Adaptation** - Adapt idioms, metaphors, and cultural references to resonate with the target audience
3. **Localization Notes** - Explain key cultural adaptations you made and why
4. **Alternative Suggestions** - Offer 2-3 alternative phrasings if applicable

Text to translate:
```
{text}
```

Consider:
- Regional dialects and variations
- Formality levels appropriate to the context
- Taboo topics or sensitive subjects in the target culture
- Industry-specific terminology if the context is professional',
  (SELECT id FROM public.categories WHERE slug = 'general-prompt'),
  'GPT-4 / Claude 3.5 / Gemini',
  '## Tuning Tips
- Provide as much context as possible for better cultural adaptation
- For technical documents, use temperature 0.2; for creative content, 0.7
- Specify the target region (not just language) for dialect accuracy',
  ARRAY['translation', 'localization', 'language', 'cultural-adaptation', 'communication']
),
(
  'Full-Stack Bug Fixer',
  'full-stack-bug-fixer',
  'Systematically diagnose and fix bugs in full-stack web applications with detailed explanations.',
  'You are a senior full-stack developer specializing in debugging web applications. Diagnose and fix the following bug:

**Tech Stack:** {tech_stack}
**Bug Description:** {bug_description}
**Expected Behavior:** {expected_behavior}
**Actual Behavior:** {actual_behavior}
**Error Messages:** {error_messages}
**Relevant Code:**
```
{code}
```

Please provide a structured analysis:

### 1. Root Cause Analysis
- What is actually happening vs what should happen
- Trace the data flow and identify where it breaks
- Explain the underlying technical reason

### 2. Solution
- Step-by-step fix with code changes
- Explain why this fix works
- Note any trade-offs or side effects

### 3. Prevention
- How to prevent similar bugs in the future
- Suggested tests to add
- Code patterns or practices to adopt

### 4. Verification Steps
- How to confirm the fix works
- Edge cases to test

Be specific and practical. Show exact code changes using diff-style notation where helpful.',
  (SELECT id FROM public.categories WHERE slug = 'code-prompt'),
  'Claude 3.5 / GPT-4 / DeepSeek',
  '## Tuning Tips
- Include the full error stack trace for best results
- Mention any recent changes that might be related
- Temperature: 0.3 for precise technical analysis',
  ARRAY['debugging', 'full-stack', 'troubleshooting', 'web-development']
),
(
  'Character Backstory Generator',
  'character-backstory-generator',
  'Generate deep, compelling character backstories for novels, RPGs, or screenplays.',
  'You are a character development specialist and narrative designer. Create a detailed backstory for the following character:

**Character Basics:**
- Name: {character_name}
- Role: {role} (Protagonist/Antagonist/Supporting)
- Genre: {genre}
- Approximate Age: {age}

Please develop:

### External Journey (What Happened)
1. **Origins** - Birthplace, family background, childhood defining moments
2. **Formative Events** - 3-5 key events that shaped who they are
3. **Current Situation** - Where they are now and their immediate goals

### Internal Journey (Who They Became)
1. **Core Personality** - Traits, quirks, habits, speech patterns
2. **Beliefs & Values** - What they stand for and what they would never do
3. **Fears & Desires** - Deepest fear, greatest desire, the gap between them
4. **Internal Conflict** - The central tension driving their choices

### Relationships
1. **Key Relationships** - 3-5 important people and the nature of each relationship
2. **Relationship Dynamics** - Patterns in how they connect with others

### Character Arc Potential
1. **Growth Trajectory** - How they might change over the story
2. **Moral Compass** - Where they fall on key ethical spectrums
3. **Breaking Points** - What would make them break their own rules

Make the character feel like a real person with contradictions, blind spots, and unexpected depths.',
  (SELECT id FROM public.categories WHERE slug = 'novel-writing'),
  'GPT-4 / Claude 3.5',
  '## Tuning Tips
- Temperature: 0.9 for maximum creative variety
- Run multiple times with the same inputs to explore different character directions
- Combine with world-building prompts for consistent character-in-world design',
  ARRAY['character', 'creative-writing', 'RPG', 'storytelling', 'backstory']
);

-- ============================================================
-- 完成！执行以上 SQL 后，数据库即可投入使用
-- ============================================================
