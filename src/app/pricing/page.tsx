// ============================================================
// 定价页面
// 显示会员订阅套餐，目前所有付费按钮置灰不可点击
// "Paid membership coming soon" 提示
//
// 未来启用付费时：
// 1. 在 Lemon Squeezy 创建产品获取 variant ID
// 2. 将环境变量 LEMON_SQUEEZY_VARIANT_* 改为真实值
// 3. 移除 disabled 属性和 "coming soon" 文本
// ============================================================

import { Check, X, Crown, Clock } from 'lucide-react';
import Link from 'next/link';

/**
 * 套餐配置（价格单位为美元）
 * 未来启用付费时，将 Lemon Squeezy 的 checkout URL 替换 href
 */
const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for getting started',
    // 未来替换为 Lemon Squeezy 支付链接
    checkoutUrl: null, // 例如: 'https://your-store.lemonsqueezy.com/checkout/...'
    variantId: null, // 例如: process.env.LEMON_SQUEEZY_VARIANT_FREE
    features: [
      { text: 'Browse all prompts', included: true },
      { text: 'Unlimited favorites', included: true },
      { text: 'Custom folders', included: true },
      { text: 'Basic search', included: true },
      { text: 'Priority support', included: false },
      { text: 'Early access to new prompts', included: false },
      { text: 'Custom prompt requests', included: false },
      { text: 'Badge on profile', included: false },
    ],
    highlighted: false,
  },
  {
    name: 'Monthly',
    price: '$9.99',
    period: 'per month',
    description: 'For serious prompt engineers',
    checkoutUrl: null,
    variantId: null,
    features: [
      { text: 'Browse all prompts', included: true },
      { text: 'Unlimited favorites', included: true },
      { text: 'Custom folders', included: true },
      { text: 'Advanced search & filters', included: true },
      { text: 'Priority support', included: true },
      { text: 'Early access to new prompts', included: true },
      { text: 'Custom prompt requests', included: false },
      { text: 'Pro badge on profile', included: true },
    ],
    highlighted: true,
    comingSoon: true, // 标记为即将推出
  },
  {
    name: 'Quarterly',
    price: '$24.99',
    period: 'per quarter',
    description: 'Save 15% with quarterly billing',
    checkoutUrl: null,
    variantId: null,
    features: [
      { text: 'All Monthly features', included: true },
      { text: '15% discount vs monthly', included: true },
      { text: 'Custom prompt requests', included: true },
      { text: 'Download prompts as files', included: true },
    ],
    highlighted: false,
    comingSoon: true,
  },
  {
    name: 'Yearly',
    price: '$59.99',
    period: 'per year',
    description: 'Best value - save 50% vs monthly',
    checkoutUrl: null,
    variantId: null,
    features: [
      { text: 'All Quarterly features', included: true },
      { text: '50% discount vs monthly', included: true },
      { text: 'Exclusive community access', included: true },
      { text: 'Vote on new features', included: true },
    ],
    highlighted: false,
    comingSoon: true,
  },
];

export default function PricingPage() {
  return (
    <div className="container-page py-16">
      {/* 页头 */}
      <div className="text-center mb-12">
        <h1 className="page-title text-slate-900 dark:text-white">
          Simple, Transparent Pricing
        </h1>
        <p className="page-subtitle max-w-lg mx-auto">
          All core features are completely free. Premium plans are coming soon
          for those who want extra capabilities.
        </p>

        {/* "Coming Soon" 横幅 */}
        <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-medium">
            Paid membership coming soon — all features are currently free!
          </span>
        </div>
      </div>

      {/* 套餐卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`card p-6 relative flex flex-col ${
              plan.highlighted
                ? 'ring-2 ring-brand-500 dark:ring-brand-400 shadow-lg'
                : ''
            }`}
          >
            {/* 推荐标记 */}
            {plan.highlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-brand-600 text-white text-xs font-semibold rounded-full">
                Most Popular
              </div>
            )}

            {/* 套餐名 */}
            <div className="flex items-center gap-2 mb-2">
              {plan.name !== 'Free' && (
                <Crown className="w-5 h-5 text-yellow-500" />
              )}
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {plan.name}
              </h3>
            </div>

            {/* 价格 */}
            <div className="mb-1">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {plan.price}
              </span>
              <span className="text-sm text-slate-500 dark:text-slate-400 ml-1">
                /{plan.period}
              </span>
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              {plan.description}
            </p>

            {/* 功能列表 */}
            <ul className="space-y-2.5 mb-6 flex-1">
              {plan.features.map((feature) => (
                <li key={feature.text} className="flex items-start gap-2.5 text-sm">
                  {feature.included ? (
                    <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  ) : (
                    <X className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0 mt-0.5" />
                  )}
                  <span
                    className={
                      feature.included
                        ? 'text-slate-700 dark:text-slate-300'
                        : 'text-slate-400 dark:text-slate-500 line-through'
                    }
                  >
                    {feature.text}
                  </span>
                </li>
              ))}
            </ul>

            {/* CTA 按钮 */}
            {plan.name === 'Free' ? (
              <Link href="/auth/register" className="btn-primary w-full">
                Get Started Free
              </Link>
            ) : (
              <button
                disabled
                className="btn w-full bg-slate-200 dark:bg-dark-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                title="Paid membership coming soon"
              >
                <Clock className="w-4 h-4" />
                Coming Soon
              </button>
            )}
          </div>
        ))}
      </div>

      {/* 底部说明 */}
      <div className="text-center mt-12">
        <p className="text-sm text-slate-400 dark:text-slate-500">
          All prices in USD. Payment processing by Lemon Squeezy.
          <br />
          Cancel anytime. No long-term commitment required.
        </p>
      </div>
    </div>
  );
}
