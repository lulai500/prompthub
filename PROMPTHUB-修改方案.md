# PromptHub 网站问题修改方案

> 基于《PromptHub-网站问题分析报告》的 13 个问题，逐一给出具体代码级修改方案。
> 项目路径：`C:\Users\lei\Desktop\新建文件夹 (2)\prompthub\`

---

## 一、严重问题修改方案

### 1. 首页数据不一致——"6 个提示词" vs 实际 121 个

**根因**：`src/app/page.tsx` 第 27-35 行，首页查询热门提示词时 `.limit(6)` 只取了 6 条，而统计区块（第 42 行）直接用 `promptsResult.data?.length` 作为总数，结果永远是 6。

**修改方案**：

```tsx
// src/app/page.tsx — 修改数据获取逻辑

// 修改前（第27-35行）：
const [categoriesResult, promptsResult] = await Promise.all([
  supabase.from('categories').select('*').order('sort_order', { ascending: true }),
  supabase
    .from('prompts')
    .select('*, category:categories(*)')
    .eq('is_published', true)
    .order('usage_count', { ascending: false })
    .limit(6),
]);

// 修改后：分别查询总数和热门列表
const [categoriesResult, countResult, promptsResult] = await Promise.all([
  supabase.from('categories').select('*').order('sort_order', { ascending: true }),
  supabase.from('prompts').select('*', { count: 'exact', head: true }).eq('is_published', true),
  supabase
    .from('prompts')
    .select('*, category:categories(*)')
    .eq('is_published', true)
    .order('usage_count', { ascending: false })
    .limit(6),
]);

// 统计区块（第41-45行）修改为：
const stats = [
  { label: 'Prompts', value: countResult.count || 0, icon: Sparkles },
  { label: 'Categories', value: categories.length, icon: FolderOpen },
  { label: 'Free Forever', value: '100%', icon: Heart },
];
```

---

### 2. 所有提示词使用量均为 "0 uses"

**根因**：数据库 `usage_count` 字段默认值为 0。`CopyButton` 组件（`src/components/prompts/CopyButton.tsx`）虽然会调用 API 递增计数，但数据初始都是 0。展示上直接显示 "0 uses" 非常不友好。

**修改方案 A**：修改展示逻辑，0 时不显示数字

```tsx
// src/app/page.tsx 第185-188行 — 热门提示词卡片底部
// 修改前：
<div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
  <Copy className="w-3 h-3" />
  {prompt.usage_count} uses
</div>

// 修改后：
<div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
  {prompt.usage_count > 0 ? (
    <>
      <Copy className="w-3 h-3" />
      {prompt.usage_count} uses
    </>
  ) : (
    <span className="badge-default text-xs">New</span>
  )}
</div>
```

**修改方案 B**：同步修改 `PromptCard` 组件和列表页卡片

```tsx
// src/components/prompts/PromptCard.tsx 第64-71行
// 修改前：
<div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
  <span>{formatDate(prompt.created_at)}</span>
  <span className="flex items-center gap-1">
    <Copy className="w-3 h-3" />
    {prompt.usage_count} uses
  </span>
</div>

// 修改后：
<div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
  <span>{formatDate(prompt.created_at)}</span>
  {prompt.usage_count > 0 ? (
    <span className="flex items-center gap-1">
      <Copy className="w-3 h-3" />
      {prompt.usage_count} uses
    </span>
  ) : (
    <span className="badge-default text-xs">New</span>
  )}
</div>
```

**修改方案 C**：详情页使用量展示优化

```tsx
// src/app/prompts/[id]/page.tsx 第224-231行
// 修改前：
<div className="pt-3 border-t border-slate-200 dark:border-dark-700">
  <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Usage Count</p>
  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
    {p.usage_count} copies
  </p>
</div>

// 修改后：
<div className="pt-3 border-t border-slate-200 dark:border-dark-700">
  <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Usage Count</p>
  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
    {p.usage_count > 0 ? `${p.usage_count} copies` : 'Be the first to use this!'}
  </p>
</div>
```

---

### 3. 定价页面逻辑混乱

**根因**：`src/app/pricing/page.tsx` 列出了 Free + 3 个付费方案，付费方案全部标记 `comingSoon: true` 且按钮 disabled。

**修改方案**：简化为纯免费定位，去掉付费套餐卡片

```tsx
// src/app/pricing/page.tsx — 完全重写
// 策略：保持简洁，只展示 Free 计划 + "未来会有高级功能"的预告

'use client';

