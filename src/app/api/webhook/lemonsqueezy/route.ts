// ============================================================
// Lemon Squeezy Webhook 支付回调处理
// ============================================================
// 【休眠状态】当前付费功能未启用。
// 安全策略：未配置 LEMON_SQUEEZY_WEBHOOK_SECRET 时返回 501，拒绝所有请求。
// 启用步骤：
// 1. 在 Lemon Squeezy Dashboard → Settings → Webhooks 添加此端点
//    URL: https://your-domain.com/api/webhook/lemonsqueezy
//    Events: order_created, subscription_created, subscription_updated,
//            subscription_cancelled, subscription_expired
// 2. 在 Vercel/环境变量中设置 LEMON_SQUEEZY_WEBHOOK_SECRET
// 3. 签名验证自动生效，无需修改代码
// ============================================================

import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { LemonSqueezyWebhookEvent } from '@/types';

export async function POST(request: Request) {
  try {
    const body = await request.text();

    // ---- 签名验证（必须）----
    // 付费功能启用后，在 Vercel 环境变量中设置 LEMON_SQUEEZY_WEBHOOK_SECRET
    const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
    if (!secret) {
      // 未配置 Webhook 密钥 → 拒绝所有请求，防止未授权调用
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 501 }
      );
    }
    // 验证请求签名
    const crypto = await import('crypto');
    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(body).digest('hex');
    const signature = request.headers.get('x-signature');
    if (!signature || digest !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event: LemonSqueezyWebhookEvent = JSON.parse(body);
    const eventName = event.meta.event_name;

    // ---- 客户工作站订阅（B2B 额度）分流 ----
    // 按 checkout 时烘焙的 custom_data.client_id 识别是"哪个客户"；
    // 与网站会员（profiles.membership_tier）互不影响
    const metaCustom = (event.meta.custom_data ?? {}) as Record<string, unknown>;
    const clientId = metaCustom.client_id != null ? Number(metaCustom.client_id) : null;
    if (clientId) {
      return handleClientSubscription(event, clientId);
    }

    // 使用 admin client 绕过 RLS，确保 webhook 可以修改任意用户数据
    const supabase = createAdminClient();

    // ---- 根据事件类型处理 ----
    switch (eventName) {
      /**
       * 订单创建事件
       * 当用户完成支付后触发，记录订单信息
       */
      case 'order_created': {
        const orderData = event.data.attributes;
        // 从 custom_data 获取用户 ID（在 checkout URL 中传入）
        const userId = (event.meta.custom_data as any)?.user_id;
        if (!userId) {
          return NextResponse.json(
            { error: 'Missing user_id in custom_data' },
            { status: 400 }
          );
        }

        // 插入订单记录
        const { error: orderError } = await supabase.from('orders').insert({
          user_id: userId,
          lemon_squeezy_order_id: String(orderData.order_id || event.data.id),
          product_name: orderData.first_order_item?.product_name || null,
          amount: orderData.total || null,
          currency: orderData.currency || 'USD',
          status: 'paid',
          paid_at: new Date().toISOString(),
        });

        if (orderError) {
          console.error('Failed to save order:', orderError);
          return NextResponse.json({ error: 'Failed to save order' }, { status: 500 });
        }
        break;
      }

      /**
       * 订阅创建事件
       * 设置用户会员等级和到期时间
       */
      case 'subscription_created': {
        const subData = event.data.attributes;
        const userId = (event.meta.custom_data as any)?.user_id;
        if (!userId) break;

        // 根据产品 variant 名确定会员等级和到期时间（订阅事件用顶层 variant_name，非 order 的 first_order_item）
        const tier = getMembershipTier(subData.variant_name || 'monthly');
        const expiresAt = getExpiresAt(tier);

        // 更新用户 profile
        await supabase
          .from('profiles')
          .update({
            membership_tier: tier,
            membership_expires_at: expiresAt?.toISOString() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
        break;
      }

      /**
       * 订阅续费事件
       * 延长会员到期时间
       */
      case 'subscription_updated': {
        const subData = event.data.attributes;
        const userId = (event.meta.custom_data as any)?.user_id;
        if (!userId) break;

        const tier = getMembershipTier(subData.variant_name || 'monthly');
        const expiresAt = getExpiresAt(tier);

        await supabase
          .from('profiles')
          .update({
            membership_tier: tier,
            membership_expires_at: expiresAt?.toISOString() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
        break;
      }

      /**
       * 订阅取消/过期事件
       * 将用户降级为免费用户
       */
      case 'subscription_cancelled':
      case 'subscription_expired': {
        const userId = (event.meta.custom_data as any)?.user_id;
        if (!userId) break;

        await supabase
          .from('profiles')
          .update({
            membership_tier: 'free',
            membership_expires_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
        break;
      }

      default:
        // 未处理的事件类型，记录日志但不报错
        console.log(`Unhandled webhook event: ${eventName}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 客户工作站订阅处理（B2B 额度会员，独立于网站会员）
 * 幂等：UNIQUE(lemon_squeezy_subscription_id) + upsert，webhook 重试安全
 * - active/on_trial/paused/past_due → Pro，period 取 renews_at（或 ends_at）
 * - cancelled → 保留到 ends_at（已付周期内仍有效，到期后 execute 自动回落 free）
 * - expired → 回落 free
 */
async function handleClientSubscription(event: LemonSqueezyWebhookEvent, clientId: number) {
  const eventName = event.meta.event_name;
  const admin = createAdminClient();

  if (
    ['subscription_created', 'subscription_updated', 'subscription_cancelled', 'subscription_expired'].includes(
      eventName
    )
  ) {
    const sd = event.data.attributes;
    // 只认 Pro variant；未配置 VARIANT_PRO 时放行（测试期）
    const variantPro = process.env.LEMON_SQUEEZY_VARIANT_PRO;
    if (variantPro && String(sd.variant_id ?? '') !== String(variantPro)) {
      return NextResponse.json({ success: true });
    }

    const renewsAt = sd.renews_at ? new Date(sd.renews_at).toISOString() : null;
    const endsAt = sd.ends_at ? new Date(sd.ends_at).toISOString() : null;

    let subStatus: 'active' | 'cancelled' | 'expired' = 'expired';
    let periodEnd: string | null = null;
    if (['active', 'on_trial', 'paused', 'past_due'].includes(sd.status ?? '')) {
      subStatus = 'active';
      periodEnd = renewsAt ?? endsAt;
    } else if (sd.status === 'cancelled') {
      subStatus = 'cancelled';
      periodEnd = endsAt; // 已付周期内仍有效
    } else {
      subStatus = 'expired';
      periodEnd = null;
    }

    const tier: 'free' | 'pro' =
      subStatus !== 'expired' && periodEnd && new Date(periodEnd).getTime() > Date.now() ? 'pro' : 'free';
    const proExpiresAt = tier === 'pro' ? periodEnd : null;

    await admin
      .from('client_subscriptions')
      .upsert(
        {
          client_id: clientId,
          lemon_squeezy_subscription_id: String(event.data.id),
          variant_id: sd.variant_id != null ? String(sd.variant_id) : null,
          status: subStatus,
          current_period_end: periodEnd,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'lemon_squeezy_subscription_id' }
      );

    await admin
      .from('clients')
      .update({ tier, pro_expires_at: proExpiresAt, updated_at: new Date().toISOString() })
      .eq('id', clientId);
  }

  return NextResponse.json({ success: true });
}

/**
 * 根据产品 variant 名称映射会员等级
 * @param variantName Lemon Squeezy variant 名称
 * @returns 会员等级
 */
function getMembershipTier(variantName: string): string {
  const name = variantName.toLowerCase();
  if (name.includes('year')) return 'yearly';
  if (name.includes('quarter')) return 'quarterly';
  return 'monthly';
}

/**
 * 根据会员等级计算到期时间
 * @param tier 会员等级
 * @returns 到期日期
 */
function getExpiresAt(tier: string): Date | null {
  const now = new Date();
  switch (tier) {
    case 'monthly':
      return new Date(now.setMonth(now.getMonth() + 1));
    case 'quarterly':
      return new Date(now.setMonth(now.getMonth() + 3));
    case 'yearly':
      return new Date(now.setFullYear(now.getFullYear() + 1));
    default:
      return null;
  }
}
