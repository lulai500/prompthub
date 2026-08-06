# PromptHub — Skills 示例输出演示

> 手写的精选技能示例输出（2026-08-05）。
> 每个示例 = 输入（给技能什么）→ 输出（技能按自己的系统提示词产出的成果）。
> 可直接用作网站 `example_output` 展示，或放进客户工作站演示。

---

## ① Senior Code Reviewer — 代码审查

**技能 slug：** `senior-code-reviewer` ｜ **分类：** coding

### 输入

```js
app.post('/api/users', async (req, res) => {
  const { name, email, role } = req.body;
  const sql = `INSERT INTO users (name, email, role)
               VALUES ('${name}', '${email}', '${role}')`;
  await db.query(sql);
  res.send({ ok: true });
});
```

### 输出

```markdown
## 审查结果

🔴 **Critical — SQL 注入**
name/email/role 直接拼接进 SQL，攻击者可用 `name = "x', 'a@a.com', 'admin'); --"` 注入。
**修复：**
```js
await db.query('INSERT INTO users (name, email, role) VALUES ($1, $2, $3)',
               [name, email, role]);
```

🟠 **Warning — 无输入校验**
email 未校验格式、role 未做白名单（应为 ['user','editor','admin']）。
**修复：** 进库前校验 email 正则 + role 枚举。

🟠 **Warning — 无错误处理**
`await db.query` 抛错时接口返回 500，且缺少连接释放。
**修复：** try/catch + 统一错误响应。

🟡 **Suggestion — 无幂等防护**
重复点击会插入重复用户。建议对 email 建 UNIQUE 约束 + 捕获 23505。

✅ **优点：** 代码短、意图清晰，没有多余抽象。

🎯 **优先项：**
1. 参数化 SQL（阻止注入）
2. 输入校验 + role 白名单
3. UNIQUE(email) + 错误处理
```

---

## ② SQL Query Optimizer — SQL 优化

**技能 slug：** `sql-query-optimizer` ｜ **分类：** coding

### 输入

```sql
SELECT o.id, o.total, c.name,
       (SELECT COUNT(*) FROM order_items oi
        WHERE oi.order_id = o.id) AS item_count
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE c.created_at >= '2026-01-01'
ORDER BY o.total DESC
LIMIT 50;
```

### 输出

```markdown
## 诊断
- 关联子查询 `(SELECT COUNT(*) ...)` 对每个订单执行一次 → **N+1 模式**，表越大越慢
- `c.created_at >=` 且 `c.country` 无索引 → 全表扫描
- 排序 `ORDER BY o.total DESC` 产生 filesort

**优化后：**
```sql
SELECT o.id, o.total, c.name, oi.item_count
FROM orders o
JOIN customers c ON o.customer_id = c.id
JOIN (SELECT order_id, COUNT(*) AS item_count
      FROM order_items GROUP BY order_id) oi ON oi.order_id = o.id
WHERE c.created_at >= '2026-01-01'
ORDER BY o.total DESC
LIMIT 50;
```

**建议索引：**
```sql
CREATE INDEX idx_customers_created_at ON customers (created_at);
CREATE INDEX idx_orders_customer_id ON orders (customer_id);
CREATE INDEX idx_order_items_order_id ON order_items (order_id);
CREATE INDEX idx_orders_total ON orders (total DESC);
```

**验证：** 用 `EXPLAIN ANALYZE` 对比优化前后，确认子查询改为一次聚合、走索引。
```

---

## ③ Blog Post Writer — SEO 博客

**技能 slug：** `blog-post-writer` ｜ **分类：** writing

### 输入

```
topic = 提示词工程
audience = 非程序员
goal = 提升网站 SEO
```

### 输出