import { Check, Sparkles, Clock } from 'lucide-react';
import Link from 'next/link';

const freeFeatures = [
  'Browse all 121+ prompts across 4 categories',
  'Full-text search and category filters',
  'Unlimited favorites & custom folders',
  'One-click copy with usage tracking',
  'Dark mode support',
  'Community-driven, open source',
];

const upcomingFeatures = [
  'Advanced AI-powered search',
  'Custom prompt collections & sharing',
  'Priority support & early access',
  'Pro badge on profile',
];

export default function PricingPage() {
  return (
    <div className="container-page py-16">
      <div className="text-center mb-12">
        <h1 className="page-title text-slate-900 dark:text-white">
          Free, Now and Forever
        </h1>
        <p className="page-subtitle max-w-lg mx-auto">
          PromptHub core features are and will always be free. 
          We believe great AI prompts should be accessible to everyone.
        </p>
      </div>

      {/* Free 计划详情 */}
      <div className="max-w-2xl mx-auto">
        <div className="card p-8 ring-2 ring-brand-500 dark:ring-brand-400 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-6 h-6 text-brand-500" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Free Plan</h2>
          </div>
          <p className="text-4xl font-extrabold text-slate-900 dark:text-white mb-6">
            $0 <span className="text-lg font-normal text-slate-500">/ forever</span>
          </p>

          <ul className="space-y-3 mb-8">
            {freeFeatures.map((f) => (
              <li key={f} className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                <span className="text-slate-700 dark:text-slate-300">{f}</span>
              </li>
            ))}
          </ul>

          <Link href="/auth/register" className="btn-primary w-full text-center py-3">
            Get Started Free
          </Link>
        </div>

        {/* 未来计划预告（轻量） */}
        <div className="mt-12 card p-6 border-dashed">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-slate-900 dark:text-white">
              Premium Features — Coming in the Future
            </h3>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
            We're exploring optional premium features for power users. 
            Everything you see today will remain free.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {upcomingFeatures.map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-400" />
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 二、中等严重问题修改方案

### 4. 界面语言与内容语言割裂

**根因**：所有 UI 组件硬编码英文，不支持 i18n。

**修改方案**：采取务实方案——不做完整 i18n（成本高），而是在关键位置增加中英双语支持。

**步骤 1**：修改 `tailwind.config.js`，确保 CJK 字体栈存在

```js
// tailwind.config.js — fontFamily 增加中文字体
fontFamily: {
  sans: ['Inter', 'system-ui', '-apple-system', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
  mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
},
```

**步骤 2**：在 Header 增加语言提示或双语导航

由于完整 i18n 改动量很大，建议通过增加内容语言标签来解决核心问题——给每个提示词显示其语言（已有 `tags` 字段，可增加 `lang` 标签筛选）。

**步骤 3**：在列表页侧边栏增加语言筛选

```tsx
// 在 src/app/prompts/page.tsx 侧边栏分类筛选后增加语言筛选
// 可以基于 tags 中是否包含中文来判断语言

{/* 语言筛选 — 在分类筛选下面增加 */}
<div className="mb-4">
  <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">
    Language
  </h4>
  <div className="space-y-1">
    <Link
      href={buildUrl({ lang: '' })}
      className={`block px-3 py-1.5 rounded-lg text-sm ...`}
    >
      All Languages
    </Link>
    <Link
      href={buildUrl({ lang: 'zh' })}
      className={`block px-3 py-1.5 rounded-lg text-sm ...`}
    >
      中文 (Chinese)
    </Link>
    <Link
      href={buildUrl({ lang: 'en' })}
      className={`block px-3 py-1.5 rounded-lg text-sm ...`}
    >
      English
    </Link>
  </div>
</div>
```

> **注意**：这需要数据库 `prompts` 表增加 `language` 字段或通过内容检测实现。简单方案是临时用标签 `tags` 数组包含 `'chinese'` 或 `'english'` 来区分。

---

### 5. "热门提示词"全部为同一分类

**根因**：`src/app/page.tsx` 第 29-34 行查询按 `usage_count` 降序取前 6 条，没有跨分类多样性逻辑。

**修改方案**：从每个分类各取 1-2 条，确保多样性

```tsx
// src/app/page.tsx — 修改热门提示词查询逻辑

// 替换原来的单一查询，改为按分类各取几条
const categorySlugs = ['code-prompt', 'novel-writing', 'agent-llm', 'general-prompt'];

// 方案 A：从每个分类各取 1-2 条提示词
const categoryPromises = categorySlugs.map(async (slug) => {
  const { data: cat } = await supabase
    .from('categories').select('id').eq('slug', slug).single();
  if (!cat) return [];
  const { data } = await supabase
    .from('prompts')
    .select('*, category:categories(*)')
    .eq('category_id', cat.id)
    .eq('is_published', true)
    .order('usage_count', { ascending: false })
    .limit(2);
  return data || [];
});

const categoryResults = await Promise.all(categoryPromises);
const prompts = categoryResults.flat().slice(0, 6); // 各取2条共8条，截断为6条
```

> 或者更简单的方案：让查询随机选取或按 `id` 交替换取不同分类的提示词。实际生产环境可增加 `featured` 字段手动精选。

---

### 6. Explore 页面缺少搜索和排序功能

**根因分析**：实际上 **搜索功能已实现**（Header 搜索框 + `/prompts?search=` 参数），报告中的观察可能有误。但**排序功能确实缺失**——列表页只有默认的按 `created_at` 降序。

**修改方案**：在列表页增加排序下拉框

```tsx
// src/app/prompts/page.tsx — 增加排序参数和 UI

// SearchParams 接口增加 sort 参数
interface SearchParams {
  search?: string;
  category?: string;
  tag?: string;
  page?: string;
  sort?: string; // 新增
}

// 解析排序参数
const sort = searchParams.sort || 'latest';

// 修改查询排序逻辑（替换第71-73行）
const orderMap: Record<string, { column: string; ascending: boolean }> = {
  latest:    { column: 'created_at', ascending: false },
  oldest:    { column: 'created_at', ascending: true },
  most_used: { column: 'usage_count', ascending: false },
  // most_favorited 需要新建字段，暂用 usage_count 替代
};

const { column, ascending } = orderMap[sort] || orderMap.latest;

const { data: prompts, count } = await query
  .order(column, { ascending })
  .range(from, to);
```

在搜索结果上方添加排序控件：

```tsx
{/* 排序控件 — 在结果列表上方 */}
<div className="flex items-center justify-between mb-4">
  <p className="text-sm text-slate-500 dark:text-slate-400">
    {count || 0} prompt{count !== 1 ? 's' : ''} found
  </p>
  <div className="flex items-center gap-2">
    <label className="text-xs text-slate-500 dark:text-slate-400">Sort by:</label>
    <select
      defaultValue={sort}
      onChange={(e) => {
        const params = new URLSearchParams(window.location.search);
        params.set('sort', e.target.value);
        params.delete('page');
        window.location.search = params.toString();
      }}
      className="text-sm rounded-lg border border-slate-200 dark:border-dark-700 bg-white dark:bg-dark-800 px-2 py-1"
    >
      <option value="latest">Latest</option>
      <option value="oldest">Oldest</option>
      <option value="most_used">Most Used</option>
    </select>
  </div>
</div>
```

---

### 7. 提示词详情页缺乏社区互动功能

**修改方案**：增加收藏计数展示和简单的反馈入口（完整评论系统成本高，先做轻量版）。

**步骤 1**：数据库增加收藏计数（虚拟列或触发器）

```sql
-- supabase/schema.sql 末尾增加
-- 收藏计数视图（避免每次都 JOIN COUNT）
CREATE OR REPLACE VIEW public.prompt_stats AS
SELECT 
  prompt_id,
  COUNT(*) AS favorite_count
FROM public.favorites
GROUP BY prompt_id;
```

**步骤 2**：在详情页右侧栏展示收藏数

```tsx
// src/app/prompts/[id]/page.tsx — 查询中增加 favorite_count
const { data: favCount } = await supabase
  .from('favorites')
  .select('*', { count: 'exact', head: true })
  .eq('prompt_id', p.id);

// 右侧边栏 Actions 区块增加收藏计数展示
<div className="pt-3 border-t border-slate-200 dark:border-dark-700">
  <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">
    Favorited by
  </p>
  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
    {favCount?.count || 0} user{(favCount?.count || 0) !== 1 ? 's' : ''}
  </p>
</div>
```

**步骤 3**：在详情页底部增加"Report"和"Share"按钮（轻量互动）

```tsx
{/* 详情页底部 — 在右侧边栏增加 Share 按钮 */}
<button
  onClick={() => {
    navigator.clipboard.writeText(window.location.href);
    // toast: "Link copied!"
  }}
  className="btn-secondary w-full text-sm"
>
  <Share2 className="w-4 h-4" /> Share Link
</button>
```

---

## 三、轻微问题修改方案

### 8. 注册页缺乏输入引导和验证提示

**修改方案**：在 `src/app/auth/register/page.tsx` 增加实时验证和规则说明。

```tsx
// 在表单字段下方增加规则提示和实时验证

{/* 用户名 — 增加规则提示 */}
<input id="username" ... />
{username.length > 0 && username.length < 3 && (
  <p className="text-xs text-amber-500 mt-1">
    Username must be at least 3 characters
  </p>
)}

{/* 密码 — 增加强度指示器 */}
<input id="password" ... />
{password.length > 0 && (
  <div className="mt-2 space-y-1">
    <div className="flex items-center gap-2 text-xs">
      <div className={`w-2 h-2 rounded-full ${password.length >= 8 ? 'bg-green-500' : 'bg-slate-300'}`} />
      <span className={password.length >= 8 ? 'text-green-600' : 'text-slate-400'}>
        At least 8 characters
      </span>
    </div>
    <div className="flex items-center gap-2 text-xs">
      <div className={`w-2 h-2 rounded-full ${/[A-Z]/.test(password) ? 'bg-green-500' : 'bg-slate-300'}`} />
      <span className={/[A-Z]/.test(password) ? 'text-green-600' : 'text-slate-400'}>
        Contains uppercase letter
      </span>
    </div>
    <div className="flex items-center gap-2 text-xs">
      <div className={`w-2 h-2 rounded-full ${/[0-9]/.test(password) ? 'bg-green-500' : 'bg-slate-300'}`} />
      <span className={/[0-9]/.test(password) ? 'text-green-600' : 'text-slate-400'}>
        Contains number
      </span>
    </div>
  </div>
)}
```

---

### 9. 关于页面内容空洞

**修改方案**：`src/app/about/page.tsx` 增加真实数据展示。

```tsx
// 改为 SSR 页面，从 Supabase 获取统计数据
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AboutPage() {
  const supabase = createServerSupabaseClient();

  // 获取真实统计数据
  const { count: promptCount } = await supabase
    .from('prompts').select('*', { count: 'exact', head: true }).eq('is_published', true);
  const { count: categoryCount } = await supabase
    .from('categories').select('*', { count: 'exact', head: true });
  const { count: userCount } = await supabase
    .from('profiles').select('*', { count: 'exact', head: true });

  return (
    // ... 在 Hero 区下方增加统计条
    <div className="grid grid-cols-3 gap-6 max-w-xl mx-auto mb-16">
      <div className="text-center">
        <p className="text-3xl font-bold text-brand-600">{promptCount || 0}+</p>
        <p className="text-sm text-slate-500">Prompts</p>
      </div>
      <div className="text-center">
        <p className="text-3xl font-bold text-brand-600">{categoryCount || 0}</p>
        <p className="text-sm text-slate-500">Categories</p>
      </div>
      <div className="text-center">
        <p className="text-3xl font-bold text-brand-600">{userCount || 0}+</p>
        <p className="text-sm text-slate-500">Members</p>
      </div>
    </div>
    // ...
  );
}
```

同时增加 GitHub 开源链接（既然宣称开源）：

```tsx
<a
  href="https://github.com/your-org/prompthub"  // 替换为真实链接
  target="_blank"
  rel="noopener noreferrer"
  className="btn-secondary inline-flex items-center gap-2"
>
  <GitHubIcon /> View on GitHub
</a>
```

---

### 10. 缺少暗色模式

**实际情况**：暗色模式**已经实现**！`ThemeToggle` 组件存在，`tailwind.config.js` 配置了 `darkMode: 'class'`，`layout.tsx` 默认深色。报告中可能没注意到切换按钮。

**建议**：让切换按钮更显眼，同时解决默认就是深色可能导致浅色偏好的用户不适应的问题。

```tsx
// src/app/layout.tsx — 修改默认主题策略
const htmlClass = isLight ? '' : 'dark';

// 如果未设置过主题，默认跟随系统偏好
// 当前逻辑：默认深色，只有选了 light 才是浅色
// 更好的做法：默认跟随系统，用 matchMedia('(prefers-color-scheme: light)')
```

---

### 11. 提示词卡片信息密度低

**修改方案**：将列表页改为 2-3 列网格，并提供视图切换。

```tsx
// src/app/prompts/page.tsx 第161行
// 修改前：
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">

// 修改后（2→3 列）：
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
```

同时增加视图切换按钮：

```tsx
// 在排序控件旁边增加视图切换
const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

// ...
<button onClick={() => setViewMode('grid')} className={...}>
  <LayoutGrid /> Grid
</button>
<button onClick={() => setViewMode('list')} className={...}>
  <List /> List  
</button>
```

---

### 12. 作者信息缺失

**修改方案**：数据库和代码层面增加作者关联。

**步骤 1**：`prompts` 表增加 `author_id` 字段

```sql
-- supabase/schema.sql
ALTER TABLE public.prompts ADD COLUMN author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
```

**步骤 2**：修改类型定义

```ts
// src/types/index.ts — Prompt 接口增加
export interface Prompt {
  // ... 现有字段
  author_id?: string | null;
  author?: Profile | null; // JOIN 获得
}
```

**步骤 3**：在卡片和详情页显示作者

```tsx
// src/components/prompts/PromptCard.tsx — 底部增加作者信息
{prompt.author && (
  <div className="flex items-center gap-1.5 text-xs text-slate-400">
    <User className="w-3 h-3" />
    <span>{prompt.author.username || 'Unknown'}</span>
  </div>
)}
```

```tsx
// src/app/prompts/[id]/page.tsx — 查询时 JOIN author
const { data: prompt } = await supabase
  .from('prompts')
  .select('*, category:categories(*), author:profiles(id, username, avatar_url)')
  .eq('slug', id)
  .single();
```

---

### 13. 页脚过于冗长

**修改方案**：精简页脚，去掉冗余导航。

```tsx
// src/components/layout/Footer.tsx — 精简版

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-950 mt-auto">
      <div className="container-page py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* 品牌 */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-brand-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">PH</span>
            </div>
            <span className="font-semibold text-slate-900 dark:text-white text-sm">
              PromptHub
            </span>
          </div>

          {/* 精简链接（一行） */}
          <div className="flex items-center gap-6 text-sm text-slate-500 dark:text-slate-400">
            <Link href="/prompts" className="hover:text-brand-600 transition-colors">Explore</Link>
            <Link href="/about" className="hover:text-brand-600 transition-colors">About</Link>
            <Link href="/pricing" className="hover:text-brand-600 transition-colors">Pricing</Link>
            {/* GitHub 链接 */}
            <a href="https://github.com/your-org/prompthub" target="_blank" rel="noopener noreferrer"
               className="hover:text-brand-600 transition-colors">GitHub</a>
          </div>

          {/* 版权 */}
          <p className="text-xs text-slate-400 dark:text-slate-500">
            &copy; {new Date().getFullYear()} PromptHub
          </p>
        </div>
      </div>
    </footer>
  );
}
```

---

## 四、修改优先级排序

| 优先级 | 问题 | 预计工时 | 改动文件数 | 用户影响 |
|--------|------|---------|-----------|---------|
| P0 | 1. 首页数据不一致 | 10 min | 1 | 致命 |
| P0 | 2. 零使用量展示 | 20 min | 3 | 致命 |
| P0 | 3. 定价页重做 | 30 min | 1 | 高 |
| P1 | 5. 热门提示词多样性 | 20 min | 1 | 高 |
| P1 | 6. 增加排序功能 | 30 min | 1 | 中 |
| P1 | 11. 卡片密度优化 | 20 min | 1 | 中 |
| P2 | 8. 注册页验证 | 30 min | 1 | 中 |
| P2 | 9. 关于页增加数据 | 20 min | 1 | 低 |
| P2 | 13. 精简页脚 | 15 min | 1 | 低 |
| P3 | 4. 语言支持 | 2h+ | 多个 | 中 |
| P3 | 7. 社区互动 | 3h+ | 多个 + DB | 中 |
| P3 | 12. 作者信息 | 1h | 多个 + DB | 低 |
| — | 10. 暗色模式 | ✅ 已实现 | 0 | — |
| — | 6. 搜索功能 | ✅ 已实现 | 0 | — |

---

## 五、执行建议

1. **先修 P0**：首页数据 + 零使用量展示 + 定价页，这三项是信任杀手，用户 30 秒内流失的根本原因
2. **P0 修复总计约 1 小时**，修改 5 个文件即可完成
3. **P1 跟进**：热门提示词多样性和排序功能，让平台"能用"
4. **P2/P3** 可逐步迭代，不影响基本使用
5. 搜索功能和暗色模式已经实现，报告中属于误判，无需修改

---

> 📅 方案编写日期：2026-07-28  
> 📁 项目根路径：`C:\Users\lei\Desktop\新建文件夹 (2)\prompthub\`
