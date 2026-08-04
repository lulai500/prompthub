// ============================================================
// MCP Server (Streamable HTTP) — /api/mcp
// 让 Claude Code / Claude Desktop 等 AI 助手直接查询 PromptHub 资产
// 协议：MCP (Model Context Protocol)，轻量 JSON-RPC 2.0
// 工具：search/get × prompts/skills/workflows
// 注意：技能/工作流仅返回元数据（保护会员付费墙）
// ============================================================

import { NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

// ---- 工具定义 ----
const TOOLS = [
  {
    name: 'search_prompts',
    description:
      'Search PromptHub prompts by query, category, or tag. Returns metadata; call get_prompt for full content.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search text' },
        category: { type: 'string', description: 'Category slug: code-prompt, novel-writing, agent-llm, general-prompt' },
        tag: { type: 'string', description: 'Tag to filter by' },
        limit: { type: 'number', description: 'Max results (1-20)', default: 5 },
      },
    },
  },
  {
    name: 'get_prompt',
    description: 'Get the full content of a prompt by slug or numeric id.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Prompt slug or numeric id' } },
      required: ['id'],
    },
  },
  {
    name: 'search_skills',
    description:
      'Search PromptHub skills by query or category. Returns metadata only (full skill content requires membership).',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        category: { type: 'string', description: 'Category slug: coding, writing, research-agents, general, video-production' },
        limit: { type: 'number', default: 5 },
      },
    },
  },
  {
    name: 'get_skill',
    description: 'Get a skill by slug or id (metadata only; full content requires membership).',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
  {
    name: 'search_workflows',
    description: 'Search PromptHub workflows by query or category. Returns metadata only.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        category: { type: 'string', description: 'Category slug: content-pipeline, dev-workflow, data-research, general' },
        limit: { type: 'number', default: 5 },
      },
    },
  },
  {
    name: 'get_workflow',
    description: 'Get a workflow by slug or id (metadata + step overview only).',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
];

// ---- 工具执行 ----
async function callTool(name: string, args: Record<string, any>) {
  try {
    const supabase = createAnonClient();
    const limit = Math.min(Math.max(parseInt(args.limit) || 5, 1), 20);
    const byIdOrSlug = (table: string, id: string, select: string) => {
      let q = supabase.from(table).select(select).eq('is_published', true);
      return /^\d+$/.test(id) ? q.eq('id', parseInt(id, 10)) : q.eq('slug', id);
    };

    switch (name) {
      case 'search_prompts': {
        let q = supabase
          .from('prompts')
          .select('id, title, slug, description, model_name, tags, category:categories(name)')
          .eq('is_published', true);
        if (args.query) q = q.or(`title.ilike.%${args.query}%,description.ilike.%${args.query}%`);
        if (args.category) {
          const { data: cat } = await supabase.from('categories').select('id').eq('slug', args.category).single();
          if (cat) q = q.eq('category_id', cat.id);
        }
        if (args.tag) q = q.contains('tags', [args.tag]);
        const { data } = await q.order('usage_count', { ascending: false }).limit(limit);
        return text(JSON.stringify(data || [], null, 2));
      }
      case 'get_prompt': {
        const { data } = await byIdOrSlug(
          'prompts',
          String(args.id),
          'id, title, slug, description, content, model_name, tips, example_output, tags'
        ).single();
        if (!data) return err('Prompt not found');
        return text(JSON.stringify(data, null, 2));
      }
      case 'search_skills': {
        let q = supabase
          .from('skills')
          .select('id, title, slug, description, skill_format, compatible_models, tags, category:skill_categories(name)')
          .eq('is_published', true);
        if (args.query) q = q.or(`title.ilike.%${args.query}%,description.ilike.%${args.query}%`);
        if (args.category) {
          const { data: cat } = await supabase.from('skill_categories').select('id').eq('slug', args.category).single();
          if (cat) q = q.eq('category_id', cat.id);
        }
        const { data } = await q.order('usage_count', { ascending: false }).limit(limit);
        return text(JSON.stringify(data || [], null, 2));
      }
      case 'get_skill': {
        const { data } = await byIdOrSlug(
          'skills',
          String(args.id),
          'id, title, slug, description, skill_format, compatible_models, tags, category:skill_categories(name)'
        ).single();
        if (!data) return err('Skill not found');
        return text(JSON.stringify(data, null, 2));
      }
      case 'search_workflows': {
        let q = supabase
          .from('workflows')
          .select('id, title, slug, description, workflow_type, tools_required, tags, category:workflow_categories(name)')
          .eq('is_published', true);
        if (args.query) q = q.or(`title.ilike.%${args.query}%,description.ilike.%${args.query}%`);
        if (args.category) {
          const { data: cat } = await supabase.from('workflow_categories').select('id').eq('slug', args.category).single();
          if (cat) q = q.eq('category_id', cat.id);
        }
        const { data } = await q.order('usage_count', { ascending: false }).limit(limit);
        return text(JSON.stringify(data || [], null, 2));
      }
      case 'get_workflow': {
        const { data } = await byIdOrSlug(
          'workflows',
          String(args.id),
          'id, title, slug, description, workflow_type, tools_required, tags, category:workflow_categories(name)'
        ).single();
        if (!data) return err('Workflow not found');
        return text(JSON.stringify(data, null, 2));
      }
      default:
        return err('Unknown tool: ' + name);
    }
  } catch (e: any) {
    return err('Tool error: ' + e.message);
  }
}

function text(text: string) {
  return { content: [{ type: 'text', text }] };
}
function err(text: string) {
  return { content: [{ type: 'text', text }], isError: true };
}

// ---- 响应（支持 SSE 流式与 JSON）----
function respond(id: any, result?: unknown, error?: { code: number; message: string }, stream = false) {
  const payload = { jsonrpc: '2.0', id: id ?? null, ...(error ? { error } : { result }) };
  const body = JSON.stringify(payload);
  if (stream) {
    return new Response(`event: message\ndata: ${body}\n\n`, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    });
  }
  return NextResponse.json(payload);
}

export async function POST(request: Request) {
  // 限流：60 次/分钟/IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = checkRateLimit(`mcp:${ip}`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' } }, { status: 400 });
  }

  const { method, id, params } = body || {};
  const stream = request.headers.get('accept')?.includes('text/event-stream') ?? false;

  switch (method) {
    case 'initialize':
      return respond(
        id,
        {
          protocolVersion: '2025-03-26',
          capabilities: { tools: {} },
          serverInfo: { name: 'prompthub', version: '1.0.0' },
        },
        undefined,
        stream
      );
    case 'notifications/initialized':
      return new Response(null, { status: 202 });
    case 'ping':
      return respond(id, {}, undefined, stream);
    case 'tools/list':
      return respond(id, { tools: TOOLS }, undefined, stream);
    case 'tools/call':
      return respond(id, await callTool(params?.name, params?.arguments || {}), undefined, stream);
    default:
      return respond(id, null, { code: -32601, message: 'Method not found: ' + method }, stream);
  }
}

export function GET() {
  // Streamable HTTP 客户端通过 POST 通信；GET 用于 SSE 会话（可选）
  return new Response('PromptHub MCP Server — use POST', { status: 405 });
}
