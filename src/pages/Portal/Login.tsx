import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { SignIn } from '@clerk/react';
import { ShieldCheck, Users, UserPlus, ArrowLeft } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { ClerkSetupNotice } from '../../components/auth/ClerkSetupNotice';
import { academyClerkAppearance, useAppAuth } from '../../context/AuthContext';
import { SCHOOL_INFO } from '../../constants/data';

export const Login: React.FC = () => {
  const { isConfigured, authError } = useAppAuth();
  const location = useLocation();
  const rawFrom = (location.state as { from?: string } | null)?.from;
  const redirectAfterSignIn =
    typeof rawFrom === 'string' && rawFrom.startsWith('/') && !rawFrom.startsWith('//')
      ? rawFrom
      : '/portal';

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="School Portal Sign In"
        subtitle={`Sign in to ${SCHOOL_INFO.name} School Portal.`}
        breadcrumbs={[{ name: 'Portal', path: '/portal' }, { name: 'Sign In' }]}
      />

      <section className="py-12 sm:py-16 bg-[#F5F3ED] flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {!isConfigured ? (
            <ClerkSetupNotice authError={authError} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
              {/* Left: Clerk Sign In */}
              <div className="lg:col-span-7 flex flex-col items-center">
                <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-4 sm:p-6 flex justify-center overflow-hidden">
                  <SignIn
                    routing="path"
                    path="/portal/login"
                    signUpUrl="/portal/register"
                    fallbackRedirectUrl={redirectAfterSignIn}
                    appearance={academyClerkAppearance}
                  />
                </div>
              </div>

              {/* Right: Family Registration & Staff Notice */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6 sm:p-8 flex flex-col gap-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#102B46] text-[#D9B76A] flex items-center justify-center shrink-0">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-[#D9B76A]">
                        Families
                      </span>
                      <h2 className="text-xl font-extrabold text-[#102B46] font-['Manrope']">
                        Parents &amp; Guardians
                      </h2>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    New parents and guardians can create a family account to submit online
                    admission applications and monitor updates for their children.
                  </p>
                  <NavLink
                    to="/portal/register"
                    className="inline-flex items-center justify-center gap-2 bg-[#D9B76A] hover:bg-[#c9a658] text-[#102B46] px-5 py-3 rounded-xl font-bold text-sm transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Register Parent Account</span>
                  </NavLink>
                </div>

                <div className="bg-[#091C30] text-white rounded-3xl shadow-lg border border-[#D9B76A]/30 p-6 sm:p-8 flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#102B46] text-[#D9B76A] flex items-center justify-center shrink-0 border border-[#D9B76A]/30">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-[#D9B76A]">
                        Authorized Personnel
                      </span>
                      <h3 className="text-lg font-extrabold text-white font-['Manrope']">
                        Staff &amp; Administration
                      </h3>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Teachers, Admission Officers, Finance Officers, Principals, and General
                    Administrators sign in with their authorized school accounts.
                  </p>
                  <NavLink
                    to="/"
                    className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 text-[#D9B76A]" />
                    <span>Return to Public Website</span>
                  </NavLink>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
