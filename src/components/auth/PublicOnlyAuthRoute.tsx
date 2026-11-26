import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAppAuth } from '../../context/AuthContext';

interface PublicOnlyAuthRouteProps {
  children: React.ReactNode;
}

/**
 * Redirects already signed-in users away from /portal/login or /portal/register
 * to their intended destination or /portal.
 */
export const PublicOnlyAuthRoute: React.FC<PublicOnlyAuthRouteProps> = ({ children }) => {
  const { isConfigured, isLoaded, isSignedIn } = useAppAuth();
  const location = useLocation();
  const rawFrom = (location.state as { from?: string } | null)?.from;
  const redirectTarget =
    typeof rawFrom === 'string' && rawFrom.startsWith('/') && !rawFrom.startsWith('//') && !rawFrom.includes('\\')
      ? rawFrom
      : '/portal';

  if (isConfigured && !isLoaded) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 px-4 bg-[#F5F3ED]">
        <Loader2 className="w-10 h-10 text-[#102B46] animate-spin" />
        <p className="text-sm font-semibold text-[#102B46] font-['Manrope']">
          Checking session status...
        </p>
      </div>
    );
  }

  if (isConfigured && isLoaded && isSignedIn) {
    return <Navigate to={redirectTarget} replace />;
  }

  return <>{children}</>;
};
