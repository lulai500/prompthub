'use client';
// ============================================================
// 提交流（三支柱分流）
// Prompt / Skill / Workflow 三类资产，各自专属字段
// 提交后 is_published=false（待管理员审核发布）
// ============================================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Send,
  Loader2,
  Plus,
  X,
  ArrowLeft,
  LogIn,
  MessageSquareText,
  Wrench,
  GitBranch,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { slugify } from '@/lib/utils';
import type { Category, SkillCategory, WorkflowCategory } from '@/types';

type AssetType = 'prompt' | 'skill' | 'workflow';

const TYPE_OPTIONS: { id: AssetType; label: string; icon: any; desc: string }[] = [
  { id: 'prompt', label: 'Prompt', icon: MessageSquareText, desc: 'A tested prompt text' },
  { id: 'skill', label: 'Skill', icon: Wrench, desc: 'An installable skill (Claude Skill, Cursor Rules…)' },
  { id: 'workflow', label: 'Workflow', icon: GitBranch, desc: 'A multi-step workflow' },
];

export default function SubmitPage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<any>(null);
  const [checking, setChecking] = useState(true);

  // 资产类型 + 各分类
  const [type, setType] = useState<AssetType>('prompt');
  const [promptCats, setPromptCats] = useState<Category[]>([]);
  const [skillCats, setSkillCats] = useState<SkillCategory[]>([]);
  const [workflowCats, setWorkflowCats] = useState<WorkflowCategory[]>([]);

  // 通用字段
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Prompt 专属
  const [modelName, setModelName] = useState('');
  const [tips, setTips] = useState('');
  const [exampleOutput, setExampleOutput] = useState('');

  // Skill 专属
  const [skillFormat, setSkillFormat] = useState('claude-skill');
  const [compatibleModels, setCompatibleModels] = useState('');
  const [installInstructions, setInstallInstructions] = useState('');

  // Workflow 专属
  const [workflowType, setWorkflowType] = useState('agent-orchestration');
  const [toolsRequired, setToolsRequired] = useState('');
  const [stepsJson, setStepsJson] = useState('');
  const [configContent, setConfigContent] = useState('');
  const [expectedOutput, setExpectedOutput] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const { data: sessionData } = await supabase.auth.getSession();
    setUser(sessionData.session?.user || null);

    // 读取 Fork 预填数据（从详情页"Fork & remix"进入）
    try {
      const forkRaw = sessionStorage.getItem('fork-data');
      if (forkRaw) {
        const d = JSON.parse(forkRaw);
        if (d && d.type) {
          setType(d.type);
          setTitle(d.title || '');
          setDescription(d.description || '');
          setContent(d.content || '');
          if (d.type === 'prompt') {
            setModelName(d.model_name || '');
            setTips(d.tips || '');
          }
          if (d.type === 'skill') {
            setSkillFormat(d.skill_format || 'claude-skill');
            setCompatibleModels(d.compatible_models || '');
            setInstallInstructions(d.install_instructions || '');
            setExampleOutput(d.example_output || '');
          }
          if (d.type === 'workflow') {
            setWorkflowType(d.workflow_type || 'agent-orchestration');
            setToolsRequired(d.tools_required || '');
            setStepsJson(d.steps || '');
            setConfigContent(d.config_content || '');
            setExpectedOutput(d.expected_output || '');
            setTips(d.tips || '');
          }
        }
        sessionStorage.removeItem('fork-data');
      }
    } catch {
      // sessionStorage 不可用时忽略
    }

    // 并行加载三类分类
    const [pc, sc, wc] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('skill_categories').select('*').order('sort_order'),
      supabase.from('workflow_categories').select('*').order('sort_order'),
    ]);
    setPromptCats(pc.data || []);
    setSkillCats(sc.data || []);
    setWorkflowCats(wc.data || []);

    setChecking(false);
  }

  function switchType(t: AssetType) {
    setType(t);
    setCategoryId('');
    setError('');
  }

  function addTag() {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag) && tags.length < 8) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  }
  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }
  function handleTagKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!user) {
      setError('You must be signed in to submit.');
      return;
    }
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required.');
      return;
    }

    // Workflow 的 steps 必须是合法 JSON
    if (type === 'workflow' && stepsJson.trim()) {
      try {
        JSON.parse(stepsJson);
      } catch {
        setError('Steps must be valid JSON (an array of step objects).');
        return;
      }
    }

    setSubmitting(true);
    const slug = slugify(title.trim());
    const base = {
      title: title.trim(),
      slug,
      description: description.trim() || null,
      tags,
      author_id: user.id,
      is_published: false, // 待审核
    };

    let insertError: { message?: string } | null = null;

    if (type === 'prompt') {
      const { error } = await supabase.from('prompts').insert({
        ...base,
        content: content.trim(),
        category_id: categoryId ? parseInt(categoryId) : null,
        model_name: modelName.trim() || null,
        tips: tips.trim() || null,
        example_output: exampleOutput.trim() || null,
      });
      insertError = error;
    } else if (type === 'skill') {
      const { error } = await supabase.from('skills').insert({
        ...base,
        content: content.trim(),
        skill_format: skillFormat,
        compatible_models: compatibleModels
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        install_instructions: installInstructions.trim() || null,
        example_output: exampleOutput.trim() || null,
        category_id: categoryId ? parseInt(categoryId) : null,
      });
      insertError = error;
    } else {
      const { error } = await supabase.from('workflows').insert({
        ...base,
        description: description.trim() || null,
        steps: stepsJson.trim() ? JSON.parse(stepsJson) : [],
        workflow_type: workflowType,
        tools_required: toolsRequired
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        config_content: configContent.trim() || null,
        expected_output: expectedOutput.trim() || null,
        tips: tips.trim() || null,
        category_id: categoryId ? parseInt(categoryId) : null,
      });
      insertError = error;
    }

    if (insertError) {
      setError(insertError.message || 'Submission failed. Please try again.');
      setSubmitting(false);
      return;
    }

    const listPath = type === 'prompt' ? '/prompts' : type === 'skill' ? '/skills' : '/workflows';
    router.push(`${listPath}?submitted=1`);
    router.refresh();
  }

  // ---- 未登录 / 加载中 ----
  if (checking) {
    return (
      <div className="container-page py-20 text-center">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto" />
      </div>
    );
  }
  if (!user) {
    return (
      <div className="container-page py-20">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Sign in to Submit</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            You need to be signed in to share prompts, skills, or workflows with the community.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/auth/login" className="btn-primary">
              <LogIn className="w-4 h-4" /> Sign In
            </Link>
            <Link href="/auth/register" className="btn-secondary">Create Account</Link>
          </div>
        </div>
      </div>
    );
  }

  // ---- 分类下拉 ----
  const currentCats = type === 'prompt' ? promptCats : type === 'skill' ? skillCats : workflowCats;

  return (
    <div className="container-page py-10">
      <Link
        href="/prompts"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-brand-600 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Share with the Community
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mb-6">
          Contribute a prompt, skill, or workflow. Submissions are reviewed before publishing.
        </p>

        {/* 资产类型选择 */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {TYPE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = type === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => switchType(opt.id)}
                className={`p-3 rounded-xl border text-center transition-all ${
                  active
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 ring-1 ring-brand-500'
                    : 'border-slate-200 dark:border-dark-700 hover:border-brand-300'
                }`}
              >
                <Icon className={`w-5 h-5 mx-auto mb-1 ${active ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'}`} />
                <p className="text-sm font-medium text-slate-900 dark:text-white">{opt.label}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{opt.desc}</p>
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* 标题 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={type === 'prompt' ? 'e.g. Python Code Reviewer' : type === 'skill' ? 'e.g. Video Script Writer' : 'e.g. Blog Pipeline'}
              className="input"
              required
              maxLength={200}
            />
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Briefly describe what this asset does and when to use it..."
              className="input min-h-[70px]"
              rows={3}
              maxLength={500}
            />
          </div>

          {/* 内容（核心文本） */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              {type === 'prompt' ? 'Prompt Content' : type === 'skill' ? 'Skill Content (SKILL.md body)' : 'Description / Overview'}
              <span className="text-red-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                type === 'skill'
                  ? '---\nname: my-skill\ndescription: ...\n---\n\nInstructions...'
                  : type === 'workflow'
                  ? 'What does this workflow do? What is it for?'
                  : 'Paste or write your full prompt here...'
              }
              className="input min-h-[200px] font-mono text-sm"
              rows={10}
              required
              maxLength={50000}
            />
          </div>

          {/* 分类 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="input"
            >
              <option value="">Select a category...</option>
              {currentCats.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* ---- Prompt 专属字段 ---- */}
          {type === 'prompt' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Compatible Model
                </label>
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="e.g. GPT-4 / Claude 3.5"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Tuning Tips
                </label>
                <textarea
                  value={tips}
                  onChange={(e) => setTips(e.target.value)}
                  placeholder="## Recommended Settings&#10;- Temperature: 0.7&#10;&#10;## Tips&#10;- ..."
                  className="input min-h-[90px] font-mono text-sm"
                  rows={5}
                />
              </div>
            </>
          )}

          {/* ---- Skill 专属字段 ---- */}
          {type === 'skill' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Skill Format
                </label>
                <select value={skillFormat} onChange={(e) => setSkillFormat(e.target.value)} className="input">
                  {['claude-skill', 'claude-code', 'cursor-rules', 'codex', 'gpt-actions', 'gemini-extension', 'cross-model', 'tool-server'].map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Compatible Models (comma-separated)
                </label>
                <input
                  type="text"
                  value={compatibleModels}
                  onChange={(e) => setCompatibleModels(e.target.value)}
                  placeholder="Claude 3.7 Sonnet, GPT-4o"
                  className="input"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Install Instructions
                </label>
                <textarea
                  value={installInstructions}
                  onChange={(e) => setInstallInstructions(e.target.value)}
                  placeholder="How to install this skill (folders, commands)..."
                  className="input min-h-[80px] font-mono text-sm"
                  rows={4}
                />
              </div>
            </div>
          )}

          {/* ---- Workflow 专属字段 ---- */}
          {type === 'workflow' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Workflow Type
                  </label>
                  <select value={workflowType} onChange={(e) => setWorkflowType(e.target.value)} className="input">
                    {['agent-orchestration', 'automation-template', 'dev-scaffold'].map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Tools Required (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={toolsRequired}
                    onChange={(e) => setToolsRequired(e.target.value)}
                    placeholder="Claude, n8n, Make"
                    className="input"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Steps (JSON array)
                </label>
                <textarea
                  value={stepsJson}
                  onChange={(e) => setStepsJson(e.target.value)}
                  placeholder='[{"step":1,"title":"Research","tool":"Claude","action":"Gather sources"}]'
                  className="input min-h-[100px] font-mono text-xs"
                  rows={5}
                />
                <p className="text-xs text-slate-400 mt-1">
                  Each step: {"{ \"step\": 1, \"title\": \"...\", \"tool\": \"...\", \"action\": \"...\" }"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Configuration (optional)
                </label>
                <textarea
                  value={configContent}
                  onChange={(e) => setConfigContent(e.target.value)}
                  placeholder="Config, DSL, or import JSON..."
                  className="input min-h-[70px] font-mono text-sm"
                  rows={4}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Expected Output
                </label>
                <textarea
                  value={expectedOutput}
                  onChange={(e) => setExpectedOutput(e.target.value)}
                  placeholder="What the workflow produces when run..."
                  className="input min-h-[70px]"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* 示例输出（Prompt/Skill 共用） */}
          {type !== 'workflow' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Example Output
              </label>
              <textarea
                value={exampleOutput}
                onChange={(e) => setExampleOutput(e.target.value)}
                placeholder="Paste an example of what the AI outputs when using this. Helps others see its value."
                className="input min-h-[100px] font-mono text-sm"
                rows={5}
              />
            </div>
          )}

          {/* 标签 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Tags</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Add a tag and press Enter..."
                className="input flex-1"
              />
              <button type="button" onClick={addTag} className="btn-secondary">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-slate-400 mt-1">Up to 8 tags. Press Enter or comma to add.</p>
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full py-3 text-base">
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> Submit {type === 'prompt' ? 'Prompt' : type === 'skill' ? 'Skill' : 'Workflow'}
              </>
            )}
          </button>
          <p className="text-center text-xs text-slate-400">
            Submissions are reviewed by the team before being published.
          </p>
        </form>
      </div>
    </div>
  );
}
