import React from 'react';
import { NavLink } from 'react-router-dom';
import { KeyRound, ShieldAlert, ArrowLeft, ExternalLink } from 'lucide-react';

interface ClerkSetupNoticeProps {
  authError?: string | null;
}

export const ClerkSetupNotice: React.FC<ClerkSetupNoticeProps> = ({ authError }) => {
  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-10 max-w-2xl mx-auto">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-[#102B46] text-[#D9B76A] flex items-center justify-center shadow-md">
          {authError ? <ShieldAlert className="w-8 h-8" /> : <KeyRound className="w-8 h-8" />}
        </div>

        <span className="px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-amber-500/10 text-amber-800 border border-amber-200">
          Clerk Configuration Required
        </span>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#102B46] font-['Manrope']">
          Authentication Service Not Yet Configured
        </h2>

        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          The Father Abraham Children Academy portal is wired for <strong>Clerk Authentication</strong>,
          but a valid <code className="bg-[#F5F3ED] px-1.5 py-0.5 rounded text-[#102B46] font-mono text-xs">VITE_CLERK_PUBLISHABLE_KEY</code> environment variable has not been supplied yet.
        </p>

        {authError && (
          <div className="w-full bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs sm:text-sm text-left">
            <strong>Configuration Error:</strong> {authError}
          </div>
        )}

        <div className="w-full bg-[#F5F3ED] border border-slate-200 rounded-2xl p-5 text-left flex flex-col gap-3">
          <h3 className="text-sm font-bold text-[#102B46] uppercase tracking-wider font-['Manrope']">
            Required Setup Steps
          </h3>
          <ol className="list-decimal list-inside text-xs sm:text-sm text-slate-700 space-y-2 leading-relaxed">
            <li>Create an application in the <strong>Clerk Dashboard</strong> and enable Email/Password sign-in.</li>
            <li>
              Copy your <strong>Publishable Key</strong> (<code className="font-mono text-xs">pk_test_...</code> or <code className="font-mono text-xs">pk_live_...</code>) and set <code className="font-mono text-xs">VITE_CLERK_PUBLISHABLE_KEY</code> in your environment configuration.
            </li>
            <li>Keep <code className="font-mono text-xs">CLERK_SECRET_KEY</code> strictly on the server side (never prefixed with <code className="font-mono text-xs">VITE_</code>).</li>
            <li>Restart the development server or redeploy so the publishable key is loaded.</li>
          </ol>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full pt-2">
          <NavLink
            to="/"
            className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 bg-[#102B46] hover:bg-[#091C30] text-white px-6 py-3 rounded-xl font-bold text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-[#D9B76A]" />
            <span>Return to Public Website</span>
          </NavLink>
          <a
            href="https://dashboard.clerk.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#F5F3ED] hover:bg-slate-200 text-[#102B46] px-6 py-3 rounded-xl font-bold text-sm border border-slate-200 transition-colors"
          >
            <span>Clerk Dashboard</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
};
