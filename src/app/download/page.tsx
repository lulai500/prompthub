// ============================================================
// 小精霊 - ダウンロードページ
// APK 地址通过环境变量 NEXT_PUBLIC_APK_URL 配置；未设时回退后台 /download
// ============================================================

import type { Metadata } from 'next';
import { Download, Smartphone } from 'lucide-react';

export const metadata: Metadata = {
  title: 'ダウンロード',
};

const FALLBACK_APK = 'http://43.136.172.42:5000/download';
const apkUrl = process.env.NEXT_PUBLIC_APK_URL?.trim() || FALLBACK_APK;

export default function DownloadPage() {
  return (
    <div className="container-page py-16 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 mb-6">
        <Smartphone className="w-8 h-8" />
      </div>
      <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
        小精霊をダウンロード
      </h1>
      <p className="mt-4 text-slate-600 dark:text-slate-300 max-w-md mx-auto">
        Android アプリ「小精霊」の APK をダウンロードして、あなたのスマホに住む AI パートナーと出会ってください。
      </p>
      <div className="mt-8 flex items-center justify-center">
        <a
          href={apkUrl}
          download
          className="btn-primary px-10 py-3 text-base"
        >
          <Download className="w-5 h-5" />
          APK をダウンロード
        </a>
      </div>
      <p className="mt-6 text-sm text-slate-400 dark:text-slate-500">
        ※ ご利用の際は、端末で「提供元不明のアプリ」の許可が必要な場合があります。
      </p>
    </div>
  );
}
