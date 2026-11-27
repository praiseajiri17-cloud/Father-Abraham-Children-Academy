import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { UserButton } from '@clerk/react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Filter,
  Loader2,
  LogOut,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { useAppAuth } from '../../context/AuthContext';
import { useSupabaseClient } from '../../hooks/useSupabaseClient';
import { usePublicSchoolSettings } from '../../hooks/usePublicSchoolSettings';
import {
  AdmissionApplicationExpanded,
  AdmissionFilters,
  AdmissionReferenceLookups,
  AdmissionStatusHistoryItem,
} from '../../types/admissions';
import {
  ApplicationStatus,
  DbAuditLog,
  PaymentStatus,
  PhysicalDocumentsStatus,
  SchoolSectionCode,
} from '../../types/database';
import {
  computeAdmissionMetrics,
  fetchAdmissionAuditLogs,
  fetchAdmissionLookups,
  fetchAllApplicationsForStaff,
  fetchApplicationHistory,
  filterApplications,
  performAdminDecisionOverride,
  performOfficerPhysicalDocUpdate,
  performOfficerReviewDecision,
} from '../../services/admissionsService';
import {
  ApplicationStatusBadge,
  PaymentStatusBadge,
  PhysicalDocsBadge,
} from '../../components/admissions/AdmissionStatusBadge';
import { StaffApplicationDetailPanel } from '../../components/admissions/StaffApplicationDetailPanel';
import { OfficialAdmissionPrintSheet } from '../../components/admissions/OfficialAdmissionPrintSheet';
import { downloadOfficialAdmissionPdf } from '../../utils/admissionPdf';

const DEFAULT_FILTERS: AdmissionFilters = {
  search: '',
  sectionCode: 'all',
  classLevelId: 'all',
  sessionId: 'all',
  applicationStatus: 'all',
  paymentStatus: 'all',
  physicalDocumentsStatus: 'all',
};

