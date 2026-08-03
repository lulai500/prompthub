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
