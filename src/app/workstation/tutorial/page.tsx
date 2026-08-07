// ============================================================
// 工作台新手教程 - 客户流程（独立教程页）
// 公开可访问（站主可把链接发给新客户，登录前即可阅读）
// 内容与站内真实 UI 对齐：配额条 / 统计 / 新建任务 / 看板 / 交付物弹窗 / Pro 升级
// ============================================================

import Link from 'next/link';
import type { Metadata } from 'next';
import {
  GraduationCap,
  KeyRound,
  LayoutDashboard,
  PlayCircle,
  FileText,
  Crown,
  HelpCircle,
  ArrowLeft,
  Check,
  Copy,
  Download,
  RefreshCw,
} from 'lucide-react';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Workstation Quickstart — Run Your First AI Task | PromptHub',
  description:
    'A 3-minute guide for new workstation users: log in, change your password, create a task, run it with AI, and collect your deliverable. Covers quotas and the Pro upgrade.',
};

interface TutorialStep {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: React.ReactNode;
}

const STEPS: TutorialStep[] = [
  {
    icon: GraduationCap,
    title: 'Before you start',
    body: (
      <p className="text-slate-600 dark:text-slate-300">
        Your account is created for you by the site owner. You will receive an{' '}
        <strong>email address</strong> and a <strong>temporary password</strong>. On your first
        login you must change the password — that single step is required before you can use the
        workstation.
      </p>
    ),
  },
  {
    icon: KeyRound,
    title: 'Log in & change your password',
    body: (
      <>
        <p className="text-slate-600 dark:text-slate-300 mb-2">
          Go to <Link href="/auth/login" className="text-brand-600 dark:text-brand-400 hover:underline">the login page</Link> and
          sign in with the email and temporary password you received.
        </p>
        <ol className="list-decimal pl-5 space-y-1 text-slate-600 dark:text-slate-300">
          <li>Enter your email and temporary password, then click <strong>Sign in</strong>.</li>
          <li>
            A <em>change-password</em> panel appears — set a new password (at least{' '}
            <strong>8 characters</strong>) and confirm it.
          </li>
          <li>You are now inside the workstation.</li>
        </ol>
      </>
    ),
  },
  {
    icon: LayoutDashboard,
    title: 'Meet the workstation',
    body: (
      <>
        <p className="text-slate-600 dark:text-slate-300 mb-2">
          The workstation is one page with four parts:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
          <li>
            <strong>Quota bar</strong> — your monthly AI-run allowance (Free: 20 runs/month; Pro:
            500). Shows how many runs you have left.
          </li>
          <li>
            <strong>Stats panel</strong> — your total tasks, completed count, tokens used, and your
            7-day activity trend.
          </li>
          <li>
            <strong>New task area</strong> — where you describe what you want and run it.
          </li>
          <li>
            <strong>Task board</strong> — every task you have created, filterable by status
            (All / Pending / Running / Completed / Failed).
          </li>
        </ul>
      </>
    ),
  },
  {
    icon: PlayCircle,
    title: 'Create & run a task',
    body: (
      <>
        <ol className="list-decimal pl-5 space-y-1 text-slate-600 dark:text-slate-300">
          <li>
            Pick a <strong>project</strong> from the dropdown — or create one inline with{' '}
            <strong>New project</strong> if you do not have one yet.
          </li>
          <li>
            Describe what you need in the input box (for example:{' '}
            <em>"Write a Python function that validates email addresses"</em> or{' '}
            <em>"Draft a customer reply about a delayed order"</em>).
          </li>
          <li>
            Click <strong>Run</strong>. The task is created and starts generating immediately — its
            status moves automatically: <span className="font-mono text-xs">pending → running → completed</span>.
          </li>
        </ol>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
          You can leave the page and come back later — running tasks continue in the background and
          their result is saved to your account.
        </p>
      </>
    ),
  },
  {
    icon: FileText,
    title: 'View your deliverable',
    body: (
      <>
        <ol className="list-decimal pl-5 space-y-1 text-slate-600 dark:text-slate-300">
          <li>Click a <strong>Completed</strong> task on the board to open the deliverable.</li>
          <li>
            The modal shows your original request (<em>Your request</em>) and the AI-generated
            result.
          </li>
          <li>
            Three actions: <span className="inline-flex items-center gap-1"><Copy className="w-3.5 h-3.5" /> Copy</span> to
            clipboard, <span className="inline-flex items-center gap-1"><Download className="w-3.5 h-3.5" /> Download</span> as a{' '}
            <span className="font-mono text-xs">.txt</span> file, or <span className="inline-flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5" /> Regenerate</span> to
            get another take.
          </li>
        </ol>
      </>
    ),
  },
  {
    icon: Crown,
    title: 'Quota & Pro upgrade',
    body: (
      <>
        <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
          <li>
            <strong>Free</strong> includes <strong>20 runs per month</strong> — counted from the
            start of each month (UTC). Running tasks and completed tasks count toward the limit;
            failed ones do not.
          </li>
          <li>
            When you use up your allowance, an <strong>upgrade</strong> button appears. Paying once
            unlocks <strong>Pro</strong>: <strong>500 runs per month</strong>.
          </li>
          <li>
            After payment you are returned to the workstation with a confirmation banner. Your tier
            updates automatically.
          </li>
        </ul>
      </>
    ),
  },
  {
    icon: HelpCircle,
    title: 'Common questions',
    body: (
      <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
        <li>
          <strong>A task failed?</strong> Click <strong>Retry</strong> on the failed task to run it
          again.
        </li>
        <li>
          <strong>Want a different result?</strong> Use <strong>Regenerate</strong> in the
          deliverable modal — it re-runs the same request.
        </li>
        <li>
          <strong>Looking for one project&apos;s work?</strong> Use the project filter on the task
          board.
        </li>
        <li>
          <strong>Nothing disappears when you refresh</strong> — tasks and deliverables are stored
          in your account.
        </li>
        <li>
          <strong>Need more help?</strong> Contact the person who gave you access to this
          workstation.
        </li>
      </ul>
    ),
  },
];

export default function WorkstationTutorialPage() {
  return (
    <div className="container-page py-10 max-w-3xl">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-sm font-medium mb-3">
        <GraduationCap className="w-4 h-4" />
        Workstation Tutorial
      </div>

      <h1 className="page-title">Workstation Quickstart</h1>
      <p className="page-subtitle">
        From your first login to your first deliverable — in about three minutes.
      </p>

      <div className="mt-8 space-y-4">
        {STEPS.map((step, i) => (
          <div key={step.title} className="card p-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 shrink-0 rounded-full bg-brand-600 text-white flex items-center justify-center text-sm font-semibold">
                {i}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <step.icon className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                  {step.title}
                </h2>
                <div className="mt-2">{step.body}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
        <Link
          href="/workstation"
          className="btn-primary inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Workstation
        </Link>
        <p className="text-sm text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
          <Check className="w-3.5 h-3.5 text-emerald-500" />
          You only need to do this once — future visits are familiar.
        </p>
      </div>
    </div>
  );
}
