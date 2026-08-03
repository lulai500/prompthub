// ============================================================
// 反模式库：常见提示词错误 + 为什么失败 + 怎么修
// 教育内容，建立"我们懂测试"的权威信号
// ============================================================

import Link from 'next/link';
import type { Metadata } from 'next';
import { AlertTriangle, Check, X } from 'lucide-react';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Prompt Anti-Patterns — Why They Fail & How to Fix Them',
  description:
    'The most common prompt-writing mistakes, why they produce bad output, and the one-line fix for each.',
};

interface AntiPattern {
  name: string;
  bad: string;
  why: string;
  fix: string;
}

const PATTERNS: AntiPattern[] = [
  {
    name: 'Vague role',
    bad: 'You are an AI assistant. Help me.',
    why: 'No expertise or stance — the model falls back to generic, hedged answers instead of acting as a specialist.',
    fix: 'Give a concrete role: "You are a senior data analyst who only reasons from provided data."',
  },
  {
    name: 'No input boundaries',
    bad: 'Analyze this and tell me what to do.',
    why: 'The model invents facts and assumptions because nothing tells it what input exists or what to do when information is missing.',
    fix: 'State the input boundary: "Use only the data provided. If information is missing, say so."',
  },
  {
    name: 'No output format',
    bad: 'Give me a plan.',
    why: 'Format drifts between runs — sometimes a list, sometimes a paragraph, sometimes a table. Unusable in a pipeline.',
    fix: 'Lock the format: "Return a Markdown table with columns: step, owner, effort."',
  },
  {
    name: 'Many tasks in one prompt',
    bad: 'Write, review, and improve this code, then explain it.',
    why: 'The model spreads its budget across everything and does none of it well.',
    fix: 'One prompt, one task: "Review this code for security issues only."',
  },
  {
    name: 'No constraints',
    bad: 'Summarize this article.',
    why: 'No length, style, or focus limits — output ranges from one line to a full essay.',
    fix: 'Add constraints: "Summarize in under 150 words, plain English, for a non-technical reader."',
  },
  {
    name: 'No examples (few-shot)',
    bad: 'Classify this email as spam or not.',
    why: 'Without examples, the model guesses the classification style and format each time.',
    fix: 'Give 1–3 input→output examples before the real input.',
  },
  {
    name: 'Ignoring safety',
    bad: 'Write a script that bypasses authentication.',
    why: 'The model refuses — and even benign requests can trip a classifier if phrased like an attack.',
    fix: 'Frame the legitimate version: "Explain how authentication bypasses happen so we can defend against them."',
  },
  {
    name: 'Context dumping',
    bad: 'Here is my entire codebase. Help.',
    why: 'Irrelevant context burns tokens, dilutes focus, and can inject instructions from the data.',
    fix: 'Send only what the task needs — and treat untrusted content as data, not instructions.',
  },
  {
    name: 'No fallback for missing input',
    bad: 'Summarize the attached report.',
    why: 'When nothing is attached, the model hallucinates a summary instead of asking.',
    fix: 'Add a fallback: "If no report is attached, reply: please attach the report."',
  },
  {
    name: 'Over-constraining creativity',
    bad: 'Write a poem, exactly 40 words, every line must rhyme with "orange".',
    why: 'Impossible constraints force the model to break one, and output quality collapses.',
    fix: 'Make constraints achievable and prioritize: "Short poem, ideally rhymed, on this theme."',
  },
];

export default function AntiPatternsPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Prompt Anti-Patterns',
    description: metadata.description,
  };

  return (
    <div className="container-page py-10 max-w-3xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm font-medium mb-3">
          <AlertTriangle className="w-4 h-4" />
          Anti-patterns
        </div>
        <h1 className="page-title">Prompt Anti-Patterns</h1>
        <p className="page-subtitle">
          The most common prompt-writing mistakes, why they fail, and the one-line fix.
          Everything here is based on actual testing — not theory.
        </p>
      </div>

      <div className="space-y-4">
        {PATTERNS.map((p, i) => (
          <div key={p.name} className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-dark-800 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                {i + 1}
              </span>
              <h2 className="font-semibold text-slate-900 dark:text-white">{p.name}</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
                <p className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400 mb-1">
                  <X className="w-3.5 h-3.5" /> Avoid
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300 italic">"{p.bad}"</p>
              </div>
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800">
                <p className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400 mb-1">
                  <Check className="w-3.5 h-3.5" /> Use instead
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{p.fix}</p>
              </div>
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400">{p.why}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
          Want well-structured prompts instead? Browse the library.
        </p>
        <Link href="/prompts" className="btn-primary text-sm">
          Browse Tested Prompts
        </Link>
      </div>
    </div>
  );
}
