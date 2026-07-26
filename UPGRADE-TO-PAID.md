# 后续启用付费订阅功能改造指南

当业务需要开启付费订阅时，按以下步骤操作，**无需大规模重构代码**。

---

## 第一步：Lemon Squeezy 配置

### 1.1 注册并创建产品

1. 注册 [Lemon Squeezy](https://www.lemonsqueezy.com/)
2. 进入 Dashboard → **Products** → **New Product**
3. 创建产品：
   - **Name**: `PromptHub Pro`
   - **Type**: Subscription
4. 添加三个 Variant（对应三个套餐）：
   - Monthly — `$9.99/month`
   - Quarterly — `$24.99/quarter`
   - Yearly — `$59.99/year`
5. 记录每个 Variant 的 **Variant ID**

### 1.2 获取 API 密钥

1. Lemon Squeezy → **Settings** → **API**
2. 生成 API Key
3. 记录 **Webhook Signing Secret**

### 1.3 配置 Webhook

1. Lemon Squeezy → **Settings** → **Webhooks**
2. **URL**: `https://你的域名.com/api/webhook/lemonsqueezy`
3. **Events**: 勾选以下事件：
   - `order_created`
   - `subscription_created`
   - `subscription_updated`
   - `subscription_cancelled`
   - `subscription_expired`
4. **Signing Secret**: 使用 1.2 中获取的 secret

---

## 第二步：环境变量更新

在 `.env.local` 和 Vercel Environment Variables 中添加/更新：

```env
# Lemon Squeezy 配置
LEMON_SQUEEZY_API_KEY=sk_live_xxxxx
LEMON_SQUEEZY_WEBHOOK_SECRET=whsec_xxxxx
LEMON_SQUEEZY_STORE_ID=12345

# 三个套餐的 Variant ID
LEMON_SQUEEZY_VARIANT_MONTHLY=123456
LEMON_SQUEEZY_VARIANT_QUARTERLY=123457
LEMON_SQUEEZY_VARIANT_YEARLY=123458
```

---

## 第三步：代码修改（少量改动）

### 3.1 启用 Webhook 签名验证

**文件**: `src/app/api/webhook/lemonsqueezy/route.ts`

找到签名验证部分的注释，取消注释：

```typescript
// 将这段取消注释：
// const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
// if (secret) {
//   const crypto = await import('crypto');
//   const hmac = crypto.createHmac('sha256', secret);
//   const digest = hmac.update(body).digest('hex');
//   const signature = request.headers.get('x-signature');
//   if (digest !== signature) {
//     return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
//   }
// }
```

### 3.2 启用定价页面付费按钮

**文件**: `src/app/pricing/page.tsx`

1. 填入真实的 Lemon Squeezy Checkout URL：
   ```typescript
   // 在 plans 数组中，将每个付费套餐的 checkoutUrl 改为：
   checkoutUrl: 'https://store.prompthub.app/checkout/buy/xxx',
   ```

2. 移除按钮的 `disabled` 属性和 "Coming Soon" 文本，改为真正的支付链接：
   ```tsx
   // 原来（休眠状态）：
   <button disabled className="btn w-full bg-slate-200 ...">
     <Clock className="w-4 h-4" /> Coming Soon
   </button>

   // 改为（启用后）：
   <a
     href={`${plan.checkoutUrl}?checkout[custom][user_id]=${userId}`}
     className="btn-primary w-full"
   >
     <Crown className="w-4 h-4" />
     Subscribe {plan.name}
   </a>
   ```

3. 移除页面顶部的 "Coming Soon" 横幅：
   ```tsx
   // 删除这段：
   <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 ...">
     <Clock className="w-4 h-4" />
     <span>Paid membership coming soon...</span>
   </div>
   ```

### 3.3 创建 Lemon Squeezy Checkout 辅助函数

**新建文件**: `src/lib/lemonsqueezy.ts`

```typescript
/**
 * 生成 Lemon Squeezy Checkout URL
 * 用户点击付费按钮后跳转到此 URL 完成支付
 */
export function getCheckoutUrl(
  variantId: string,
  userId: string,
  userEmail: string
): string {
  const storeId = process.env.LEMON_SQUEEZY_STORE_ID;
  const baseUrl = `https://store-${storeId}.lemonsqueezy.com/checkout/buy/${variantId}`;
  
  const params = new URLSearchParams({
    'checkout[custom][user_id]': userId,
    'checkout[email]': userEmail,
    'checkout[success_url]': `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?checkout=success`,
    'checkout[cancel_url]': `${process.env.NEXT_PUBLIC_SITE_URL}/pricing?checkout=cancelled`,
  });

  return `${baseUrl}?${params.toString()}`;
}
```

---

## 第四步：测试支付流程

### 4.1 使用测试模式

1. Lemon Squeezy 默认是 **Test Mode**
2. 使用测试卡号支付：
   - 卡号: `4242 4242 4242 4242`
   - CVC: 任意三位数
   - 有效期: 任意未来日期
3. 支付成功后检查：
   - 数据库 `orders` 表是否有新记录
   - `profiles` 表中 `membership_tier` 是否更新

### 4.2 切换到 Live Mode

1. 确认所有测试通过
2. Lemon Squeezy → **Settings** → **Store** → 切换到 Live Mode
3. 更新环境变量为 Live 密钥

---

## 改动文件汇总

| 文件 | 改动 | 难度 |
|-----|------|------|
| `.env.local` / Vercel Env | 添加 Lemon Squeezy 密钥 | 简单 |
| `src/app/pricing/page.tsx` | 启用按钮，移除 "Coming Soon" | 简单 |
| `src/app/api/webhook/lemonsqueezy/route.ts` | 启用签名验证 | 简单 |
| `src/lib/lemonsqueezy.ts` | **新建文件**：生成支付链接 | 简单 |
| `src/app/api/webhook/lemonsqueezy/route.ts` | 无需修改（逻辑已就位） | 无需修改 |

> 总共约 30 行代码改动 + 环境变量配置，即可完成付费功能上线。
