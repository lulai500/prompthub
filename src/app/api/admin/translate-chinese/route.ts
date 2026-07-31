// ============================================================
// POST /api/admin/translate-chinese
// One-time migration: translate/delete Chinese prompts
//
// Security: Requires a secret key passed as query parameter.
// Uses admin client (service role) to bypass RLS and update
// prompts regardless of author.
//
// Usage:
//   Translate known prompts:
//     curl -X POST "https://yoursite.com/api/admin/translate-chinese?secret=<SECRET>"
//   Delete ALL Chinese prompts:
//     curl -X DELETE "https://yoursite.com/api/admin/translate-chinese?secret=<SECRET>"
// ============================================================

import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Temporary secret for this one-time operation
const MIGRATION_SECRET = 'prompthub-migrate-zh-to-en-2026';

// ---- Hand-crafted English translations (keyed by slug) ----
const KNOWN_TRANSLATIONS: Record<string, {
  title: string;
  description: string;
  content: string;
  tips: string;
}> = {
  'python-rest-api': {
    title: 'Write a Python Function for REST API Calls with Error Handling, Retry Mechanism, and Request Logging',
    description: 'A prompt for generating a Python function to make REST API calls with comprehensive error handling, retry logic, and structured request logging.',
    content: `You are a senior Python engineer with 10+ years of experience, dedicated to following SOLID principles and prioritizing code readability, security, and performance.

## Core Task
Write a Python function that implements REST API calls with complete error handling, retry mechanism, and request logging.

## Input Boundaries
- Base analysis and responses strictly on the provided materials
- If the information provided is insufficient to make a judgment, clearly state "Insufficient reliable basis for conclusion"
- Do not fabricate or speculate on any unverified content

## Constraint Rules
- Mark uncertain information with "Insufficient reliable basis for conclusion"
- Reasoning steps must be numbered with brief titles for each step

## Output Format Specification
- Output only code with proper syntax highlighting
- Use JSON format for structured data, table format for comparison data
- Add docstrings before key functions
- Use brief inline comments for complex logic
- Label file name comments for multi-file outputs

## Fallback Logic
If the user's input is insufficient or exceeds the scope of knowledge, respond with:
"I'm sorry, based on the information provided, I cannot give a reliable answer. Please provide the following missing information: [list key missing information]"`,
    tips: `## Tuning Tips
- Temperature: 0.5 for consistent, focused code generation
- Max Tokens: 4096
- Top P: 0.95
- Estimated input: ~366 tokens
- For best results, specify the API endpoint, authentication method, and expected response format`,
  },

  'python-bug': {
    title: 'Analyze Python Code for Bugs, Performance Issues, and Security Risks with Improvement Suggestions',
    description: 'A prompt for analyzing Python code to identify potential bugs, performance bottlenecks, and security vulnerabilities, with actionable improvement suggestions and fixes.',
    content: `You are a senior Python developer with 10+ years of experience, dedicated to following SOLID principles and prioritizing code readability, security, and performance.

## Core Task
Analyze the following Python code and identify potential bugs, performance issues, and security risks. Provide improvement suggestions and corrected code.

## Input Boundaries
- Base analysis and responses strictly on the provided materials
- If the information provided is insufficient to make a judgment, clearly state "Insufficient reliable basis for conclusion"
- Do not fabricate or speculate on any unverified content

## Constraint Rules
- Mark uncertain information with "Insufficient reliable basis for conclusion"
- Reasoning steps must be numbered with brief titles for each step

## Output Format Specification
- Output only code with proper syntax highlighting
- Use JSON format for structured data, table format for comparison data
- Add docstrings before key functions
- Use brief inline comments for complex logic
- Label file name comments for multi-file outputs

## Fallback Logic
If the user's input is insufficient or exceeds the scope of knowledge, respond with:
"I'm sorry, based on the information provided, I cannot give a reliable answer. Please provide the following missing information: [list key missing information]"`,
    tips: `## Tuning Tips
- Temperature: 0.5 for focused, analytical results
- Max Tokens: 4096
- Top P: 0.95
- Estimated input: ~461 tokens
- For best results, provide complete code files with context rather than isolated snippets`,
  },

  'prompt-klatzmen': {
    title: 'Write an In-Depth Analysis Article on AI Development Trends for Tech Professionals',
    description: 'A prompt for crafting a comprehensive, professional yet accessible analysis article on artificial intelligence development trends, tailored for technology professionals.',
    content: `You are a senior copywriter and content strategist, skilled in platform content creation. You are proficient in PAS/AIDA/BAB copywriting frameworks and familiar with platform algorithm preferences and user psychology.

## Core Task
Write an in-depth analysis article on AI development trends, aimed at technology professionals, with a tone that is professional but not overly technical or obscure.

## Input Boundaries
- Base analysis and responses strictly on the provided materials
- If the information provided is insufficient to make a judgment, clearly state "Insufficient reliable basis for conclusion"
- Do not fabricate or speculate on any unverified content

## Constraint Rules
- Mark uncertain information with "Insufficient reliable basis for conclusion"
- Reasoning steps must be numbered with brief titles for each step

## Output Format Specification
- Use structured report format: core conclusion first, then detailed analysis, then actionable recommendations
- Use heading hierarchy for clear organization
- Bold key findings and important data points
- Include bullet points for key takeaways

## Fallback Logic
If the user's input is insufficient or exceeds the scope of knowledge, respond with:
"I'm sorry, based on the information provided, I cannot give a reliable answer. Please provide the following missing information: [list key missing information]"`,
    tips: `## Tuning Tips
- Temperature: 0.5 for balanced creativity and coherence
- Max Tokens: 4096
- Top P: 0.95
- Estimated input: ~443 tokens
- For best results, specify the target audience, article length, and any specific AI domains to focus on`,
  },

  'javascript': {
    title: 'Review JavaScript Code: Evaluate Readability, Performance, and Security with Refactoring Suggestions',
    description: 'A prompt for reviewing JavaScript code across readability, performance, and security dimensions, with structured refactoring recommendations.',
    content: `You are a senior JavaScript engineer with 10+ years of experience, dedicated to following SOLID principles and prioritizing code readability, security, and performance.

## Core Task
Review the following JavaScript code and evaluate it across three dimensions: readability, performance, and security. Provide refactoring suggestions for each dimension.

## Input Boundaries
- Base analysis and responses strictly on the provided materials
- If the information provided is insufficient to make a judgment, clearly state "Insufficient reliable basis for conclusion"
- Do not fabricate or speculate on any unverified content

## Constraint Rules
- Mark uncertain information with "Insufficient reliable basis for conclusion"
- Reasoning steps must be numbered with brief titles for each step

## Output Format Specification
- Output only code with proper syntax highlighting
- Add docstrings before key functions
- Use brief inline comments for complex logic
- Label file name comments for multi-file outputs

## Fallback Logic
If the user's input is insufficient or exceeds the scope of knowledge, respond with:
"I'm sorry, based on the information provided, I cannot give a reliable answer. Please provide the following missing information: [list key missing information]"`,
    tips: `## Tuning Tips
- Temperature: 0.5 for consistent, structured reviews
- Max Tokens: 4096
- Top P: 0.95
- For best results, provide the full JavaScript file or module with any related configuration`,
  },

  'sql-sql': {
    title: 'SQL Query Performance Optimization: Analyze Execution Plans and Provide Optimized SQL',
    description: 'A prompt for analyzing SQL query execution plans and providing performance optimization solutions with rewritten optimized queries.',
    content: `You are a senior SQL developer with 10+ years of experience, dedicated to following SOLID principles and prioritizing code readability, security, and performance.

## Core Task
Provide a performance optimization plan for the following SQL query. Analyze the execution plan and produce an optimized version of the SQL.

## Input Boundaries
- Base analysis and responses strictly on the provided materials
- If the information provided is insufficient to make a judgment, clearly state "Insufficient reliable basis for conclusion"
- Do not fabricate or speculate on any unverified content

## Constraint Rules
- Mark uncertain information with "Insufficient reliable basis for conclusion"
- Reasoning steps must be numbered with brief titles for each step

## Output Format Specification
- Use structured report format: core conclusion first, then detailed analysis, then actionable recommendations
- Use heading hierarchy for clear organization
- Bold key findings and important data points
- Include the optimized SQL with proper syntax highlighting

## Fallback Logic
If the user's input is insufficient or exceeds the scope of knowledge, respond with:
"I'm sorry, based on the information provided, I cannot give a reliable answer. Please provide the following missing information: [list key missing information]"`,
    tips: `## Tuning Tips
- Temperature: 0.5 for precise, analytical results
- Max Tokens: 4096
- Top P: 0.95
- Estimated input: ~410 tokens
- For best results, include the full query, EXPLAIN output, table schemas, and index definitions`,
  },

  'react': {
    title: 'Generate Complete React Component Unit Tests Covering Normal, Error, and Edge Cases',
    description: 'A prompt for generating comprehensive React component unit tests that cover normal execution paths, error handling paths, and boundary conditions.',
    content: `You are a senior TypeScript developer with 10+ years of experience, dedicated to following SOLID principles and prioritizing code readability, security, and performance.

## Core Task
Generate complete unit tests for the React component, covering normal execution paths, error handling paths, and boundary/edge case conditions.

## Input Boundaries
- Base analysis and responses strictly on the provided materials
- If the information provided is insufficient to make a judgment, clearly state "Insufficient reliable basis for conclusion"
- Do not fabricate or speculate on any unverified content

## Constraint Rules
- Mark uncertain information with "Insufficient reliable basis for conclusion"
- Reasoning steps must be numbered with brief titles for each step

## Output Format Specification
- Use clear structured formatting for test organization
- Use proper syntax highlighting for code blocks
- Prefer JSON for structured data, tables for comparison data
- Group tests logically: normal paths, error paths, edge cases

## Fallback Logic
If the user's input is insufficient or exceeds the scope of knowledge, respond with:
"I'm sorry, based on the information provided, I cannot give a reliable answer. Please provide the following missing information: [list key missing information]"`,
    tips: `## Tuning Tips
- Temperature: 0.5 for consistent, thorough test generation
- Max Tokens: 4096
- Top P: 0.95
- Estimated input: ~361 tokens
- For best results, provide the full React component source code, props interfaces, and any custom hooks used`,
  },
};

