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
