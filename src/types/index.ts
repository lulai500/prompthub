// ============================================================
// PromptHub - 全局 TypeScript 类型定义
// ============================================================

/** 用户扩展资料（关联 Supabase Auth） */
export interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  membership_tier: MembershipTier;
  membership_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

/** 会员等级 */
export type MembershipTier = 'free' | 'monthly' | 'quarterly' | 'yearly';

/** 提示词分类 */
export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  created_at: string;
}

/** 提示词（核心实体） */
export interface Prompt {
  id: number;
  title: string;
  slug: string | null;
  description: string | null;
  content: string;
  category_id: number | null;
  model_name: string | null;
  tips: string | null;
  example_output: string | null;
  screenshot_urls: string[];
  tags: string[];
  usage_count: number;
  is_published: boolean;
  author_id?: string | null;
  created_at: string;
  updated_at: string;
  // 关联数据（通过 JOIN 查询获得）
  category?: Category | null;
  author?: ProfilePublic | null;
  // 聚合统计（来自 prompt_stats 视图）
  favorite_count?: number;
  avg_rating?: number;
  rating_count?: number;
}

/** 用户公开信息（脱敏） */
export interface ProfilePublic {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

/** 评分 */
export interface Rating {
  id: number;
  user_id: string;
  prompt_id: number;
  rating: number; // 1-5
  created_at: string;
  updated_at: string;
}

/** 收藏文件夹 */
export interface Folder {
  id: number;
  user_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

/** 用户收藏 */
export interface Favorite {
  id: number;
  user_id: string;
  prompt_id: number;
  folder_id: number | null;
  created_at: string;
  // 关联的提示词（JOIN 获得）
  prompt?: Prompt;
  // 关联的文件夹
  folder?: Folder | null;
}

/** 订单记录（付费功能休眠中） */
export interface Order {
  id: number;
  user_id: string;
  lemon_squeezy_order_id: string | null;
  lemon_squeezy_subscription_id: string | null;
  product_name: string | null;
  amount: number | null;
  currency: string;
  status: OrderStatus;
  paid_at: string | null;
  created_at: string;
}

/** 订单状态 */
export type OrderStatus = 'pending' | 'paid' | 'refunded' | 'cancelled';

/** Lemon Squeezy Webhook 事件类型 */
export interface LemonSqueezyWebhookEvent {
  meta: {
    event_name: string;
    custom_data?: Record<string, unknown>;
  };
  data: {
    id: string;
    type: string;
    attributes: {
      order_id?: number;
      order_number?: number;
      status?: string;
      total?: number;
      currency?: string;
      first_order_item?: {
        product_name?: string;
        variant_name?: string;
      };
      urls?: {
        receipt?: string;
      };
    };
    relationships?: {
      subscriptions?: {
        data?: Array<{ id: string }>;
      };
    };
  };
}

/** 搜索/筛选参数 */
export interface PromptFilters {
  search?: string;
  category?: string;
  tags?: string[];
  page?: number;
  limit?: number;
}

/** API 响应格式 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