export async function POST(request: NextRequest) {
  try {
    // ---- Security check ----
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    if (secret !== MIGRATION_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized. Provide ?secret=<key>' },
        { status: 401 }
      );
    }

    const supabase = createAdminClient();
    const chineseRegex = /[一-鿿]/;

    // ---- 1. Find all Chinese prompts ----
    const { data: allPrompts, error: queryError } = await supabase
      .from('prompts')
      .select('*')
      .eq('is_published', true);

    if (queryError) {
      return NextResponse.json(
        { error: 'Failed to query prompts', detail: queryError.message },
        { status: 500 }
      );
    }

    const chinesePrompts = (allPrompts || []).filter(
      (p: { title?: string; description?: string; content?: string; tips?: string }) =>
        chineseRegex.test(p.title || '') ||
        chineseRegex.test(p.description || '') ||
        chineseRegex.test(p.content || '') ||
        chineseRegex.test(p.tips || '')
    );

    if (chinesePrompts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No Chinese prompts found. Database is already clean!',
        translated: 0,
      });
    }

    // ---- 2. Translate each prompt ----
    const results: Array<{ id: number; slug: string; method: string; title: string }> = [];
    let success = 0;
    let failed = 0;

    for (const prompt of chinesePrompts) {
      const known = KNOWN_TRANSLATIONS[prompt.slug];
      let translation;

      if (known) {
        translation = {
          title: known.title,
          description: known.description,
          content: known.content,
          tips: known.tips,
        };
        results.push({ id: prompt.id, slug: prompt.slug, method: 'hand-crafted', title: known.title });
      } else {
        // Skip unknown Chinese prompts — they need manual review
        results.push({ id: prompt.id, slug: prompt.slug, method: 'skipped-needs-review', title: prompt.title });
        continue;
      }

      const { error: updateError } = await supabase
        .from('prompts')
        .update({
          title: translation.title,
          description: translation.description,
          content: translation.content,
          tips: translation.tips || prompt.tips,
          updated_at: new Date().toISOString(),
        })
        .eq('id', prompt.id);

      if (updateError) {
        failed++;
        results[results.length - 1].method = 'failed';
      } else {
        success++;
      }
    }

    return NextResponse.json({
      success: true,
      totalChinesePrompts: chinesePrompts.length,
      translated: success,
      failed,
      details: results,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Unexpected error', detail: String(err) },
      { status: 500 }
    );
  }
}

