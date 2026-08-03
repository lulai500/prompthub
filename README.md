# PromptHub

> **Tested AI capabilities — prompts, skills & workflows. Matched to your model. Free & open-source.**

PromptHub is a community-driven platform for AI capabilities in three pillars:

| Pillar | What it is |
|---|---|
| **Prompts** | Tested, structured prompts with model compatibility, tuning tips, and example outputs |
| **Skills** | Installable skills — Claude Skills, Cursor Rules, Codex, GPT Actions & more |
| **Workflows** | Reproducible multi-step AI workflows — agent orchestration, automation templates, dev scaffolds |

Every asset is free, every asset is meant to be **tested**: we publish the model it works with, the tuning parameters, and example output — not just a wall of text.

## ✨ Features

- 🔍 **Search & filter** — keyword search, category and tag filtering across all assets
- ⭐ **Favorites & folders** — save and organize assets in the cloud (unlimited, free)
- 📋 **One-click copy** — copy prompts with usage tracking; fill `{{variables}}` before copying
- 🧪 **Token & cost estimates** — see roughly what a prompt costs per run
- 🧩 **Cross-pillar recommendations** — prompts, skills, and workflows that pair well together
- 🌗 **Dark / light mode** — responsive on desktop and mobile
- 🔒 **Secure by default** — RLS policies, rate limiting, CSP, input validation
- 📧 **Newsletter capture** — grow an owned audience (optional Buttondown sync)
- 💳 **Monetization-ready** — Lemon Squeezy subscription code is dormant, not dead

## 🏗️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, Server Components)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL + Auth + RLS)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Analytics**: Vercel Analytics
- **Deployment**: [Vercel](https://vercel.com/) (free tier)

## 🚀 Quick Start

### 1. Prerequisites

- Node.js 18+ and npm
- A Supabase project (free tier is plenty)
- (Optional) A Vercel account for deployment

### 2. Set up the database

1. Open your Supabase project → **SQL Editor**
2. Run the migrations in order:
   - `supabase/schema.sql` — core tables (profiles, prompts, favorites, ratings…)
   - `supabase/migration-skills-workflows.sql` — skills & workflows pillars
   - `supabase/migration-newsletter.sql` — newsletter subscribers
3. (Optional) Load seed content:
   - `supabase/seed-skills-workflows.sql` — 24 skills + 4 workflows
   - `supabase/seed-import-video-skills.sql` — 16 video production skills
   - `supabase/seed-import-tool-skills.sql` — 15 tool-server skills
   - `supabase/seed-import-codeflow.sql` — CodeFlow workflow

### 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in your Supabase credentials (see `.env.example` for all options).

### 4. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 📁 Project Structure

```
src/
├── app/                 # App Router pages & API routes
│   ├── prompts/         # Prompts pillar (list, detail)
│   ├── skills/          # Skills pillar (list, detail)
│   ├── workflows/       # Workflows pillar (list, detail)
│   ├── dashboard/       # User dashboard (favorites, settings)
│   ├── api/             # API routes (og, newsletter, usage, webhook)
│   └── auth/            # Login / register / reset password
├── components/          # Reusable UI components
├── lib/                 # Supabase clients, utils, crawler detection
└── types/               # TypeScript types
supabase/                # SQL migrations & seed data
```

## 📄 Documentation

- [Deployment guide](DEPLOYMENT.md) — full Supabase + Vercel walkthrough
- [Upgrade to paid](UPGRADE-TO-PAID.md) — enabling Lemon Squeezy subscriptions (~30 lines of changes)
- [Contributing](CONTRIBUTING.md) — how to submit prompts, skills, workflows, and code

## 🤝 Contributing

We welcome contributions of all kinds — content (prompts, skills, workflows) and code. See [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

## 📜 License

[MIT](LICENSE)
