import React from 'react';
import { Navigate, NavLink, useLocation } from 'react-router-dom';
import { ShieldAlert, Loader2, LogOut, ArrowLeft, Lock, Database } from 'lucide-react';
import { useAppAuth } from '../../context/AuthContext';
import { SystemRole } from '../../types/auth';
import { SYSTEM_ROLE_DEFINITIONS } from '../../constants/roles';
import { PageHeader } from '../common/PageHeader';
import { ClerkSetupNotice } from './ClerkSetupNotice';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: SystemRole[];
  sectionTitle?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles,
  sectionTitle = 'Portal Area',
}) => {
  const { isConfigured, isLoaded, isSignedIn, user, authError, authorization, signOut } =
    useAppAuth();
  const location = useLocation();

  // 1. Clerk not yet configured in environment: show explicit configuration notice (never bypass)
  if (!isConfigured) {
    return (
      <div className="flex flex-col min-h-screen">
        <PageHeader
          title={sectionTitle}
          subtitle="Protected School Portal Access"
          breadcrumbs={[{ name: 'Portal', path: '/portal' }, { name: sectionTitle }]}
        />
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-[#F5F3ED] flex-1">
          <ClerkSetupNotice authError={authError} />
        </section>
      </div>
    );
  }

  // 2. Loading Clerk session or resolving verified Supabase roles
  if (!isLoaded || (isSignedIn && authorization.isChecking)) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 px-4 bg-[#F5F3ED]">
        <Loader2 className="w-10 h-10 text-[#102B46] animate-spin" />
        <p className="text-sm font-semibold text-[#102B46] font-['Manrope']">
          {!isLoaded
            ? 'Verifying your portal session...'
            : 'Verifying institutional permissions...'}
        </p>
      </div>
    );
  }

  // 3. Unauthenticated visitor -> redirect to Sign In
  if (!isSignedIn) {
    return <Navigate to="/portal/login" state={{ from: location.pathname }} replace />;
  }

  // 4. Role-specific route protection (Authorization Layer)
  if (requiredRoles && requiredRoles.length > 0) {
    const hasVerifiedPermission =
      authorization.isVerified &&
      (authorization.allRoles.some((role) => requiredRoles.includes(role)) ||
        (authorization.verifiedRole !== null &&
          requiredRoles.includes(authorization.verifiedRole)));

    if (!hasVerifiedPermission) {
      const requiredLabels = requiredRoles
        .map((r) => SYSTEM_ROLE_DEFINITIONS[r]?.label || r)
        .join(', ');

      const isDbMissing =
        authorization.verificationSource === 'supabase_unconfigured' ||
        authorization.verificationSource === 'unconnected_phase_2';

      return (
        <div className="flex flex-col min-h-screen">
          <PageHeader
            title={sectionTitle}
            subtitle="Role Verification Required"
            breadcrumbs={[{ name: 'Portal', path: '/portal' }, { name: sectionTitle }]}
          />
          <section className="py-16 px-4 sm:px-6 lg:px-8 bg-[#F5F3ED] flex-1">
            <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-10 text-center flex flex-col items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-[#102B46] text-[#D9B76A] flex items-center justify-center shadow-md">
                {isDbMissing ? <Database className="w-8 h-8" /> : <Lock className="w-8 h-8" />}
              </div>

              <span className="px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-amber-500/10 text-amber-800 border border-amber-200">
                {isDbMissing
                  ? 'Database Configuration & Migrations Required'
                  : 'Verified Role Authorization Required'}
              </span>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#102B46] font-['Manrope']">
                Restricted Portal Dashboard
              </h2>

              <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                You are signed in as{' '}
                <strong className="text-[#102B46]">
                  {user?.fullName || user?.primaryEmail || 'Authenticated User'}
                </strong>
                . Accessing <strong>{sectionTitle}</strong> requires verified database
                permission for:{' '}
                <span className="font-semibold text-[#102B46]">{requiredLabels}</span>.
              </p>

              <div className="w-full bg-[#F5F3ED] border border-slate-200 rounded-2xl p-5 text-left flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-[#102B46] shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-1">
                  {isDbMissing ? (
                    <>
                      <p>
                        <strong>Supabase Setup Pending:</strong> Configure{' '}
                        <code className="font-mono">VITE_SUPABASE_URL</code> and{' '}
                        <code className="font-mono">VITE_SUPABASE_PUBLISHABLE_KEY</code> and apply
                        database migrations <code className="font-mono">0001</code>–
                        <code className="font-mono">0011</code> so server-side role verification and
                        admissions persistence can operate.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        <strong>Access Restricted:</strong> Your verified role(s):{' '}
                        <code className="font-mono">
                          {authorization.allRoles.length > 0
                            ? authorization.allRoles.join(', ')
                            : 'none'}
                        </code>
                        . Roles can only be assigned by the General Administrator through verified
                        server-side records.
                      </p>
                      {authorization.verificationError && (
                        <p className="text-red-700 font-medium pt-1">
                          Database note: {authorization.verificationError}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full pt-2">
                <NavLink
                  to="/portal"
                  className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 bg-[#102B46] hover:bg-[#091C30] text-white px-6 py-3 rounded-xl font-bold text-sm transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 text-[#D9B76A]" />
                  <span>Return to Portal Hub</span>
                </NavLink>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-700 px-6 py-3 rounded-xl font-bold text-sm border border-slate-300 transition-colors"
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
  }

  return <>{children}</>;
};