// ---- DELETE: Remove all Chinese prompts ----
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    if (secret !== MIGRATION_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized. Provide ?secret=<key>' },
        { status: 401 }
      );
    }

    const supabase = createAdminClient();
    const chineseRegex = /[一-鿿]/;

    // Find all Chinese prompts
    const { data: allPrompts, error: queryError } = await supabase
      .from('prompts')
      .select('*')
      .eq('is_published', true);

    if (queryError) {
      return NextResponse.json(
        { error: 'Failed to query prompts', detail: queryError.message },
        { status: 500 }
      );
    }

    const chinesePrompts = (allPrompts || []).filter(
      (p: { title?: string; description?: string; content?: string; tips?: string }) =>
        chineseRegex.test(p.title || '') ||
        chineseRegex.test(p.description || '') ||
        chineseRegex.test(p.content || '') ||
        chineseRegex.test(p.tips || '')
    );

    if (chinesePrompts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No Chinese prompts found.',
        deleted: 0,
      });
    }

    // Delete all Chinese prompts
    const ids = chinesePrompts.map((p: { id: number }) => p.id);
    let deleted = 0;
    let failed = 0;

    for (const id of ids) {
      const { error: deleteError } = await supabase
        .from('prompts')
        .delete()
        .eq('id', id);

      if (deleteError) {
        failed++;
      } else {
        deleted++;
      }
    }

    return NextResponse.json({
      success: true,
      totalChinesePrompts: chinesePrompts.length,
      deleted,
      failed,
      message: `Deleted ${deleted} Chinese prompts (${failed} failed)`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Unexpected error', detail: String(err) },
      { status: 500 }
    );
  }
}
