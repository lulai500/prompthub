// ============================================================
// 小精霊（Little Spirit）- 落地页（静态，无后端依赖）
// 复用现有 UI 框架：container-page / card / btn-primary / btn-secondary / brand 渐变
// ============================================================

import Link from 'next/link';
import {
  ArrowRight,
  MessageCircle,
  Mic,
  Brain,
  Heart,
  Volume2,
  Download,
  ShieldCheck,
  Sparkles,
  Moon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const PRIVACY_URL = 'https://prompthub-pi-six.vercel.app/privacy';

// 功能点
const FEATURES: Array<{ icon: LucideIcon; title: string; desc: string }> = [
  { icon: MessageCircle, title: '会話', desc: 'AIと自然にチャット。あなたのことを少しずつ知っていく。' },
  { icon: Brain, title: '記憶', desc: 'あなたの言葉や好みを覚えて、会話に活かす。' },
  { icon: Mic, title: 'AI通話', desc: 'まるで電話のように、ハンズフリーで話せる。' },
  { icon: Volume2, title: '声', desc: '返事を音声で読み上げ、いつもそばにいる感覚に。' },
  { icon: Heart, title: '好感度・絆', desc: 'やり取りを重ねるほど、関係が深まっていく。' },
  { icon: Moon, title: '癒しの存在', desc: 'おだやかな和風のデザインで、心をほどく時間を。' },
];

// 特色区
const HIGHLIGHTS: Array<{ icon: LucideIcon; title: string; desc: string }> = [
  { icon: Brain, title: 'ずっと覚えている', desc: '話した内容や思い出を記憶し、あなただけの関係を育てます。' },
  { icon: Mic, title: '声で話せる', desc: 'AI通話で、文字ではなく声で会話できます。' },
  { icon: Heart, title: '成長する絆', desc: '会話を重ねるたびに、好感度や親密度が深まります。' },
];

export default function HomePage() {
  return (
    <div>
      {/* ---- 英雄区 ---- */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-50/60 dark:from-brand-950/20 to-transparent" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-400/10 rounded-full blur-3xl" />

        <div className="container-page relative py-20 sm:py-28 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            あなたのスマホに住む、AIの話し相手
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-3xl mx-auto leading-tight">
            ただ、話しかけるだけで
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-cyan-400">
              そばにいてくれる
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            小精霊は、あなたの言葉を覚えて、一緒に育つ AI のパートナー。
            会話も、通話も、記憶も。ぜんぶ、ひとつのアプリで。
          </p>

          {/* CTA 按钮 */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/download" className="btn-primary text-base px-8 py-3">
              <Download className="w-5 h-5" />
              アプリをダウンロード
            </Link>
            <Link href={PRIVACY_URL} className="btn-secondary text-base px-8 py-3">
              <ShieldCheck className="w-5 h-5" />
              プライバシーポリシー
            </Link>
          </div>

          {/* 统计 */}
          <div className="mt-12 flex items-center justify-center gap-8 sm:gap-12">
            {[
              { label: '会話', value: 'AIとチャット', icon: MessageCircle },
              { label: '通話', value: '声で話せる', icon: Mic },
              { label: '記憶', value: 'あなたを覚える', icon: Brain },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <s.icon className="w-5 h-5 text-brand-500 mx-auto mb-1.5" />
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{s.value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- 功能区 ---- */}
      <section className="py-16">
        <div className="container-page">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              主な機能
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              あなたに寄り添う、すべてがここに
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="card p-6 group hover:border-brand-300 dark:hover:border-brand-700 transition-all">
                <div className="w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center mb-3">
                  <f.icon className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white">{f.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- 特色区 ---- */}
      <section className="py-16 bg-slate-50 dark:bg-dark-950">
        <div className="container-page">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              だれよりも、あなたを知っている
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HIGHLIGHTS.map((h) => (
              <div key={h.title} className="card p-6">
                <div className="w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center mb-3">
                  <h.icon className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white">{h.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{h.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- CTA 区 ---- */}
      <section className="py-16 bg-gradient-to-br from-brand-50/60 via-slate-50 to-cyan-50/60 dark:from-brand-950/20 dark:via-dark-950 dark:to-cyan-950/10">
        <div className="container-page text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            さあ、はじめよう
          </h2>
          <p className="mt-3 text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
            無料でダウンロードして、あなただけの AI パートナーと出会ってください。
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link href="/download" className="btn-primary px-8 py-3">
              アプリをダウンロード
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href={PRIVACY_URL} className="btn-secondary px-8 py-3">
              プライバシーポリシー
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
