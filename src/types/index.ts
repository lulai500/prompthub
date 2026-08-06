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
  role?: 'user' | 'owner' | 'client';
  must_change_password?: boolean;
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
      // 订阅事件字段（subscription_created/updated/cancelled/expired；status 已有，见上）
      renews_at?: string | null;
      ends_at?: string | null;
      variant_id?: number;
      variant_name?: string;
      product_name?: string;
      user_email?: string;
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

// ============================================================
// 三支柱扩展：Skills / Workflows
// ============================================================

/** 技能分类 */
export interface SkillCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  created_at: string;
}

/** 技能格式（对应 target 生态） */
export type SkillFormat =
  | 'claude-skill'
  | 'claude-code'
  | 'cursor-rules'
  | 'codex'
  | 'gpt-actions'
  | 'gemini-extension'
  | 'cross-model';

/** 技能（可安装的能力包） */
export interface Skill {
  id: number;
  title: string;
  slug: string | null;
  description: string | null;
  content: string;
  skill_format: SkillFormat;
  compatible_models: string[];
  install_instructions: string | null;
  example_output: string | null;
  category_id: number | null;
  author_id?: string | null;
  tags: string[];
  usage_count: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  // 关联数据
  category?: SkillCategory | null;
  author?: ProfilePublic | null;
}

/** 工作流分类 */
export interface WorkflowCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  created_at: string;
}

/** 工作流类型 */
export type WorkflowType = 'agent-orchestration' | 'automation-template' | 'dev-scaffold';

/** 工作流步骤（steps JSONB 中的单步） */
export interface WorkflowStep {
  step: number;
  title: string;
  tool: string;
  action: string;
  config?: string;
}

/** 工作流（可编排的多步骤流程） */
export interface Workflow {
  id: number;
  title: string;
  slug: string | null;
  description: string | null;
  /** 步骤数（steps_count 生成列，公开元数据；steps 本体仅会员/服务端可读） */
  steps_count?: number | null;
  steps: WorkflowStep[];
  workflow_type: WorkflowType;
  tools_required: string[];
  config_content: string | null;
  expected_output: string | null;
  tips: string | null;
  category_id: number | null;
  author_id?: string | null;
  tags: string[];
  usage_count: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  // 关联数据
  category?: WorkflowCategory | null;
  author?: ProfilePublic | null;
}

/** 统一资源视图行（assets_v，跨三支柱搜索用） */
export interface Asset {
  asset_type: 'prompt' | 'skill' | 'workflow';
  id: number;
  title: string;
  slug: string;
  description: string | null;
  tags: string[];
  model_name: string;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

/* ---- 客户工作站（B2B 接单工具） ---- */

/** 客户（=客户登录账号的归属档案，站主创建） */
export interface Client {
  id: number;
  account_id: string;
  name: string;
  email: string | null;
  owner_id: string;
  status: 'active' | 'paused' | 'archived';
  tier: 'free' | 'pro';
  pro_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

/** 客户订阅（Lemon Squeezy，控制工作站 Pro 额度） */
export interface ClientSubscription {
  id: number;
  client_id: number;
  lemon_squeezy_subscription_id: string;
  variant_id: string | null;
  status: 'active' | 'cancelled' | 'expired';
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

/** 客户项目 */
export interface ClientProject {
  id: number;
  client_id: number;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
}

/** 客户任务（AI 执行 + 交付物落点） */
export interface ClientTask {
  id: number;
  project_id: number;
  client_id: number;
  title: string;
  input: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  matched_task_slug: string | null;
  prompt_id: number | null;
  result: string | null;
  tokens: number | null;
  /** 失败原因（服务端写友好文案，客户可见） */
  error: string | null;
  asset_ids: unknown[];
  created_at: string;
  updated_at: string;
}
