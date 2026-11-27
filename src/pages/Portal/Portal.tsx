import React from 'react';
import { Navigate, NavLink } from 'react-router-dom';
import { SignIn } from '@clerk/react';
import {
  ArrowLeft,
  Clock,
  Loader2,
  LogOut,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { ClerkSetupNotice } from '../../components/auth/ClerkSetupNotice';
import { academyClerkAppearance, useAppAuth } from '../../context/AuthContext';
import { getDefaultPortalRoute } from '../../constants/roles';
import { SCHOOL_INFO } from '../../constants/data';

export const Portal: React.FC = () => {
  const {
    isConfigured,
    isLoaded,
    isSignedIn,
    user,
    authError,
    authorization,
    refreshAuthorization,
    signOut,
  } = useAppAuth();

  // 1. Authentication service unconfigured fallback
  if (!isConfigured) {
    return (
      <div className="flex flex-col min-h-screen">
        <PageHeader
          title="School Portal"
          subtitle={`Sign in to access ${SCHOOL_INFO.name} online services.`}
          breadcrumbs={[{ name: 'School Portal' }]}
        />
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-[#F5F3ED] flex-1">
          <ClerkSetupNotice authError={authError} />
        </section>
      </div>
    );
  }

  // 2. Loading Clerk session or resolving verified portal role
  if (!isLoaded || (isSignedIn && authorization.isChecking)) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 px-4 bg-[#F5F3ED]">
        <Loader2 className="w-10 h-10 text-[#102B46] animate-spin" />
        <p className="text-sm font-semibold text-[#102B46] font-['Manrope']">
          {!isLoaded ? 'Loading School Portal...' : 'Opening your portal workspace...'}
        </p>
      </div>
    );
  }

  // 3. Signed-in + Verified Role -> Automatic role-based redirect (never a generic role picker)
  if (isSignedIn && authorization.isVerified) {
    const targetRoute = getDefaultPortalRoute(authorization.allRoles);
    if (targetRoute !== '/portal') {
      return <Navigate to={targetRoute} replace />;
    }
  }

  // 4. Signed-in in Clerk, awaiting verification / no active role assigned yet
  if (isSignedIn) {
    return (
      <div className="flex flex-col min-h-screen">
        <PageHeader
          title="School Portal"
          subtitle={`${SCHOOL_INFO.name} • Account Verification`}
          breadcrumbs={[{ name: 'School Portal' }]}
        />

        <section className="py-14 sm:py-20 bg-[#F5F3ED] flex-1 px-4 sm:px-6 lg:px-8">
          <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-10 text-center flex flex-col items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-[#102B46] text-[#D9B76A] flex items-center justify-center shadow-md">
              <Clock className="w-8 h-8" />
            </div>

            <span className="px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-amber-500/10 text-amber-800 border border-amber-200">
              Access Verification Pending
            </span>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#102B46] font-['Manrope']">
              Welcome, {user?.firstName || user?.fullName || 'Portal User'}
            </h2>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              You are signed in with{' '}
              <strong className="text-[#102B46]">{user?.primaryEmail || 'your account'}</strong>.
              Your school portal access is currently awaiting verification.
            </p>

            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed bg-[#F5F3ED] border border-slate-200 rounded-2xl p-4 w-full">
              If your account was recently approved or assigned a role by school leadership, click{' '}
              <strong>Refresh Access</strong> below. Otherwise, please contact the school
              administration office for assistance.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full pt-2">
              <button
                type="button"
                onClick={() => void refreshAuthorization()}
                className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 bg-[#102B46] hover:bg-[#091C30] text-white px-5 py-3 rounded-xl font-bold text-sm transition-colors"
              >
                <RefreshCw className="w-4 h-4 text-[#D9B76A]" />
                <span>Refresh Access</span>
              </button>

              <NavLink
                to="/"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#F5F3ED] hover:bg-slate-200 text-[#102B46] px-5 py-3 rounded-xl font-bold text-sm border border-slate-200 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Public Website</span>
              </NavLink>

              <button
                type="button"
                onClick={() => void signOut()}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-700 px-5 py-3 rounded-xl font-bold text-sm border border-slate-300 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // 5. Unauthenticated Visitor: Clean, Branded School Portal Sign-In Experience
  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="School Portal Sign In"
        subtitle={`Secure access for Parents, Teachers, and Administration at ${SCHOOL_INFO.name}.`}
        breadcrumbs={[{ name: 'School Portal' }]}
      />

      <section className="py-12 sm:py-16 bg-[#F5F3ED] flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Left: Clerk Sign In (includes password/account recovery) */}
            <div className="lg:col-span-7 flex flex-col items-center">
              <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-4 sm:p-6 flex justify-center overflow-hidden">
                <SignIn
                  routing="path"
                  path="/portal"
                  signUpUrl="/portal/register"
                  fallbackRedirectUrl="/portal"
                  appearance={academyClerkAppearance}
                />
              </div>
            </div>

            {/* Right: Family Registration & Return Navigation */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6 sm:p-8 flex flex-col gap-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#102B46] text-[#D9B76A] flex items-center justify-center shrink-0">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#D9B76A]">
                      New Families
                    </span>
                    <h2 className="text-xl font-extrabold text-[#102B46] font-['Manrope']">
                      Parent &amp; Guardian Portal
                    </h2>
                  </div>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Register a family account to apply for admission for your children, manage
                  application forms, and view school notices.
                </p>
                <NavLink
                  to="/portal/register"
                  className="inline-flex items-center justify-center gap-2 bg-[#D9B76A] hover:bg-[#c9a658] text-[#102B46] px-5 py-3 rounded-xl font-bold text-sm transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Parent Account</span>
                </NavLink>
              </div>

              <div className="bg-[#091C30] text-white rounded-3xl shadow-lg border border-[#D9B76A]/30 p-6 sm:p-8 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#102B46] text-[#D9B76A] flex items-center justify-center shrink-0 border border-[#D9B76A]/30">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#D9B76A]">
                      Staff &amp; Leadership
                    </span>
                    <h3 className="text-lg font-extrabold text-white font-['Manrope']">
                      Authorized School Personnel
                    </h3>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Teachers, Admission Officers, Finance Officers, Principals, and School
                  Administrators sign in using their authorized account credentials.
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
        </div>
      </section>
    </div>
  );
};
