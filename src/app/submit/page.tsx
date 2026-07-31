'use client';
// ============================================================
// 提示词提交页面
// 需登录后使用
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
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { slugify } from '@/lib/utils';
import type { Category } from '@/types';

export default function SubmitPage() {
  const router = useRouter();
  const supabase = createClient();

  // 用户状态
  const [user, setUser] = useState<any>(null);
  const [checking, setChecking] = useState(true);

  // 分类列表
  const [categories, setCategories] = useState<Category[]>([]);

  // 表单状态
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [modelName, setModelName] = useState('');
  const [tips, setTips] = useState('');
  const [exampleOutput, setExampleOutput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const { data: sessionData } = await supabase.auth.getSession();
    setUser(sessionData.session?.user || null);

    // 加载分类
    const { data: cats } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order');
    setCategories(cats || []);

    setChecking(false);
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
      setError('You must be signed in to submit a prompt.');
      return;
    }

    if (!title.trim() || !content.trim()) {
      setError('Title and prompt content are required.');
      return;
    }

    setSubmitting(true);

    const slug = slugify(title.trim());

    const { data, error: insertError } = await supabase
      .from('prompts')
      .insert({
        title: title.trim(),
        slug,
        description: description.trim() || null,
        content: content.trim(),
        category_id: categoryId ? parseInt(categoryId) : null,
        model_name: modelName.trim() || null,
        tips: tips.trim() || null,
        example_output: exampleOutput.trim() || null,
        tags,
        author_id: user.id,
        is_published: true,
      })
      .select('id, slug')
      .single();

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    // 跳转到新创建的提示词详情页
    router.push(`/prompts/${data.slug || data.id}`);
    router.refresh();
  }

  // 检查登录状态
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
            Sign in to Submit
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            You need to be signed in to share your prompts with the community.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/auth/login" className="btn-primary">
              <LogIn className="w-4 h-4" />
              Sign In
            </Link>
            <Link href="/auth/register" className="btn-secondary">
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      {/* 页头 */}
      <Link
        href="/prompts"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-brand-600 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to prompts
      </Link>

      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Share a Prompt
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8">
          Contribute to the community by sharing your best AI prompt.
        </p>

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
              placeholder="e.g. Python Code Reviewer"
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
              placeholder="Briefly describe what this prompt does and when to use it..."
              className="input min-h-[80px]"
              rows={3}
              maxLength={500}
            />
          </div>

          {/* Prompt 内容 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Prompt Content <span className="text-red-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste or write your full prompt here..."
              className="input min-h-[200px] font-mono text-sm"
              rows={10}
              required
              maxLength={50000}
            />
          </div>

          {/* 分类 + 模型 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

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
          </div>

          {/* 调参建议 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Tuning Tips
            </label>
            <textarea
              value={tips}
              onChange={(e) => setTips(e.target.value)}
              placeholder="## Recommended Settings&#10;- Temperature: 0.7&#10;- Max tokens: 2048&#10;&#10;## Tips&#10;- For best results..."
              className="input min-h-[100px] font-mono text-sm"
              rows={5}
            />
          </div>

          {/* 示例输出 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Example Output
            </label>
            <textarea
              value={exampleOutput}
              onChange={(e) => setExampleOutput(e.target.value)}
              placeholder="Paste an example of what the AI outputs when using this prompt. This helps others see the prompt's value at a glance."
              className="input min-h-[120px] font-mono text-sm"
              rows={6}
            />
            <p className="text-xs text-slate-400 mt-1">
              Optional. Show the expected result to help others understand this prompt&apos;s value.
            </p>
          </div>

          {/* 标签 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Tags
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Add a tag and press Enter..."
                className="input flex-1"
              />
              <button
                type="button"
                onClick={addTag}
                className="btn-secondary"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-slate-400 mt-1">Up to 8 tags. Press Enter or comma to add.</p>
          </div>

          {/* 提交 */}
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full py-3 text-base"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Publish Prompt
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