```markdown
## 工作标题
5 Prompt Rules That Make AI 10x More Useful (No Coding Needed)

## 备选标题
1. Stop Writing Vague Prompts: 5 Rules Anyone Can Use Today
2. The 5-Minute Fix That Makes Every AI Chat Better
3. Why Your AI Answers Are Boring (And 5 Rules That Fix It)

## 大纲
- H2: Why prompts fail for most people
  - H3: The "too vague" trap
- H2: Rule 1 — Give the AI a role
- H2: Rule 2 — Bound the input
- H2: Rule 3 — Specify the output format
- H2: Rule 4 — Add one example
- H2: Rule 5 — Iterate, don't restart
- H2: A before/after example
- H2: Conclusion + CTA

## 开头段落（Hook）
Most people don't have a prompt problem. They have a "say exactly what you mean" problem.
You open ChatGPT, type "write something about marketing", and get back 400 words of
generic fluff. Then you blame the AI. But the fix isn't a smarter model — it's five
rules you can learn in one sitting, no code required.

## 示例小节（Rule 1 全文）
**Give the AI a role.** "Write a blog post about marketing" and "You are a B2B content
strategist writing for startup founders. Write a post about marketing" get completely
different results — the second one tells the model who to be, what to care about, and
who it's speaking to. A role converts generic generation into informed opinion. This
single change is usually worth more than upgrading your model.

## 结论 + CTA
Start with Rule 1 today: before your next prompt, decide who the AI should be.
If you want a printable checklist of all five rules, grab the free PDF below.
```

---

## ④ Video Script Writer — 60s 短视频脚本

**技能 slug：** `video-script` ｜ **分类：** video-production

### 输入

```
topic = 用 AI 提升剪辑效率
platform = TikTok/Reels 竖屏 9:16
type = 教程
```

### 输出

```markdown
# 60s 口播教程分镜

| # | 时间 | 景别 | 画面 | 口播 | 备注 |
|---|------|------|------|------|------|
| 1 | 0–3s | 近景 | 直接怼脸，语气笃定 | "你觉得剪视频最浪费时间的是什么？渲染。" | 前 3 秒必须抓人，无开场白 |
| 2 | 3–15s | 中景 | 电脑屏幕特写 + 手部操作 | "我做了五年剪辑，今天教你一个免费的办法，后台渲染时间直接砍掉一半。" | 痛点 → 承诺 |
| 3 | 15–30s | 特写 | 演示导出设置菜单 | "关键就三步：改编码 H.264、码率选 VBR、分辨率别超标。很多新手全在用一个没意义的码率。" | 干货节奏 |
| 4 | 30–45s | 屏幕+字幕 | 对比渲染时间计时器 | "同样一段 10 分钟的片子，设置前 8 分钟，设置后 3 分半。" | 数字对比最有说服力 |
| 5 | 45–58s | 近景 | 回归人脸 | "如果这个视频对你有用，保存下来，改设置的时候对着做。" | 引导收藏 |
| 6 | 58–60s | 近景 | 手指镜头 | "关注我，每天一条剪辑效率技巧。" | 结尾 CTA |

# 平台适配
- 首句即钩子，无"大家好"
- 大号居中字幕
- 每 15s 换镜头，防止流失
- 时长 ~60s ≈ 200-230 字口播，已留 B-roll 空档
```

---

## ⑤ Deep Research Assistant — 研究报告

**技能 slug：** `deep-research-assistant` ｜ **分类：** research-agents

### 输入

```
question = 2026 年中小企业自托管 LLM 的成本与适用场景
```

### 输出

> ⚠️ 手写演示：引用为占位，真实使用由技能联网核实来源。

```markdown
## 执行摘要
2026 年，自托管 LLM 对中小企业的门槛已从"技术可行性"转向"ROI 判断"：
- 8B 量级开源模型可在单张消费级 GPU 上运行，足以覆盖客服、文档、内容生成
- 但自托管的"隐性成本"（运维、GPU 折旧、调优）常被低估，纯成本不一定低于 API

## 主要发现
1. **硬件成本骤降**：量化后的 7-8B 模型仅需 ~8GB 显存，单张 RTX 4060 即可推理
   （占位引用：官方模型卡）
2. **隐私是主要动因**：约 62% 受访中小企业选择自托管的首因是数据不出域
   （占位引用：2026 企业 AI 调研）
3. **适用边界清晰**：高并发、低延迟场景自托管更划算；低频、长尾任务用 API 更省
4. **运维是最大风险**：版本升级、显存规划、突发并发处理，缺一人专职易失控

## 待澄清问题
- 中长期 GPU 折旧如何计入月成本模型？
- 混合架构（核心自托管 + 长尾走 API）的收益比缺少公开数据。
```

---

## 说明

- 全部为**手写演示**，忠实于各技能 SKILL.md 规定的输出格式（优先级分级 / 分镜表 / 标题+大纲+草稿 等）
- 引用类内容（如研究技能）已标注为占位，避免捏造来源
- 如需，可进一步：入库为对应技能的 `example_output`、补充更多技能、或生成 SQL 更新脚本
