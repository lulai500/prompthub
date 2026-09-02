// ============================================================
// 小精霊 - プライバシーポリシー（Vercel 站点自有页面）
// ============================================================

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'プライバシーポリシー',
};

const POLICY: Array<{ h: string; body: string | string[] }> = [
  {
    h: '1. 収集する情報',
    body: [
      '– 会話内容・記憶：あなたの入力したメッセージ、本アプリが記憶した情報（名前・好きなこと・予定など）。既定では端末内に保存されます。',
      '– アカウント情報：クラウド連携を行う場合、登録時のメールアドレス（または電話番号）。',
      '– クラウドバックアップ：有効にすると、会話・設定データがサーバー（小精霊クラウド）にアップロードされ、機種変更時の復元に使われます。',
      '– 音声入力：マイクを使用する際、音声は文字に変換する目的でのみ使用されます。音声データ自体は保存・送信しません。',
    ],
  },
  {
    h: '2. 情報の利用目的',
    body: [
      '– AIとの会話応答を生成するため',
      '– 記憶した内容を会話に反映し、パーソナライズするため',
      '– クラウドバックアップ・端末間同期を提供するため',
      '– 音源・機能の提供、およびサポート対応のため',
    ],
  },
  {
    h: '3. AI応答と第三者提供',
    body: 'AI応答を生成するため、メッセージは本アプリのサーバー経由で第三者LLM（DeepSeek / 通義千問など）に送信され、返答が生成されます。これ以外に、あなたの個人情報を第三者へ販売・提供することはありません。',
  },
  {
    h: '4. 保存期間と削除',
    body: [
      '– 端末内の会話・記憶・設定は、アプリの設定からいつでも削除できます。',
      '– クラウドバックアップは、アプリ内のクラウド設定から削除できます。',
    ],
  },
  {
    h: '5. 権限',
    body: [
      '– マイク：音声入力（AI通話・音声で話す）時のみ使用。',
      '– 通知：リマインダーなどの通知を表示するため。',
      '– その他のアプリの上に表示：フローティング機能（任意）のため。',
    ],
  },
  { h: '6. 対象', body: '本アプリは13歳未満のお子様を対象としておりません。13歳未満の方はご利用いただけません。' },
  { h: '7. お問い合わせ', body: 'プライバシーに関するご質問・ご要望は、下記までお問い合わせください：jnl949634@gmail.com' },
];

export default function PrivacyPage() {
  return (
    <div className="container-page py-12">
      <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-dark-700 pb-4 mb-2">
        プライバシーポリシー
      </h1>
      <p className="text-sm text-slate-400 dark:text-slate-500 mb-6">最終更新日：2026年9月2日</p>
      <p className="text-slate-600 dark:text-slate-300 mb-6">
        「小精霊 (Little Spirit)」は、あなたのスマートフォンに住むAIの話し相手です。あなたのプライバシーを大切にします。以下の内容をご確認の上ご利用ください。
      </p>

      <div className="space-y-6">
        {POLICY.map((sec) => (
          <section key={sec.h}>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{sec.h}</h2>
            {Array.isArray(sec.body) ? (
              <ul className="mt-2 space-y-1.5 text-slate-600 dark:text-slate-300 list-disc list-inside">
                {sec.body.map((li) => (
                  <li key={li}>{li}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-slate-600 dark:text-slate-300">{sec.body}</p>
            )}
          </section>
        ))}
      </div>

      <p className="mt-8 text-sm text-slate-400 dark:text-slate-500">
        ※ 本ポリシーは、アプリの機能変更に合わせて随時更新される場合があります。
      </p>
    </div>
  );
}
