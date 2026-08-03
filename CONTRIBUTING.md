# Contributing to PromptHub

Thanks for wanting to make PromptHub better! There are two ways to contribute: **content** (prompts, skills, workflows) and **code**.

## 1. Contributing Content

Content is the heart of PromptHub. Every asset should be **tested** — that's our promise.

### Quality standards for prompts

Follow the professional prompt standard:

1. **Structured layering** — role definition → core task → input boundaries → constraints → output format → fallback logic
2. **Controllable output** — fixed fields/formats, explicit length limits, few-shot examples
3. **Model-aware** — note which models it was tested on and the recommended parameters (temperature, max_tokens)
4. **Safe** — no fabricated facts, no prompt-injection risks, clearly marked uncertainty
5. **Reusable** — use `{{variable}}` placeholders for parameterized parts

Include for every prompt:
- Title & description
- The full prompt text
- `model_name` — models it was tested with
- `tips` — tuning advice (temperature, tokens, context)
- `example_output` — a real or representative output (this is what makes it "tested")
- 3–6 tags

### Quality standards for skills

- SKILL.md format with clear frontmatter (`name`, `description` with when-to-use triggers)
- Concrete, testable steps in the body
- Install instructions that actually work
- Prefer small, composable skills over one giant skill

### Quality standards for workflows

- `steps` array with clear step / tool / action per stage
- Realistic config and expected output
- Note the tools required

### How to submit content

1. Add your asset to the relevant seed SQL file in `supabase/` (or submit via the site's submission form once you have an account)
2. Open a pull request with a short description of what you added and how you tested it

## 2. Contributing Code

### Setup

```bash
npm install
cp .env.example .env.local   # fill in Supabase credentials
npm run dev
```

### Guidelines

- Keep dependencies lean — this project runs on Vercel's free tier
- Follow the existing code style: detailed comments in the same language as surrounding code, TypeScript everywhere
- Sensitive credentials go in environment variables only, never in code
- Respect RLS — the anon client is for public data only; use the admin client only in server-side routes that need it

### Before submitting a PR

- Run `npm run build` and make sure it passes
- Run `npx tsc --noEmit` for type checks
- Test your change locally with `npm run dev`
- Describe what you changed and why in the PR description

## 3. Reporting Issues

Use GitHub Issues for bugs and feature requests. Include:

- What you expected to happen
- What actually happened
- Steps to reproduce (if a bug)
- Environment (browser, device) if relevant

## Code of Conduct

Be respectful, be constructive. Content that is hateful, illegal, or violates platform policies will be removed.

---

Thanks for contributing to free, tested AI capabilities. 🚀
