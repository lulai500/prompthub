// ============================================================
// GET/POST /api/workstation/billing
// 客户工作站 Pro 订阅（Lemon Squeezy）
// POST：创建 checkout session（升级到 Pro）→ 返回 checkoutUrl
// GET：返回配置状态 + 当前配额
// ============================================================

import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import { effectiveTier, quotaLimit, countMonthlyUsage } from '@/lib/client-quota';

const LS_API = 'https://api.lemonsqueezy.com/v1';

function lsConfigured() {
  return Boolean(
    process.env.LEMON_SQUEEZY_API_KEY &&
      process.env.LEMON_SQUEEZY_STORE_ID &&
      process.env.LEMON_SQUEEZY_VARIANT_PRO
  );
}

export async function POST() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const { data: client } = await admin
    .from('clients')
    .select('*')
    .eq('account_id', user.id)
    .maybeSingle();
  if (!client) return NextResponse.json({ error: 'No client account.' }, { status: 403 });
  if (client.status === 'paused' || client.status === 'archived') {
    return NextResponse.json({ error: 'This client account is not active.' }, { status: 403 });
  }

  if (!lsConfigured()) {
    return NextResponse.json(
      { error: 'Billing is not configured yet. Contact the owner to enable upgrades.' },
      { status: 501 }
    );
  }

  // 已是 Pro 且未过期 → 无需重复购买
  if (effectiveTier(client.tier, client.pro_expires_at) === 'pro') {
    return NextResponse.json({ alreadyPro: true });
  }

  // 客户登录邮箱（Lemon Squeezy checkout 预填）
  const { data: au } = await admin.auth.admin.getUserById(user.id);
  const email = au?.user?.email ?? '';

  // 创建 Checkout（custom client_id 烘焙进签名 URL，webhook 据此识别客户）
  const payload = {
    data: {
      type: 'checkouts',
      attributes: {
        checkout_data: {
          email,
          custom: { client_id: client.id },
        },
        product_options: {
          redirect_url: 'https://prompthub-pi-six.vercel.app/workstation?checkout=success',
        },
      },
      relationships: {
        store: { data: { type: 'stores', id: process.env.LEMON_SQUEEZY_STORE_ID } },
        variant: { data: { type: 'variants', id: process.env.LEMON_SQUEEZY_VARIANT_PRO } },
      },
    },
  };

  let res: Response;
  try {
    res = await fetch(`${LS_API}/checkouts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.LEMON_SQUEEZY_API_KEY}`,
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    return NextResponse.json({ error: 'Billing service unreachable.' }, { status: 502 });
  }

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to create checkout session.' }, { status: 502 });
  }
  const j = await res.json();
  const checkoutUrl = j?.data?.attributes?.url;
  if (!checkoutUrl) {
    return NextResponse.json({ error: 'Checkout session missing URL.' }, { status: 502 });
  }

  return NextResponse.json({ checkoutUrl });
}

export async function GET() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const { data: client } = await admin
    .from('clients')
    .select('id, tier, pro_expires_at')
    .eq('account_id', user.id)
    .maybeSingle();
  if (!client) return NextResponse.json({ error: 'No client account.' }, { status: 403 });

  const tier = effectiveTier(client.tier, client.pro_expires_at);
  const used = await countMonthlyUsage(admin, client.id);
  return NextResponse.json({
    configured: lsConfigured(),
    tier,
    limit: quotaLimit(tier),
    used,
    proExpiresAt: client.pro_expires_at,
  });
}
