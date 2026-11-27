import React from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAppAuth } from '../../context/AuthContext';
import { getDefaultPortalRoute } from '../../constants/roles';

/**
 * Dedicated entry point for public "Apply Now" / "Apply for Admission" CTAs.
 * - Unauthenticated visitors enter the Parent Registration / Admission flow
 *   (redirecting straight to /portal/parent upon completion).
 * - Signed-in verified parents go directly to /portal/parent.
 * - Signed-in staff/admin go directly to their verified workspace.
 */
export const ApplyEntry: React.FC = () => {
  const { isConfigured, isLoaded, isSignedIn, authorization } = useAppAuth();

  if (isConfigured && (!isLoaded || (isSignedIn && authorization.isChecking))) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 px-4 bg-[#F5F3ED]">
        <Loader2 className="w-10 h-10 text-[#102B46] animate-spin" />
        <p className="text-sm font-semibold text-[#102B46] font-['Manrope']">
          Opening Admissions Portal...
        </p>
      </div>
    );
  }

  if (isSignedIn) {
    if (authorization.isVerified) {
      if (authorization.allRoles.includes('parent')) {
        return <Navigate to="/portal/parent" replace />;
      }
      return <Navigate to={getDefaultPortalRoute(authorization.allRoles)} replace />;
    }
    return <Navigate to="/portal" replace />;
  }

  return (
    <Navigate
      to="/portal/register?intent=admission"
      state={{ from: '/portal/parent', admissionIntent: true }}
      replace
    />
  );
};
