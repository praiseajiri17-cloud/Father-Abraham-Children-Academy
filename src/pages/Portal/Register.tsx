import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { SignUp } from '@clerk/react';
import { ShieldAlert, CheckCircle2, LogIn, ArrowLeft } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { ClerkSetupNotice } from '../../components/auth/ClerkSetupNotice';
import { academyClerkAppearance, useAppAuth } from '../../context/AuthContext';
import { SCHOOL_INFO } from '../../constants/data';

export const Register: React.FC = () => {
  const { isConfigured, authError } = useAppAuth();
  const location = useLocation();
  const state = location.state as { from?: string; admissionIntent?: boolean } | null;
  const admissionIntent =
    Boolean(state?.admissionIntent) ||
    new URLSearchParams(location.search).get('intent') === 'admission';

  const fallbackRedirect =
    state?.from === '/portal/parent' || admissionIntent ? '/portal/parent' : '/portal';

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title={admissionIntent ? 'Apply for Admission' : 'Parent & Guardian Registration'}
        subtitle={`Create a family portal account for ${SCHOOL_INFO.name}.`}
        breadcrumbs={[
          { name: 'Portal', path: '/portal' },
          { name: admissionIntent ? 'Admission Registration' : 'Parent Registration' },
        ]}
      />

      <section className="py-12 sm:py-16 bg-[#F5F3ED] flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {!isConfigured ? (
            <ClerkSetupNotice authError={authError} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
              {/* Left: Clerk Sign Up */}
              <div className="lg:col-span-7 flex flex-col items-center">
                <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-4 sm:p-6 flex justify-center overflow-hidden">
                  <SignUp
                    routing="path"
                    path="/portal/register"
                    signInUrl="/portal/login"
                    fallbackRedirectUrl={fallbackRedirect}
                    appearance={academyClerkAppearance}
                  />
                </div>
              </div>

              {/* Right: Parent Registration Guidance */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6 sm:p-8 flex flex-col gap-5">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#102B46]/10 text-[#102B46] w-max">
                    Parent Account Only
                  </span>
                  <h2 className="text-2xl font-extrabold text-[#102B46] font-['Manrope']">
                    {admissionIntent ? 'Start Your Child’s Application' : 'Family Account Policy'}
                  </h2>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Create one parent account to manage online admission applications for all
                    children in your family, save drafts, and track updates.
                  </p>
                  <ul className="flex flex-col gap-3 text-sm text-slate-700">
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-[#15803D] shrink-0 mt-0.5" />
                      <span>Submit and manage applications for multiple children under one account.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-[#15803D] shrink-0 mt-0.5" />
                      <span>Self-registration is strictly for Parents and Guardians.</span>
                    </li>
                  </ul>

                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <p className="text-xs text-slate-500">Already have a parent account?</p>
                    <NavLink
                      to="/portal/login"
                      state={{ from: fallbackRedirect }}
                      className="inline-flex items-center justify-center gap-2 w-full bg-[#102B46] hover:bg-[#091C30] text-white px-5 py-3 rounded-xl font-bold text-sm transition-colors"
                    >
                      <LogIn className="w-4 h-4 text-[#D9B76A]" />
                      <span>Sign In Instead</span>
                    </NavLink>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex items-start gap-3">
                  <ShieldAlert className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-1">
                    <h3 className="text-sm font-bold text-amber-900 font-['Manrope']">
                      Notice for Teachers &amp; Staff
                    </h3>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      Teachers and administrative staff do not register via this form. Staff access
                      is issued exclusively by the School Administration.
                    </p>
                  </div>
                </div>

                <NavLink
                  to="/"
                  className="inline-flex items-center justify-center gap-2 text-xs font-bold text-[#102B46] hover:text-[#D9B76A]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Return to Public Website</span>
                </NavLink>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
