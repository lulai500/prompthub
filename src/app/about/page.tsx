// ============================================================
// 关于页面（SSR 版本）
// 展示真实平台数据 + 使命 + 技术栈
// ============================================================

import { Sparkles, Globe, Shield, Zap, Users, Heart } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const features = [
  {
    icon: Globe,
    title: 'Community Driven',
    description:
      'Prompts are shared by developers, writers, and AI enthusiasts from around the world. Everyone benefits from collective knowledge.',
  },
  {
    icon: Shield,
    title: 'Free Forever',
    description:
      'Core features will always be free. Browse, search, save, and organize unlimited prompts without paying a cent.',
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description:
      'Built with Next.js 14 and Supabase for instant page loads. Find the right prompt when inspiration strikes.',
  },
  {
    icon: Users,
    title: 'For Everyone',
    description:
      'Whether you are a programmer, novelist, or AI hobbyist — there is a prompt category tailored to your needs.',
  },
  {
    icon: Sparkles,
    title: 'Curated Quality',
    description:
      'Each prompt includes tuning tips, compatible model info, and usage examples to help you get the best results.',
  },
  {
    icon: Heart,
    title: 'Open Source',
    description:
      'The entire platform is open source. You can self-host, contribute, or customize it to fit your workflow.',
  },
];

/** 格式化统计数据：大数取整加 "+"，小值显示精确数字 */
function formatStat(count: number): string {
  if (count >= 100) {
    // 100+ → 向下取整到十位
    const rounded = Math.floor(count / 10) * 10;
    return `${rounded.toLocaleString()}+`;
  }
  if (count >= 20) {
    // 20~99 → 显示精确值 + "+"
    return `${count.toLocaleString()}+`;
  }
  // < 20 → 显示精确数字，避免 "3+ members" 这种尴尬
  return count.toLocaleString();
}

export default async function AboutPage() {
  const supabase = createServerSupabaseClient();
  const githubUrl = process.env.NEXT_PUBLIC_GITHUB_URL || 'https://github.com';

  // 获取真实统计数据
  const [promptResult, categoryResult, userResult] = await Promise.all([
    supabase.from('prompts').select('*', { count: 'exact', head: true }).eq('is_published', true),
    supabase.from('categories').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
  ]);

  const stats = [
    { label: 'Prompts', value: formatStat(promptResult.count || 0) },
    { label: 'Categories', value: formatStat(categoryResult.count || 0) },
    { label: 'Community Members', value: formatStat(userResult.count || 0) },
  ];

  return (
    <div className="container-page py-16">
      {/* Hero */}
      <div className="text-center mb-12">
        <h1 className="page-title text-slate-900 dark:text-white">
          About PromptHub
        </h1>
        <p className="page-subtitle max-w-2xl mx-auto">
          We believe great AI prompts should be discoverable, shareable, and
          free. PromptHub is the community platform making that happen.
        </p>
      </div>

      {/* 真实数据统计 */}
      <div className="grid grid-cols-3 gap-6 max-w-xl mx-auto mb-16">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-5 text-center">
            <p className="text-2xl sm:text-3xl font-extrabold text-brand-600 dark:text-brand-400">
              {stat.value}
            </p>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* 功能特性 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
        {features.map((feature) => (
          <div key={feature.title} className="card p-6">
            <div className="w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center mb-4">
              <feature.icon className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
              {feature.title}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              {feature.description}
            </p>
          </div>
        ))}
      </div>

      {/* Mission */}
      <div className="max-w-3xl mx-auto">
        <div className="card p-8 text-center">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
            Our Mission
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
            The AI landscape evolves daily. New models, new techniques, and new
            best practices emerge constantly. PromptHub exists to capture this
            collective knowledge — making it accessible to everyone, from
            beginners writing their first prompt to experts pushing the
            boundaries of what AI can do.
          </p>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
            We are committed to keeping the core platform free forever. Premium
            features will be additive — not gatekeeping existing functionality.
            Every prompt on this platform is contributed by and for the
            community.
          </p>

          <div className="flex items-center justify-center gap-4 text-sm flex-wrap">
            <a
              href="mailto:hello@prompthub.app"
              className="btn-secondary"
            >
              Contact Us
            </a>
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              View on GitHub
            </a>
          </div>
        </div>
      </div>

      {/* 技术栈 */}
      <div className="max-w-3xl mx-auto mt-8 text-center">
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Built with Next.js 14 · Supabase · Tailwind CSS · Deployed on Vercel
        </p>
      </div>
    </div>
  );
}
