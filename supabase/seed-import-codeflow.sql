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
