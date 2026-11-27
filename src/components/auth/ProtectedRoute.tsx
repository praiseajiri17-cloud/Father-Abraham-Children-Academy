import React from 'react';
import { Navigate, NavLink, useLocation } from 'react-router-dom';
import { ShieldAlert, Loader2, LogOut, ArrowLeft, Lock, RefreshCw } from 'lucide-react';
import { useAppAuth } from '../../context/AuthContext';
import { SystemRole } from '../../types/auth';
import { getDefaultPortalRoute } from '../../constants/roles';
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
  sectionTitle = 'School Portal',
}) => {
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
  const location = useLocation();

  // 1. Authentication service unavailable
  if (!isConfigured) {
    return (
      <div className="flex flex-col min-h-screen">
        <PageHeader
          title={sectionTitle}
          subtitle="Father Abraham Children Academy School Portal"
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
          {!isLoaded ? 'Checking your portal session...' : 'Verifying your portal access...'}
        </p>
      </div>
    );
  }

  // 3. Unauthenticated visitor -> redirect to School Portal Sign In
  if (!isSignedIn) {
    return <Navigate to="/portal" state={{ from: location.pathname }} replace />;
  }

  // 4. Role-specific route protection (Server-Verified Authorization Layer)
  if (requiredRoles && requiredRoles.length > 0) {
    const hasVerifiedPermission =
      authorization.isVerified &&
      (authorization.allRoles.some((role) => requiredRoles.includes(role)) ||
        (authorization.verifiedRole !== null &&
          requiredRoles.includes(authorization.verifiedRole)));

    if (!hasVerifiedPermission) {
      const homeRoute = authorization.isVerified
        ? getDefaultPortalRoute(authorization.allRoles)
        : '/portal';

      return (
        <div className="flex flex-col min-h-screen">
          <PageHeader
            title={sectionTitle}
            subtitle="Father Abraham Children Academy School Portal"
            breadcrumbs={[{ name: 'Portal', path: '/portal' }, { name: sectionTitle }]}
          />
          <section className="py-16 px-4 sm:px-6 lg:px-8 bg-[#F5F3ED] flex-1">
            <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-10 text-center flex flex-col items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-[#102B46] text-[#D9B76A] flex items-center justify-center shadow-md">
                <Lock className="w-8 h-8" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#102B46] font-['Manrope']">
                {authorization.isVerified ? 'Restricted Workspace' : 'Account Verification Pending'}
              </h2>

              <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                You are signed in as{' '}
                <strong className="text-[#102B46]">
                  {user?.fullName || user?.primaryEmail || 'Portal User'}
                </strong>
                .{' '}
                {authorization.isVerified
                  ? `Your account does not currently have access to ${sectionTitle}.`
                  : 'Your school portal access is awaiting verification. Please try refreshing below or contact the school administration.'}
              </p>

              <div className="w-full bg-[#F5F3ED] border border-slate-200 rounded-2xl p-4 text-left flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-[#102B46] shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  {authorization.isVerified
                    ? 'Staff and administrative permissions are managed exclusively by the school administration.'
                    : 'If you have recently been assigned a role or registered a family account, click Refresh Access below.'}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full pt-2">
                {authorization.isVerified ? (
                  <NavLink
                    to={homeRoute}
                    className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 bg-[#102B46] hover:bg-[#091C30] text-white px-6 py-3 rounded-xl font-bold text-sm transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 text-[#D9B76A]" />
                    <span>Go to My Workspace</span>
                  </NavLink>
                ) : (
                  <button
                    type="button"
                    onClick={() => void refreshAuthorization()}
                    className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 bg-[#102B46] hover:bg-[#091C30] text-white px-6 py-3 rounded-xl font-bold text-sm transition-colors"
                  >
                    <RefreshCw className="w-4 h-4 text-[#D9B76A]" />
                    <span>Refresh Access</span>
                  </button>
                )}

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
