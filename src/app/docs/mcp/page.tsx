// ============================================================
// MCP 接入文档：把 PromptHub 接入 Claude Code / Desktop
// ============================================================

import type { Metadata } from 'next';
import { Bot, Wrench } from 'lucide-react';

export const metadata: Metadata = {
  title: 'MCP Server — PromptHub',
  description: 'Connect PromptHub to Claude Code / Claude Desktop via the Model Context Protocol.',
};

const MCP_URL = 'https://prompthub-pi-six-gold.vercel.app/api/mcp';

export default function McpDocsPage() {
  return (
    <div className="container-page py-10 max-w-3xl">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-sm font-medium mb-3">
          <Bot className="w-4 h-4" />
          MCP Server
        </div>
        <h1 className="page-title">Connect PromptHub to Your AI Assistant</h1>
        <p className="page-subtitle">
          PromptHub speaks the Model Context Protocol — your AI tools can search and fetch
          prompts, skills, and workflows directly.
        </p>
      </div>

      {/* Claude Code */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold mb-2">Claude Code</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
          Add the server to your project&apos;s <code className="text-xs bg-slate-100 dark:bg-dark-800 px-1.5 py-0.5 rounded">.mcp.json</code>:
        </p>
        <pre className="p-4 rounded-xl bg-slate-950 dark:bg-dark-950 border border-slate-800 text-xs text-slate-200 overflow-x-auto">
{`{
  "mcpServers": {
    "prompthub": {
      "type": "http",
      "url": "${MCP_URL}"
    }
  }
}`}
        </pre>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">
          Then restart Claude Code. You can now say things like:
          <span className="block mt-1 text-slate-600 dark:text-slate-300 italic">
            "Use the prompthub search_prompts tool to find a prompt for reviewing Python code"
          </span>
        </p>
      </div>

      {/* Claude Desktop */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold mb-2">Claude Desktop</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
          Edit <code className="text-xs bg-slate-100 dark:bg-dark-800 px-1.5 py-0.5 rounded">claude_desktop_config.json</code>:
        </p>
        <pre className="p-4 rounded-xl bg-slate-950 dark:bg-dark-950 border border-slate-800 text-xs text-slate-200 overflow-x-auto">
{`{
  "mcpServers": {
    "prompthub": {
      "url": "${MCP_URL}"
    }
  }
}`}
        </pre>
      </div>

      {/* 工具 */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Wrench className="w-5 h-5 text-brand-500" />
          <h2 className="text-lg font-semibold">Available tools</h2>
        </div>
        <div className="space-y-2">
          {[
            ['search_prompts', 'Search prompts by query/category/tag (metadata)'],
            ['get_prompt', 'Get the full content of a prompt (free)'],
            ['search_skills', 'Search skills by query/category (metadata only)'],
            ['get_skill', 'Get a skill by slug/id (metadata only)'],
            ['search_workflows', 'Search workflows by query/category (metadata only)'],
            ['get_workflow', 'Get a workflow by slug/id (metadata + overview)'],
          ].map(([name, desc]) => (
            <div key={name} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-dark-800">
              <code className="text-sm text-brand-600 dark:text-brand-400 w-36 shrink-0">{name}</code>
              <span className="text-xs text-slate-500 dark:text-slate-400">{desc}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
          Prompts return full content (free). Skills &amp; workflows return metadata only —
          full content requires membership, even through the API.
        </p>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-2">Also available</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Prefer plain JSON? Use the <a href="/docs/api" className="text-brand-600 dark:text-brand-400 hover:underline">Public API</a> instead.
        </p>
      </div>
    </div>
  );
}
