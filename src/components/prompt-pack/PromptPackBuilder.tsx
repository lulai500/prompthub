'use client';
// ============================================================
// 提示词包生成器（客户端核心组件）
// 表单 → 实时生成 4 模型版本 → 预览/复制/下载 → 一键发布入库
// 发布遵循 /submit 模式：is_published=false 待管理员审核
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Package,
  Copy,
  Check,
  Download,
  Send,
  Loader2,
  Plus,
  Trash2,
  LogIn,
  Sparkles,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { slugify } from '@/lib/utils';
import {
  DOMAIN_TEMPLATES,
  MODEL_LIST,
  buildPublishMeta,
  renderPrompt,
  type ModelName,
  type PackInput,
} from '@/lib/prompt-pack';

const ROLE_PRESETS: Record<string, string[]> = {
  编程: [
    '10年经验的Python后端专家',
    '精通FastAPI与微服务的资深架构师',
    '资深前端工程师（React/TypeScript）',
  ],
  营销: [
    '头部MCN内容总监，擅长情绪价值驱动转化',
    '小红书生态资深操盘手',
    '10年经验的品牌营销专家',
  ],
  法务: ['资深合规顾问', '企业法务总监，专注合同风险管理', '专业知识产权律师'],
};

export default function PromptPackBuilder() {
  const router = useRouter();
  const supabase = createClient();

  // ---------- 表单状态 ----------
  const [domain, setDomain] = useState<string>('编程');
  const [packName, setPackName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [goal, setGoal] = useState('');
  const [context, setContext] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [selectedModels, setSelectedModels] = useState<ModelName[]>([...MODEL_LIST]);
  const [activeModel, setActiveModel] = useState<ModelName>('GPT');

  // ---------- 发布状态 ----------
  const [user, setUser] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [showPublish, setShowPublish] = useState(false);
  const [categoryId, setCategoryId] = useState<number>(4);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // 切换领域：重置变量为领域建议变量
  function switchDomain(d: string) {
    setDomain(d);
    const suggested = DOMAIN_TEMPLATES[d].suggested_variables;
    setVariables(Object.fromEntries(suggested.map((k) => [k, ''])));
    setRoleDesc(ROLE_PRESETS[d][0] || '');
  }

  useEffect(() => {
    const init = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      setUser(sessionData.session?.user || null);
      setChecking(false);
    };
    init();
    setVariables(Object.fromEntries(DOMAIN_TEMPLATES[domain].suggested_variables.map((k) => [k, ''])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 生成输入（role_desc 为空时用占位，保证预览可用）
  const packInput: PackInput = useMemo(
    () => ({
      domain,
      pack_name: packName.trim() || '未命名提示词包',
      role_desc: roleDesc.trim() || '资深领域专家',
      goal: goal.trim() || '达成专业输出',
      context,
      variables,
    }),
    [domain, packName, roleDesc, goal, context, variables]
  );

  // 各模型渲染结果（选中才渲染）
  const rendered = useMemo(() => {
    const map: Partial<Record<ModelName, string>> = {};
    for (const m of selectedModels) map[m] = renderPrompt(m, packInput);
    return map;
  }, [selectedModels, packInput]);

  // ---------- 交互 ----------
  function toggleModel(m: ModelName) {
    setSelectedModels((prev) => {
      const next = prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m];
      if (next.length === 0) return prev; // 至少保留一个
      return next;
    });
  }

  function setVariable(key: string, value: string) {
    setVariables((prev) => ({ ...prev, [key]: value }));
  }

  function addVariable() {
    setVariables((prev) => ({ ...prev, ['']: '' }));
  }

  function removeVariable(key: string) {
    setVariables((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function renameVariable(oldKey: string, newKey: string) {
    setVariables((prev) => {
      const next = { ...prev };
      const val = next[oldKey];
      delete next[oldKey];
      next[newKey] = val;
      return next;
    });
  }

  async function handleCopy() {
    const text = rendered[activeModel];
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleDownload() {
    const text = rendered[activeModel];
    if (!text) return;
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${packInput.pack_name.replace(/[\\/:*?"<>|]/g, '_')}_${activeModel}_prompt.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function openPublish() {
    setError('');
    if (!packName.trim() || !goal.trim()) {
      setError('请先填写包名与终极目标。');
      return;
    }
    setCategoryId(buildPublishMeta(packInput, activeModel).category_id);
    setShowPublish(true);
  }

  async function handlePublish() {
    setPublishing(true);
    setError('');
    try {
      const meta = buildPublishMeta(packInput, activeModel);
      const title = packName.trim();
      const slug = slugify(title) || null; // 中文标题 → null（UNIQUE 列 NULL 不冲突）
      const { data, error: insertError } = await supabase
        .from('prompts')
        .insert({
          title,
          slug,
          description: meta.description,
          content: rendered[activeModel],
          category_id: categoryId,
          author_id: user.id,
          model_name: activeModel,
          tips: meta.tips,
          tags: meta.tags,
          is_published: false, // 待审核
        })
        .select('id')
        .single();

      if (insertError) throw new Error(insertError.message);
      setShowPublish(false);
      router.push(`/prompts/${data.id}`);
    } catch (e: any) {
      setError(e.message || '发布失败，请重试。');
      setPublishing(false);
    }
  }

  // ---------- 渲染 ----------
  const inputCls =
    'w-full px-3 py-2 rounded-lg text-sm bg-slate-100 dark:bg-dark-800 border border-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white dark:focus:bg-dark-700 transition-all';
  const labelCls = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';

  return (
    <div className="container-page py-10">
      {/* 页头 */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 mb-2">
          <Package className="w-5 h-5" />
          <span className="text-sm font-medium">Prompt Pack Generator</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          专业提示词包生成器
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
          基于《AI提示词包工程化白皮书》五层架构（元角色 / 上下文 / 认知链路 /
          输出约束 / 动态变量），一次生成适配{' '}
          <span className="font-medium text-slate-800 dark:text-slate-200">
            GPT、Claude、Gemini、DeepSeek
          </span>{' '}
          的跨模型专业提示词包。
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6 items-start">
        {/* ===== 左侧：表单 ===== */}
        <div className="lg:col-span-2 space-y-5">
          {/* 领域 */}
          <div>
            <label className={labelCls}>领域（决定思维链与约束）</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(DOMAIN_TEMPLATES).map(([d, t]) => (
                <button
                  key={d}
                  onClick={() => switchDomain(d)}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                    domain === d
                      ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                      : 'bg-white dark:bg-dark-800 border-slate-200 dark:border-dark-700 text-slate-600 dark:text-slate-300 hover:border-brand-400'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {DOMAIN_TEMPLATES[domain].description}
            </p>
          </div>

          {/* 包名 */}
          <div>
            <label className={labelCls}>提示词包名称</label>
            <input
              className={inputCls}
              placeholder="如：用户登录API模块"
              value={packName}
              onChange={(e) => setPackName(e.target.value)}
            />
          </div>

          {/* 角色 */}
          <div>
            <label className={labelCls}>专家角色描述（L1 元角色）</label>
            <input
              className={inputCls}
              placeholder="如：10年经验的Python后端专家"
              value={roleDesc}
              onChange={(e) => setRoleDesc(e.target.value)}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ROLE_PRESETS[domain].map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleDesc(r)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                    roleDesc === r
                      ? 'bg-brand-50 dark:bg-brand-900/30 border-brand-300 dark:border-brand-700 text-brand-700 dark:text-brand-300'
                      : 'bg-white dark:bg-dark-800 border-slate-200 dark:border-dark-700 text-slate-500 dark:text-slate-400 hover:border-brand-400'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* 目标 */}
          <div>
            <label className={labelCls}>终极目标（SMART）</label>
            <input
              className={inputCls}
              placeholder="如：生成符合规范的高性能认证API"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            />
          </div>

          {/* 上下文 */}
          <div>
            <label className={labelCls}>
              上下文 / 知识库（L2，可选，将注入
              <code className="mx-1 px-1 py-0.5 rounded bg-slate-200 dark:bg-dark-700 text-xs">
                {'<<<BEGIN_CONTEXT>>>'}
              </code>
              之间）
            </label>
            <textarea
              className={inputCls + ' min-h-[80px] resize-y'}
              placeholder="如：技术栈 FastAPI + PostgreSQL；已存在用户表 users(id, email)..."
              value={context}
              onChange={(e) => setContext(e.target.value)}
            />
          </div>

          {/* 变量 */}
          <div>
            <label className={labelCls}>动态变量槽位（L5，{`{{变量}}`} 占位符）</label>
            <div className="space-y-2">
              {Object.entries(variables).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2">
                  <input
                    className={inputCls + ' w-2/5 font-mono'}
                    placeholder="变量名"
                    value={k}
                    onChange={(e) => renameVariable(k, e.target.value)}
                  />
                  <input
                    className={inputCls + ' flex-1'}
                    placeholder="示例值（可留空）"
                    value={v}
                    onChange={(e) => setVariable(k, e.target.value)}
                  />
                  <button
                    onClick={() => removeVariable(k)}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    aria-label="删除变量"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addVariable}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-900/30 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              添加变量
            </button>
          </div>

          {/* 模型多选 */}
          <div>
            <label className={labelCls}>目标模型</label>
            <div className="flex flex-wrap gap-2">
              {MODEL_LIST.map((m) => (
                <button
                  key={m}
                  onClick={() => toggleModel(m)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                    selectedModels.includes(m)
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white dark:bg-dark-800 border-slate-200 dark:border-dark-700 text-slate-500 dark:text-slate-400 hover:border-brand-400'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ===== 右侧：预览 ===== */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-slate-200 dark:border-dark-700 bg-white dark:bg-dark-800 shadow-sm overflow-hidden">
            {/* 工具栏 */}
            <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-dark-700">
              <div className="flex items-center gap-1">
                {selectedModels.map((m) => (
                  <button
                    key={m}
                    onClick={() => setActiveModel(m)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      activeModel === m
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-700'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <div className="flex-1" />
              <button
                onClick={handleCopy}
                className="btn-ghost text-sm"
                title="复制全文"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copied ? '已复制' : '复制'}
              </button>
              <button onClick={handleDownload} className="btn-ghost text-sm" title="下载 .md">
                <Download className="w-4 h-4" />
                下载
              </button>
            </div>

            {/* 预览内容 */}
            <pre className="max-h-[560px] overflow-auto p-5 text-[13px] leading-relaxed font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words">
              {rendered[activeModel] || ''}
            </pre>

            {/* 发布区 */}
            <div className="px-4 py-3 border-t border-slate-200 dark:border-dark-700 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Sparkles className="w-3.5 h-3.5" />
                当前预览：{activeModel} 版本 · 发布时以此版本入库
              </div>
              <div className="flex-1" />
              {checking ? (
                <div className="w-24 h-9 rounded-lg bg-slate-200 dark:bg-dark-700 animate-pulse" />
              ) : user ? (
                <button
                  onClick={openPublish}
                  className="btn-primary text-sm"
                  disabled={publishing}
                >
                  <Send className="w-4 h-4" />
                  发布到提示词库
                </button>
              ) : (
                <Link href="/auth/login" className="btn-primary text-sm">
                  <LogIn className="w-4 h-4" />
                  Sign in 后发布
                </Link>
              )}
            </div>
          </div>

          {/* 桌面工具提示 */}
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 dark:border-dark-600 px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
            💡 需要 <span className="font-medium">多提示词分步包</span>（N 份独立提示词按流程分步执行）？
            请使用桌面版工具：<code className="mx-1 px-1 py-0.5 rounded bg-slate-100 dark:bg-dark-700">
              prompt_multi_pack_generator.py
            </code>{' '}
            或 提示词包工作台.bat。
          </div>
        </div>
      </div>

      {/* ===== 发布确认弹层 ===== */}
      {showPublish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowPublish(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-dark-800 rounded-2xl shadow-2xl p-6 animate-fade-in">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              发布到提示词库
            </h3>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>标题</label>
                <input className={inputCls} value={packName} readOnly />
              </div>
              <div>
                <label className={labelCls}>描述（自动生成）</label>
                <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-dark-700 rounded-lg px-3 py-2">
                  {buildPublishMeta(packInput, activeModel).description}
                </p>
              </div>
              <div>
                <label className={labelCls}>分类</label>
                <select
                  className={inputCls}
                  value={categoryId}
                  onChange={(e) => setCategoryId(parseInt(e.target.value))}
                >
                  <option value={1}>Code Prompt</option>
                  <option value={2}>Novel Writing</option>
                  <option value={3}>Agent LLM</option>
                  <option value={4}>General Prompt</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>入库版本</label>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {activeModel} · tags: {buildPublishMeta(packInput, activeModel).tags.join(', ')}
                </p>
              </div>
              {error && (
                <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
              <p className="text-xs text-slate-500 dark:text-slate-400">
                发布后进入待审核队列（is_published=false），管理员审核通过后公开可见。
              </p>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setShowPublish(false)} className="btn-ghost text-sm">
                取消
              </button>
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="btn-primary text-sm"
              >
                {publishing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {publishing ? '发布中...' : '确认发布'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
