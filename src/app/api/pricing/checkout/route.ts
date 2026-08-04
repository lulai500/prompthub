// ============================================================
// POST /api/pricing/checkout
// 网站会员订阅（Lemon Squeezy）——解锁完整 Skills/Workflows
// body: { variant: 'monthly' | 'quarterly' | 'yearly' }
// 需登录；user_id 烘焙进 custom data，webhook 据此更新 profiles.membership_tier
// ============================================================

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const LS_API = 'https://api.lemonsqueezy.com/v1';

const VARIANT_ENV: Record<'monthly' | 'quarterly' | 'yearly', string> = {
  monthly: 'LEMON_SQUEEZY_VARIANT_MONTHLY',
  quarterly: 'LEMON_SQUEEZY_VARIANT_QUARTERLY',
  yearly: 'LEMON_SQUEEZY_VARIANT_YEARLY',
};

function lsConfigured() {
  return Boolean(
    process.env.LEMON_SQUEEZY_API_KEY &&
      process.env.LEMON_SQUEEZY_STORE_ID &&
      process.env.LEMON_SQUEEZY_VARIANT_MONTHLY &&
      process.env.LEMON_SQUEEZY_VARIANT_QUARTERLY &&
      process.env.LEMON_SQUEEZY_VARIANT_YEARLY
  );
}

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Please sign in to subscribe.', status: 'auth' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const variant = body.variant as 'monthly' | 'quarterly' | 'yearly';
  if (variant !== 'monthly' && variant !== 'quarterly' && variant !== 'yearly') {
    return NextResponse.json({ error: 'variant must be monthly, quarterly or yearly.' }, { status: 400 });
  }

  if (!lsConfigured()) {
    return NextResponse.json(
      { error: 'Membership billing is not configured yet. Please try again later.' },
      { status: 501 }
    );
  }

  const variantEnv = VARIANT_ENV[variant];
  const payload = {
    data: {
      type: 'checkouts',
      attributes: {
        checkout_data: {
          email: user.email ?? '',
          custom: { user_id: user.id },
        },
        product_options: {
          redirect_url: 'https://prompthub-pi-six-gold.vercel.app/dashboard?checkout=success',
        },
      },
      relationships: {
        store: { data: { type: 'stores', id: process.env.LEMON_SQUEEZY_STORE_ID } },
        variant: { data: { type: 'variants', id: process.env[variantEnv] } },
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
