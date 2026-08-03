'use client';
// ============================================================
// 技能多格式导出
// 一份技能 → Claude Skill / Cursor Rules / Codex / Claude Code
// 支持复制与下载（"Tested once, install anywhere"）
// ============================================================

import { useState } from 'react';
import { Copy, Check, Download, Boxes } from 'lucide-react';
import {
  toClaudeSkill,
  toCursorRule,
  toCodexEntry,
  toClaudeCodeNotes,
  type SkillLike,
} from '@/lib/skill-formats';
import { copyToClipboard } from '@/lib/utils';

const TABS: { id: string; label: string; filename: string; gen: (s: SkillLike) => string }[] = [
  { id: 'claude', label: 'Claude Skill', filename: 'SKILL.md', gen: toClaudeSkill },
  { id: 'cursor', label: 'Cursor Rules', filename: '.mdc', gen: toCursorRule },
  { id: 'codex', label: 'Codex', filename: '.md', gen: toCodexEntry },
  { id: 'cc', label: 'Claude Code', filename: '-install.md', gen: toClaudeCodeNotes },
];

export default function SkillFormatExport({ skill }: { skill: SkillLike }) {
  const [tab, setTab] = useState('claude');
  const [copied, setCopied] = useState(false);

  const active = TABS.find((t) => t.id === tab)!;
  const output = active.gen(skill);

  async function handleCopy() {
    const ok = await copyToClipboard(output);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleDownload() {
    const blob = new Blob([output], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${skill.slug || 'skill'}${active.filename}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="card p-6 mt-6">
      <div className="flex items-center gap-2 mb-1">
        <Boxes className="w-5 h-5 text-brand-500" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Export in other formats
        </h2>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Tested once, install anywhere — the same skill adapted to your tool.
      </p>

      {/* 格式标签 */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === t.id
                ? 'bg-brand-600 text-white'
                : 'bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-dark-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 预览 */}
      <pre className="p-4 rounded-xl bg-slate-950 dark:bg-dark-950 border border-slate-800 overflow-x-auto max-h-80 overflow-y-auto">
        <code className="text-xs text-slate-200 whitespace-pre-wrap font-mono leading-relaxed">
          {output}
        </code>
      </pre>

      {/* 操作 */}
      <div className="flex items-center gap-2 mt-3">
        <button onClick={handleCopy} disabled={copied} className="btn-primary text-sm">
          {copied ? (
            <>
              <Check className="w-4 h-4" /> Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" /> Copy
            </>
          )}
        </button>
        <button onClick={handleDownload} className="btn-secondary text-sm">
          <Download className="w-4 h-4" /> Download
        </button>
      </div>
    </div>
  );
}
