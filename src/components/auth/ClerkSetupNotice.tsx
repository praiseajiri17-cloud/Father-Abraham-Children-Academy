import React from 'react';
import { NavLink } from 'react-router-dom';
import { KeyRound, ShieldAlert, ArrowLeft } from 'lucide-react';

interface ClerkSetupNoticeProps {
  authError?: string | null;
}

export const ClerkSetupNotice: React.FC<ClerkSetupNoticeProps> = ({ authError }) => {
  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-10 max-w-xl mx-auto">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-[#102B46] text-[#D9B76A] flex items-center justify-center shadow-md">
          {authError ? <ShieldAlert className="w-8 h-8" /> : <KeyRound className="w-8 h-8" />}
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#102B46] font-['Manrope']">
          School Portal Temporarily Unavailable
        </h2>

        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          Portal sign-in is currently undergoing maintenance. Please check back shortly or contact
          the school office for admissions assistance.
        </p>

        {import.meta.env.DEV && authError && (
          <div className="w-full bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl text-xs text-left">
            {authError}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full pt-2">
          <NavLink
            to="/"
            className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 bg-[#102B46] hover:bg-[#091C30] text-white px-6 py-3 rounded-xl font-bold text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-[#D9B76A]" />
            <span>Return to Public Website</span>
          </NavLink>
          <NavLink
            to="/contact"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#F5F3ED] hover:bg-slate-200 text-[#102B46] px-6 py-3 rounded-xl font-bold text-sm border border-slate-200 transition-colors"
          >
            <span>Contact School</span>
          </NavLink>
        </div>
      </div>
    </div>
  );
};
