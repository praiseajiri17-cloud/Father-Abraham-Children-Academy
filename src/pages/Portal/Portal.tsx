import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { UserButton, UserProfile } from '@clerk/react';
import {
  ShieldCheck,
  Lock,
  UserCog,
  LogOut,
  ArrowRight,
  CheckCircle2,
  Clock,
  Users,
  GraduationCap,
  Building2,
  Database,
  RefreshCw,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { SectionHeading } from '../../components/common/SectionHeading';
import { academyClerkAppearance, useAppAuth } from '../../context/AuthContext';
import { ALL_SYSTEM_ROLES } from '../../constants/roles';
import { getSupabaseConfigStatus } from '../../lib/supabase';

export const Portal: React.FC = () => {
  const { user, authorization, refreshAuthorization, signOut } = useAppAuth();
  const [showProfileManager, setShowProfileManager] = useState(false);
  const supabaseStatus = getSupabaseConfigStatus();

  const isParentAuthorized =
    authorization.isVerified && authorization.allRoles.includes('parent');
  const isStaffAdminAuthorized =
    authorization.isVerified &&
    authorization.allRoles.some((r) =>
      ['general_admin', 'principal', 'admission_officer', 'finance_officer', 'secretary'].includes(r)
    );
  const isTeacherAuthorized =
    authorization.isVerified && authorization.allRoles.includes('teacher');

  const portalDestinations = [
    {
      title: 'Family & Parent Admissions Portal',
      path: '/portal/parent',
      roleCode: 'parent',
      isUnlocked: isParentAuthorized,
      ctaLabel: isParentAuthorized ? 'Open Parent Admissions' : 'Requires Verified DB Session',
      description:
        'Start and manage online admission applications for all children under your family account, track payment status, and download official A4 PDFs.',
      icon: <Users className="w-6 h-6 text-[#D9B76A]" />,
    },
    {
      title: 'Admissions & Administration Portal',
      path: '/portal/admin',
      roleCode: 'admission_officer / general_admin',
      isUnlocked: isStaffAdminAuthorized,
      ctaLabel: isStaffAdminAuthorized ? 'Open Admissions Workspace' : 'Staff Role Guarded',
      description:
        'Review applications, record physical document submissions, request corrections, approve or reject applicants, and manage institutional roles.',
      icon: <Building2 className="w-6 h-6 text-[#D9B76A]" />,
    },
    {
      title: 'Teacher / Caregiver Portal',
      path: '/portal/teacher',
      roleCode: 'teacher',
      isUnlocked: isTeacherAuthorized,
      ctaLabel: isTeacherAuthorized ? 'Open Teacher Portal' : 'Upcoming Academic Phase',
      description:
        'Reserved for future academic phases (attendance registers, continuous assessment, and class management). Blocked from admissions records.',
      icon: <GraduationCap className="w-6 h-6 text-[#D9B76A]" />,
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="Welcome to the School Portal"
        subtitle="Authenticated gateway for Father Abraham Children Academy Online Admissions & Governance."
        breadcrumbs={[{ name: 'School Portal' }]}
      />

      <section className="py-12 sm:py-16 bg-[#F5F3ED] flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-10">
          {/* Authenticated User Summary Card */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4 min-w-0">
                <div className="shrink-0">
                  <UserButton
                    appearance={{
                      elements: {
                        avatarBox: 'w-14 h-14 border-2 border-[#D9B76A]',
                      },
                    }}
                  />
                </div>
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#15803D] border border-emerald-200 text-xs font-bold mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Authenticated via Clerk</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[#102B46] font-['Manrope'] truncate">
                    {user?.fullName || 'Signed-In User'}
                  </h2>
                  <p className="text-sm text-slate-600 truncate">{user?.primaryEmail}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void refreshAuthorization()}
                  className="inline-flex items-center gap-2 bg-[#F5F3ED] hover:bg-slate-200 text-[#102B46] px-4 py-2.5 rounded-xl font-bold text-sm transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${authorization.isChecking ? 'animate-spin' : ''}`} />
                  <span>Refresh Role</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowProfileManager((prev) => !prev)}
                  className="inline-flex items-center gap-2 bg-[#102B46] hover:bg-[#091C30] text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors"
                >
                  <UserCog className="w-4 h-4 text-[#D9B76A]" />
                  <span>{showProfileManager ? 'Hide Account Settings' : 'Manage Account'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-700 px-5 py-2.5 rounded-xl font-bold text-sm border border-slate-300 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>

            {/* Auth vs Authorization Separation Status */}
            <div className="mt-6 pt-6 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#F5F3ED] rounded-2xl p-4 border border-slate-200 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#15803D] shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#102B46]">
                    Authentication Status
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Identity verified by Clerk (<code className="font-mono">{user?.id}</code>).
                  </p>
                </div>
              </div>

              <div className="bg-[#F5F3ED] rounded-2xl p-4 border border-slate-200 flex items-start gap-3">
                <Database
                  className={`w-5 h-5 shrink-0 mt-0.5 ${
                    supabaseStatus.configured ? 'text-[#15803D]' : 'text-amber-700'
                  }`}
                />
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#102B46]">
                    Supabase Database
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {supabaseStatus.configured
                      ? 'Supabase configured with Clerk Third-Party Auth.'
                      : 'Awaiting VITE_SUPABASE_URL & VITE_SUPABASE_PUBLISHABLE_KEY and migrations 0001–0011.'}
                  </p>
                </div>
              </div>

              <div
                className={`rounded-2xl p-4 border flex items-start gap-3 ${
                  authorization.isVerified
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-amber-50 border-amber-200'
                }`}
              >
                {authorization.isVerified ? (
                  <CheckCircle2 className="w-5 h-5 text-[#15803D] shrink-0 mt-0.5" />
                ) : (
                  <Clock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                )}
                <div>
                  <h3
                    className={`text-xs font-bold uppercase tracking-wider ${
                      authorization.isVerified ? 'text-emerald-900' : 'text-amber-900'
                    }`}
                  >
                    Verified Authorization
                  </h3>
                  <p
                    className={`text-xs mt-1 leading-relaxed ${
                      authorization.isVerified ? 'text-emerald-800' : 'text-amber-800'
                    }`}
                  >
                    Verified Role(s):{' '}
                    <strong>
                      {authorization.isVerified && authorization.allRoles.length > 0
                        ? authorization.allRoles.join(', ')
                        : 'Pending Database Verification'}
                    </strong>
                    {authorization.verificationError ? ` — ${authorization.verificationError}` : ''}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Embedded Clerk UserProfile Account Management */}
          {showProfileManager && (
            <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-4 sm:p-8 overflow-x-auto">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-[#102B46] font-['Manrope']">
                    Account & Security Management
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600">
                    Update your profile details, email addresses, and password securely via Clerk.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProfileManager(false)}
                  className="text-sm font-bold text-slate-500 hover:text-[#102B46] px-3 py-1.5 rounded-lg hover:bg-slate-100"
                >
                  Close
                </button>
              </div>
              <div className="flex justify-center">
                <UserProfile routing="hash" appearance={academyClerkAppearance} />
              </div>
            </div>
          )}

          {/* Portal Workspaces */}
          <div>
            <SectionHeading
              subtitle="Role-Verified Modules"
              title="Portal Workspaces"
              description="Access is authorized directly from Supabase PostgreSQL records and Row Level Security."
              centered={false}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {portalDestinations.map((dest) => (
                <div
                  key={dest.path}
                  className="bg-white rounded-3xl p-6 sm:p-8 shadow-md border border-slate-200 flex flex-col justify-between gap-6"
                >
                  <div className="flex flex-col gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#102B46] flex items-center justify-center shadow">
                      {dest.icon}
                    </div>
                    <div className="flex items-center gap-2">
                      {dest.isUnlocked ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-[#15803D] border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Verified Access
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-800 border border-amber-200">
                          <Lock className="w-3 h-3" /> Role Guarded
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-[#102B46] font-['Manrope']">
                      {dest.title}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{dest.description}</p>
                  </div>

                  <NavLink
                    to={dest.path}
                    className={`inline-flex items-center justify-between w-full px-4 py-3 rounded-xl font-bold text-sm transition-colors ${
                      dest.isUnlocked
                        ? 'bg-[#102B46] hover:bg-[#091C30] text-white'
                        : 'bg-[#F5F3ED] hover:bg-[#102B46] hover:text-white text-[#102B46]'
                    }`}
                  >
                    <span>{dest.ctaLabel}</span>
                    <ArrowRight className="w-4 h-4 text-[#D9B76A]" />
                  </NavLink>
                </div>
              ))}
            </div>
          </div>

          {/* Institutional Role Reference Matrix */}
          <div className="bg-white rounded-3xl shadow-md border border-slate-200 p-6 sm:p-8">
            <h3 className="text-lg sm:text-xl font-extrabold text-[#102B46] font-['Manrope'] mb-2">
              Institutional Access Control Roles
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mb-6">
              Only verified database records in Supabase can grant staff or administrative access.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ALL_SYSTEM_ROLES.map((r) => (
                <div
                  key={r.role}
                  className="bg-[#F5F3ED] rounded-2xl p-4 border border-slate-200 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-[#102B46] font-['Manrope']">
                      {r.label}
                    </span>
                    <code className="text-[11px] font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-[#102B46]">
                      {r.role}
                    </code>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{r.description}</p>
                  <div className="text-[11px] font-semibold text-slate-500 pt-1 border-t border-slate-200/80">
                    Provisioning: {r.provisioningMethod}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
