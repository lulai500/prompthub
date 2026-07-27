// ============================================================
// 关于页面
// 介绍 PromptHub 的使命和功能
// ============================================================

import { Sparkles, Globe, Shield, Zap, Users, Heart } from 'lucide-react';

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

export default function AboutPage() {
  return (
    <div className="container-page py-16">
      {/* Hero */}
      <div className="text-center mb-16">
        <h1 className="page-title text-slate-900 dark:text-white">
          About PromptHub
        </h1>
        <p className="page-subtitle max-w-2xl mx-auto">
          We believe great AI prompts should be discoverable, shareable, and
          free. PromptHub is the community platform making that happen.
        </p>
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

          <div className="flex items-center justify-center gap-4 text-sm">
            <a
              href="mailto:hello@prompthub.app"
              className="btn-secondary"
            >
              Contact Us
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
