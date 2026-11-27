import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAppAuth } from '../../context/AuthContext';
import { getDefaultPortalRoute } from '../../constants/roles';

interface PublicOnlyAuthRouteProps {
  children: React.ReactNode;
}

/**
 * Redirects already signed-in users away from /portal/login or /portal/register
 * directly to their verified portal workspace (or intended destination).
 */
export const PublicOnlyAuthRoute: React.FC<PublicOnlyAuthRouteProps> = ({ children }) => {
  const { isConfigured, isLoaded, isSignedIn, authorization } = useAppAuth();
  const location = useLocation();
  const rawFrom = (location.state as { from?: string } | null)?.from;

  const safeFrom =
    typeof rawFrom === 'string' &&
    rawFrom.startsWith('/') &&
    !rawFrom.startsWith('//') &&
    !rawFrom.includes('\\')
      ? rawFrom
      : null;

  if (isConfigured && (!isLoaded || (isSignedIn && authorization.isChecking))) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 px-4 bg-[#F5F3ED]">
        <Loader2 className="w-10 h-10 text-[#102B46] animate-spin" />
        <p className="text-sm font-semibold text-[#102B46] font-['Manrope']">
          Checking your portal session...
        </p>
      </div>
    );
  }

  if (isConfigured && isLoaded && isSignedIn) {
    const destination =
      safeFrom && safeFrom !== '/portal'
        ? safeFrom
        : authorization.isVerified
          ? getDefaultPortalRoute(authorization.allRoles)
          : '/portal';
    return <Navigate to={destination} replace />;
  }

  return <>{children}</>;
};