export const AdmissionsPortal: React.FC = () => {
  const { user, authorization, signOut } = useAppAuth();
  const { supabase, isSupabaseReady, getClerkToken } = useSupabaseClient();
  const { contactInfo } = usePublicSchoolSettings();

  const isGeneralAdmin = authorization.allRoles.includes('general_admin');
  const canOverride =
    isGeneralAdmin || authorization.permissions.includes('admissions.override');

  const [lookups, setLookups] = useState<AdmissionReferenceLookups | null>(null);
  const [applications, setApplications] = useState<AdmissionApplicationExpanded[]>([]);
  const [filters, setFilters] = useState<AdmissionFilters>(DEFAULT_FILTERS);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [appHistory, setAppHistory] = useState<AdmissionStatusHistoryItem[]>([]);
  const [appAuditLogs, setAppAuditLogs] = useState<DbAuditLog[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isActionBusy, setIsActionBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [printApp, setPrintApp] = useState<AdmissionApplicationExpanded | null>(null);
  const [printPassportUrl, setPrintPassportUrl] = useState<string | null>(null);

  const loadWorkspace = useCallback(async () => {
    if (!supabase || !isSupabaseReady) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [lookupData, allApps] = await Promise.all([
        fetchAdmissionLookups(supabase),
        fetchAllApplicationsForStaff(supabase),
      ]);
      setLookups(lookupData);
      setApplications(allApps);
      if (allApps.length > 0) {
        setSelectedAppId((prev) =>
          prev && allApps.some((a) => a.id === prev) ? prev : allApps[0].id
        );
      } else {
        setSelectedAppId(null);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to load admissions desk records.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [supabase, isSupabaseReady]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  const filteredApps = useMemo(
    () => filterApplications(applications, filters),
    [applications, filters]
  );

  const metrics = useMemo(() => computeAdmissionMetrics(applications), [applications]);

  const selectedApplication =
    filteredApps.find((a) => a.id === selectedAppId) ??
    applications.find((a) => a.id === selectedAppId) ??
    filteredApps[0] ??
    null;

  const loadSelectedDetails = useCallback(async () => {
    if (!supabase || !selectedApplication) {
      setAppHistory([]);
      setAppAuditLogs([]);
      return;
    }
    try {
      const token = await getClerkToken();
      const [hist, logs] = await Promise.all([
        fetchApplicationHistory(supabase, selectedApplication.id),
        fetchAdmissionAuditLogs(supabase, token, selectedApplication.id).catch(() => []),
      ]);
      setAppHistory(hist);
      setAppAuditLogs(logs);
    } catch {
      setAppHistory([]);
    }
  }, [supabase, selectedApplication, getClerkToken]);

  useEffect(() => {
    void loadSelectedDetails();
  }, [loadSelectedDetails]);

  const handleUpdatePhysicalDocs = async (params: {
    applicationId: string;
    physicalDocumentsStatus: PhysicalDocumentsStatus;
    receivedByName: string;
    receivedAt: string;
    receivedList: string[];
    missingList: string[];
    notes: string;
  }) => {
    if (!supabase || !authorization.profileId) return;
    setIsActionBusy(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const token = await getClerkToken();
      await performOfficerPhysicalDocUpdate(
        supabase,
        token,
        authorization.profileId,
        params
      );
      await loadWorkspace();
      await loadSelectedDetails();
      setSuccessMsg('Physical document receipt status updated and logged.');
    } finally {
      setIsActionBusy(false);
    }
  };

  const handleUpdateReviewDecision = async (params: {
    applicationId: string;
    applicationStatus: 'under_review' | 'correction_requested' | 'approved' | 'rejected';
    reviewerNotes: string;
    correctionNotes: string;
  }) => {
    if (!supabase || !authorization.profileId) return;
    setIsActionBusy(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const token = await getClerkToken();
      await performOfficerReviewDecision(
        supabase,
        token,
        authorization.profileId,
        params
      );
      await loadWorkspace();
      await loadSelectedDetails();
      setSuccessMsg(
        `Application status updated to "${params.applicationStatus.replace(/_/g, ' ')}".`
      );
    } finally {
      setIsActionBusy(false);
    }
  };

  const handleAdminOverride = async (params: {
    applicationId: string;
    applicationStatus:
      | 'submitted'
      | 'under_review'
      | 'correction_requested'
      | 'approved'
      | 'rejected';
    overrideReason: string;
    reviewerNotes?: string;
  }) => {
    if (!supabase || !authorization.profileId) return;
    setIsActionBusy(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const token = await getClerkToken();
      await performAdminDecisionOverride(
        supabase,
        token,
        authorization.profileId,
        params
      );
      await loadWorkspace();
      await loadSelectedDetails();
      setSuccessMsg('Administrative override recorded in audit trail.');
    } finally {
      setIsActionBusy(false);
    }
  };

  const handleDownloadOfficialPdf = async (
    app: AdmissionApplicationExpanded,
    passportUrl?: string | null
  ) => {
    try {
      await downloadOfficialAdmissionPdf(app, contactInfo, {
        passportImageUrl: passportUrl,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'PDF download unavailable.');
    }
  };

  const handlePrintOfficialForm = (
    app: AdmissionApplicationExpanded,
    passportUrl?: string | null
  ) => {
    if (app.payment_status !== 'paid') {
      setErrorMsg('Official paid A4 form printing requires verified payment.');
      return;
    }
    setPrintApp(app);
    setPrintPassportUrl(passportUrl ?? null);
    document.body.classList.add('printing-admission-form');
    setTimeout(() => {
      window.print();
      document.body.classList.remove('printing-admission-form');
    }, 120);
  };

  const kpiCards = [
    { label: 'Total Applications', value: metrics.totalApplications, accent: 'text-[#102B46]' },
    { label: 'Pending Submissions', value: metrics.newSubmissions, accent: 'text-blue-700' },
    {
      label: 'Awaiting Physical Docs',
      value: metrics.awaitingPhysicalDocuments,
      accent: 'text-slate-700',
    },
    { label: 'Under Review', value: metrics.awaitingReview, accent: 'text-amber-700' },
    { label: 'Approved', value: metrics.approvedApplications, accent: 'text-[#15803D]' },
    { label: 'Not Approved', value: metrics.rejectedApplications, accent: 'text-red-700' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F3ED]">
      <PageHeader
        title="Admissions Office Dashboard"
        subtitle="Review applicant submissions, verify physical documents, request corrections, and record admission decisions."
        breadcrumbs={[{ name: 'Admissions Desk' }]}
      />

      <section className="py-8 sm:py-10 px-4 sm:px-6 lg:px-8 flex-1">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Top Role Bar (strictly admission operations — no staff permission editing) */}
          <div className="bg-[#091C30] text-white rounded-3xl shadow-lg border border-[#D9B76A]/30 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: 'w-11 h-11 border-2 border-[#D9B76A]',
                  },
                }}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-[#D9B76A] shrink-0" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#D9B76A]">
                    Admissions Review Workspace
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold font-['Manrope'] truncate">
                  {user?.fullName || 'Admission Officer'}
                </h2>
                <p className="text-xs text-slate-300 truncate">
                  Role: {authorization.allRoles.map((r) => r.replace(/_/g, ' ')).join(', ')}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {isGeneralAdmin && (
                <NavLink
                  to="/portal/admin"
                  className="inline-flex items-center gap-1.5 px-4 min-h-[44px] rounded-xl bg-[#D9B76A] hover:bg-[#c8a556] text-[#091C30] font-bold text-xs"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>General Admin Panel</span>
                </NavLink>
              )}
              <NavLink
                to="/"
                className="inline-flex items-center gap-1.5 px-4 min-h-[44px] rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs"
              >
                <ArrowLeft className="w-4 h-4 text-[#D9B76A]" />
                <span>Public Website</span>
              </NavLink>
              <button
                type="button"
                onClick={() => void signOut()}
                className="inline-flex items-center gap-1.5 px-4 min-h-[44px] rounded-xl bg-white/10 hover:bg-red-500/20 text-white font-bold text-xs"
              >
                <LogOut className="w-4 h-4 text-[#D9B76A]" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl p-4 text-xs sm:text-sm flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-[#15803D] shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-900 rounded-2xl p-4 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-[#102B46] animate-spin" />
              <p className="text-sm font-semibold text-[#102B46]">
                Loading admission applications...
              </p>
            </div>
          ) : (
            <>
              {/* Overview KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {kpiCards.map((m) => (
                  <div
                    key={m.label}
                    className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm"
                  >
                    <div
                      className={`text-2xl font-extrabold font-['Manrope'] tabular-nums ${m.accent}`}
                    >
                      {m.value}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-500 mt-0.5 leading-tight">
                      {m.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Search & Multi-Criteria Filter Bar */}
              <div className="bg-white rounded-3xl shadow-md border border-slate-200 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-[#102B46] font-['Manrope'] flex items-center gap-2">
                    <Filter className="w-4 h-4 text-[#D9B76A]" />
                    <span>Search &amp; Filter Applications</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setFilters(DEFAULT_FILTERS)}
                    className="text-xs font-bold text-[#102B46] hover:text-[#D9B76A]"
                  >
                    Reset Filters
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    <input
                      type="text"
                      value={filters.search}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, search: e.target.value }))
                      }
                      placeholder="Ref (FACA-ADM-...), child or parent"
                      className="w-full min-h-[44px] pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm"
                    />
                  </div>

                  <select
                    value={filters.sectionCode}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        sectionCode: e.target.value as SchoolSectionCode | 'all',
                      }))
                    }
                    className="min-h-[44px] rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm bg-white"
                  >
                    <option value="all">All Sections</option>
                    {lookups?.sections.map((s) => (
                      <option key={s.id} value={s.code}>
                        {s.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filters.classLevelId}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, classLevelId: e.target.value }))
                    }
                    className="min-h-[44px] rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm bg-white"
                  >
                    <option value="all">All Class Levels</option>
                    {lookups?.classLevels.map((cl) => (
                      <option key={cl.id} value={cl.id}>
                        {cl.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filters.sessionId}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, sessionId: e.target.value }))
                    }
                    className="min-h-[44px] rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm bg-white"
                  >
                    <option value="all">All Academic Sessions</option>
                    {lookups?.sessions.map((ses) => (
                      <option key={ses.id} value={ses.id}>
                        {ses.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filters.applicationStatus}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        applicationStatus: e.target.value as ApplicationStatus | 'all',
                      }))
                    }
                    className="min-h-[44px] rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm bg-white"
                  >
                    <option value="all">All Application Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="submitted">Submitted</option>
                    <option value="pending">Pending</option>
                    <option value="under_review">Under Review</option>
                    <option value="correction_requested">Correction Required</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Not Approved</option>
                  </select>

                  <select
                    value={filters.paymentStatus}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        paymentStatus: e.target.value as PaymentStatus | 'all',
                      }))
                    }
                    className="min-h-[44px] rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm bg-white"
                  >
                    <option value="all">All Payment Statuses</option>
                    <option value="unpaid">Awaiting Payment</option>
                    <option value="pending">Verification Pending</option>
                    <option value="paid">Payment Confirmed</option>
                    <option value="failed">Payment Failed</option>
                  </select>

                  <select
                    value={filters.physicalDocumentsStatus}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        physicalDocumentsStatus: e.target.value as
                          | PhysicalDocumentsStatus
                          | 'all',
                      }))
                    }
                    className="min-h-[44px] rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm bg-white"
                  >
                    <option value="all">All Physical Doc Statuses</option>
                    <option value="not_submitted">Awaiting Physical Docs</option>
                    <option value="received">Documents Received</option>
                    <option value="under_review">Docs Under Review</option>
                    <option value="incomplete">Incomplete</option>
                    <option value="complete">Complete &amp; Verified</option>
                  </select>
                </div>
              </div>

              {/* Applications Queue + Review Panel */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-4 bg-white rounded-3xl shadow-md border border-slate-200 p-4 space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-sm font-extrabold text-[#102B46] font-['Manrope'] tabular-nums">
                      Matching Applications ({filteredApps.length})
                    </h4>
                  </div>

                  {filteredApps.length === 0 ? (
                    <p className="text-xs text-slate-500 p-4 text-center">
                      No admission applications match the current filters.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                      {filteredApps.map((app) => {
                        const active = selectedApplication?.id === app.id;
                        return (
                          <button
                            key={app.id}
                            type="button"
                            onClick={() => setSelectedAppId(app.id)}
                            className={`w-full text-left rounded-2xl p-3.5 border transition-colors space-y-1.5 ${
                              active
                                ? 'bg-[#102B46] text-white border-[#102B46]'
                                : 'bg-[#F5F3ED] hover:bg-white border-slate-200 text-[#091C30]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 text-[11px]">
                              <span
                                className={`font-mono font-bold tabular-nums ${
                                  active ? 'text-[#D9B76A]' : 'text-[#102B46]'
                                }`}
                              >
                                {app.application_reference}
                              </span>
                              <span className="opacity-75">{app.school_sections?.name}</span>
                            </div>
                            <div className="font-bold text-sm font-['Manrope']">
                              {app.child_first_name} {app.child_last_name}
                            </div>
                            <div className="text-[11px] opacity-80">
                              {app.class_levels?.name} • Parent: {app.parent_full_name || '—'}
                            </div>
                            <div className="flex flex-wrap gap-1 pt-1">
                              <ApplicationStatusBadge status={app.application_status} />
                              <PaymentStatusBadge status={app.payment_status} />
                              <PhysicalDocsBadge status={app.physical_documents_status} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="lg:col-span-8">
                  {selectedApplication ? (
                    <StaffApplicationDetailPanel
                      supabase={supabase}
                      application={selectedApplication}
                      history={appHistory}
                      auditLogs={appAuditLogs}
                      canOverride={canOverride}
                      defaultStaffName={user?.fullName || 'Admissions Officer'}
                      isBusy={isActionBusy}
                      onUpdatePhysicalDocs={handleUpdatePhysicalDocs}
                      onUpdateReviewDecision={handleUpdateReviewDecision}
                      onAdminOverrideDecision={handleAdminOverride}
                      onDownloadOfficialPdf={(app, url) =>
                        void handleDownloadOfficialPdf(app, url)
                      }
                      onPrintOfficialForm={handlePrintOfficialForm}
                    />
                  ) : (
                    <div className="bg-white rounded-3xl shadow-md border border-slate-200 p-10 text-center text-sm text-slate-600">
                      Select an application from the queue to inspect documents, log physical
                      submissions, or record an admission decision.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      <OfficialAdmissionPrintSheet
        application={printApp}
        passportImageUrl={printPassportUrl}
      />
    </div>
  );
};
