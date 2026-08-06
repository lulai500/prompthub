// ============================================================
// 客户工作站引导页（owner / 普通用户访问 /workstation 时显示）
// 说明工作台是客户专属，按角色给出下一步
// ============================================================

import Link from 'next/link';
import { Workflow, UserPlus, ArrowRight } from 'lucide-react';

export default function WorkstationGuide({ role }: { role: 'owner' | 'user' }) {
  return (
    <div className="container-page py-16 max-w-2xl">
      <div className="card p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center mx-auto mb-4">
          <Workflow className="w-7 h-7 text-brand-600 dark:text-brand-400" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Customer Workstation
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          {role === 'owner'
            ? 'The workstation is a private AI workspace for each of your clients. Create client accounts to hand them their own workspace with AI execution and deliverables.'
            : 'The workstation is a private workspace for client accounts. Contact the account owner to get access.'}
        </p>
        {role === 'owner' ? (
          <Link href="/admin/clients" className="btn-primary">
            <UserPlus className="w-4 h-4" />
            Manage clients
            <ArrowRight className="w-4 h-4" />
          </Link>
        ) : (
          <Link href="/" className="btn-secondary">
            Back to home
          </Link>
        )}
      </div>
    </div>
  );
}
