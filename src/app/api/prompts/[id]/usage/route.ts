// ============================================================
// POST /api/prompts/[id]/usage
// 递增提示词被复制/使用次数（fire-and-forget）
// ============================================================

import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const promptId = parseInt(params.id, 10);
    if (isNaN(promptId)) {
      return NextResponse.json({ error: 'Invalid prompt ID' }, { status: 400 });
    }

    // 使用 admin client 绕过 RLS 限制（prompts 表只有 SELECT 策略）
    const supabase = createAdminClient();

    // 使用 Supabase RPC 或原始 SQL 做原子递增
    const { error } = await supabase.rpc('increment_usage_count', {
      prompt_id: promptId,
    });

    // 如果 RPC 不存在，改用直接更新
    if (error) {
      // 先用 SELECT 获取当前值
      const { data: current } = await supabase
        .from('prompts')
        .select('usage_count')
        .eq('id', promptId)
        .single();

      if (current) {
        await supabase
          .from('prompts')
          .update({ usage_count: (current.usage_count || 0) + 1 })
          .eq('id', promptId);
      }
    }

    // 记录个人使用历史（登录用户 → user_usage，供"Recently used"）
    const authClient = createServerSupabaseClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (user) {
      try {
        await supabase.rpc('increment_user_usage', {
          p_user_id: user.id,
          p_asset_type: 'prompt',
          p_asset_id: promptId,
        });
      } catch {
        // 静默失败
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    // 静默失败 — 计数不影响核心功能
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
