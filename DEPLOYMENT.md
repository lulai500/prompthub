# PromptHub 完整部署教程

## 前置准备

1. **GitHub 账号** — 用于存储代码
2. **Vercel 账号** — 用于部署（建议用 GitHub 登录）
3. **Supabase 账号** — 用于数据库和认证

---

## 第一步：Supabase 初始化配置

### 1.1 创建 Supabase 项目

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 点击 **"New project"**
3. 填写项目信息：
   - **Name**: `prompthub`
   - **Database Password**: 设置一个强密码（**请牢记**）
   - **Region**: 选择离用户最近的区域（海外用户建议 `us-east-1`）
   - **Pricing Plan**: 选择 **Free**（免费额度：500MB 数据库、5GB 带宽）
4. 点击 **"Create new project"**，等待数据库初始化（约 2 分钟）

### 1.2 执行数据库建表 SQL

1. 在 Supabase Dashboard 左侧菜单 → **SQL Editor**
2. 点击 **"New query"**
3. 将 `supabase/schema.sql` 文件内容**完整粘贴**到编辑器中
4. 点击 **"Run"** 执行
5. 看到 "Success. No rows returned" 即成功

验证：在左侧菜单 **Table Editor** 中应该能看到以下表：
- `profiles`
- `categories`
- `prompts`
- `folders`
- `favorites`
- `orders`

### 1.3 配置 Auth（认证服务）

1. 左侧菜单 → **Authentication** → **Providers**
2. 确认 **Email** provider 已启用
3. 建议关闭 **"Confirm email"**（开发阶段）：
   - 进入 **Authentication** → **Settings**
   - 在 **Email Auth** 部分：
     - `Confirm email` → 开发期间可关闭
     - `Secure email change` → 开启

### 1.4 获取 API 密钥

1. 左侧菜单 → **Settings** → **API**
2. 复制以下值：
   - **Project URL** → 即 `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → 即 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → 即 `SUPABASE_SERVICE_ROLE_KEY`（⚠️ 保密）

---

## 第二步：本地开发（可选）

### 2.1 安装依赖

```bash
cd prompthub
npm install
```

### 2.2 配置环境变量

复制 `.env.example` 为 `.env.local`：

```bash
cp .env.example .env.local
```

编辑 `.env.local`，填入第一步获取的 Supabase 密钥：

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 2.3 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

---

## 第三步：Vercel 部署

### 3.1 推送代码到 GitHub

```bash
# 在 prompthub 目录下初始化 git
git init
git add .
git commit -m "Initial commit: PromptHub"

# 在 GitHub 上创建仓库后
git remote add origin https://github.com/YOUR_USERNAME/prompthub.git
git branch -M main
git push -u origin main
```

### 3.2 在 Vercel 中导入项目

1. 登录 [Vercel](https://vercel.com)
2. 点击 **"Add New..."** → **"Project"**
3. 选择你的 GitHub 仓库 `prompthub`
4. 点击 **"Import"**

### 3.3 配置环境变量

在 Vercel 项目设置中 → **Settings** → **Environment Variables**：

| Key | Value | Environment |
|-----|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | 你的 Supabase Project URL | Production + Preview |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 你的 anon key | Production + Preview |
| `SUPABASE_SERVICE_ROLE_KEY` | 你的 service_role key | Production only |
| `NEXT_PUBLIC_SITE_URL` | `https://你的域名.vercel.app` | Production |

### 3.4 部署

1. 点击 **"Deploy"**
2. 等待构建完成（约 1-2 分钟）
3. 部署成功后，访问 Vercel 提供的域名

### 3.5 绑定自定义域名（可选）

1. Vercel 项目 → **Settings** → **Domains**
2. 添加你的域名
3. 按提示在域名 DNS 中添加 CNAME 记录

---

## 第四步：生产环境检查清单

- [ ] 注册一个测试账号，验证邮箱注册/登录功能
- [ ] 浏览提示词列表，确认数据正确加载
- [ ] 测试收藏功能（添加/删除/文件夹管理）
- [ ] 验证明暗主题切换
- [ ] 在手机浏览器中测试响应式布局
- [ ] 确认 `.env.local` 未提交到 Git 仓库

---

## 常见问题

**Q: 部署后提示 "Error loading prompts"**
→ 检查 Supabase URL 和 ANON_KEY 是否正确；确认 SQL 已执行

**Q: 登录后无法收藏**
→ 检查 Supabase RLS 策略是否正确创建

**Q: 页面样式异常**
→ 确保 Vercel 构建时 Tailwind CSS 正确编译

---

## 免费额度说明

| 服务 | 免费额度 | 是否够用 |
|------|---------|---------|
| Vercel | 100GB 带宽/月，6000 构建分钟 | ✅ 个人/小团队够用 |
| Supabase | 500MB 数据库，5GB 带宽，50,000 月活用户 | ✅ 前期充足 |
| Lemon Squeezy | 无月费，仅从交易抽成 5% + $0.50 | ✅ 付费功能暂未启用 |
