'use client';
// ============================================================
// Fork 按钮：复制资产 → 跳转提交流预填，方便改造后再提交
// 数据经 sessionStorage 传递（避免 URL 长度限制）
// ============================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GitFork, Loader2 } from 'lucide-react';

export interface ForkPayload {
  type: 'prompt' | 'skill' | 'workflow';
  title: string;
  description?: string;
  content: string;
  model_name?: string;
  tips?: string;
  example_output?: string;
  skill_format?: string;
  compatible_models?: string;
  install_instructions?: string;
  workflow_type?: string;
  tools_required?: string;
  steps?: string;
  config_content?: string;
  expected_output?: string;
}

interface ForkButtonProps {
  data: ForkPayload;
  label?: string;
}

export default function ForkButton({ data, label = 'Fork & remix' }: ForkButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  function handleFork() {
    setLoading(true);
    try {
      sessionStorage.setItem('fork-data', JSON.stringify(data));
    } catch {
      // sessionStorage 不可用时退化为普通跳转
    }
    router.push('/submit');
  }

  return (
    <button
      onClick={handleFork}
      disabled={loading}
      className="btn-ghost text-sm w-full"
      title="Copy this asset as your own draft to remix and resubmit"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <GitFork className="w-4 h-4" />
      )}
      {label}
    </button>
  );
}
