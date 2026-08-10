// ============================================================
// Public API 文档页
// 让开发者/自己的 AI 工具能调用 PromptHub 资产（集成锁定）
// ============================================================

import type { Metadata } from 'next';
import { Code2, Lock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Public API — PromptHub',
  description: 'Read-only API for PromptHub prompts, skills, and workflows.',
};

const ENDPOINTS = [
  { method: 'GET', path: '/api/v1/prompts', desc: 'List prompts' },
  { method: 'GET', path: '/api/v1/prompts/:id', desc: 'Single prompt (id or slug)' },
  { method: 'GET', path: '/api/v1/skills', desc: 'List skills (full content)' },
  { method: 'GET', path: '/api/v1/skills/:id', desc: 'Single skill (full content)' },
  { method: 'GET', path: '/api/v1/workflows', desc: 'List workflows (full content)' },
  { method: 'GET', path: '/api/v1/workflows/:id', desc: 'Single workflow (full content)' },
];

const PARAMS = [
  { name: 'category', desc: 'Filter by category slug' },
  { name: 'tag', desc: 'Filter by tag' },
  { name: 'search', desc: 'Search title & description' },
  { name: 'limit', desc: 'Max results (default 20, max 100)' },
  { name: 'offset', desc: 'Pagination offset (default 0)' },
];

export default function ApiDocsPage() {
  const base = 'https://prompthub-pi-six.vercel.app';
  return (
    <div className="container-page py-10 max-w-3xl">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-sm font-medium mb-3">
          <Code2 className="w-4 h-4" />
          Public API
        </div>
        <h1 className="page-title">PromptHub API</h1>
        <p className="page-subtitle">
          A read-only JSON API to query tested prompts, skills, and workflows. Free, no key required.
        </p>
      </div>

      {/* 端点表 */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Endpoints</h2>
        <div className="space-y-2">
          {ENDPOINTS.map((e) => (
            <div key={e.path} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-dark-800">
              <span className="text-xs font-bold px-2 py-1 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 shrink-0">
                {e.method}
              </span>
              <code className="text-sm text-slate-700 dark:text-slate-300 flex-1">{e.path}</code>
              <span className="text-xs text-slate-500 dark:text-slate-400">{e.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 参数 */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Query parameters</h2>
        <div className="space-y-2">
          {PARAMS.map((p) => (
            <div key={p.name} className="flex items-center gap-3">
              <code className="text-sm text-brand-600 dark:text-brand-400 w-24 shrink-0">?{p.name}=</code>
              <span className="text-sm text-slate-500 dark:text-slate-400">{p.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 示例 */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Example</h2>
        <pre className="p-4 rounded-xl bg-slate-950 dark:bg-dark-950 border border-slate-800 text-xs text-slate-200 overflow-x-auto">
{`// List prompts tagged python
GET ${base}/api/v1/prompts?tag=python&limit=5

// Single prompt by slug
GET ${base}/api/v1/prompts/javascript

// List skills (full content — everything is free)
GET ${base}/api/v1/skills?category=coding`}
        </pre>
      </div>

      {/* MCP */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold mb-2">Use it from Claude / Cursor</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          PromptHub also ships an <a href="/docs/mcp" className="text-brand-600 dark:text-brand-400 hover:underline">MCP server</a> — connect it to Claude Code or Claude Desktop and query assets in plain language.
        </p>
      </div>

      {/* 说明 */}
      <div className="card p-6">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <h2 className="text-lg font-semibold mb-2">Notes</h2>
            <ul className="text-sm text-slate-500 dark:text-slate-400 space-y-1.5 list-disc ml-4">
              <li>Every asset returns full content — prompts, skills &amp; workflows are all free.</li>
              <li>Rate limit: 30 requests/minute/IP.</li>
              <li>No API key required for read access.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
