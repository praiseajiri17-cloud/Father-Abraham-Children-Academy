import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Filter,
  Loader2,
  Search,
  Settings,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { useAppAuth } from '../../context/AuthContext';
import { useSupabaseClient } from '../../hooks/useSupabaseClient';
import {
  AdmissionApplicationExpanded,
  AdmissionFilters,
  AdmissionReferenceLookups,
  AdmissionSettingsConfig,
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
  assignOrRevokeStaffRole,
  computeAdmissionMetrics,
  fetchAdminStaffDirectory,
  fetchAdmissionAuditLogs,
  fetchAdmissionLookups,
  fetchAllApplicationsForStaff,
  fetchApplicationHistory,
  filterApplications,
  formatNairaFromKobo,
  performAdminDecisionOverride,
  performOfficerPhysicalDocUpdate,
  performOfficerReviewDecision,
  updateAdmissionSettingsConfig,
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

export const AdminPortal: React.FC = () => {
  const { user, authorization } = useAppAuth();
  const { supabase, isSupabaseReady, getClerkToken } = useSupabaseClient();

  const isGeneralAdmin = authorization.allRoles.includes('general_admin');
  const canOverride =
    isGeneralAdmin || authorization.permissions.includes('admissions.override');
  const canManageStaff =
    isGeneralAdmin || authorization.permissions.includes('staff.manage');
  const canManageSettings =
    isGeneralAdmin || authorization.permissions.includes('settings.manage');

  const [activeTab, setActiveTab] = useState<'admissions' | 'governance' | 'audit'>(
    'admissions'
  );

  const [lookups, setLookups] = useState<AdmissionReferenceLookups | null>(null);
  const [applications, setApplications] = useState<AdmissionApplicationExpanded[]>([]);
  const [filters, setFilters] = useState<AdmissionFilters>(DEFAULT_FILTERS);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [appHistory, setAppHistory] = useState<AdmissionStatusHistoryItem[]>([]);
  const [appAuditLogs, setAppAuditLogs] = useState<DbAuditLog[]>([]);

  const [staffDirectory, setStaffDirectory] = useState<Array<Record<string, unknown>>>([]);
  const [systemAuditLogs, setSystemAuditLogs] = useState<DbAuditLog[]>([]);

  // General Admin Staff Role Assignment Form
  const [staffEmail, setStaffEmail] = useState('');
  const [staffRoleCode, setStaffRoleCode] = useState('admission_officer');
  const [staffJobTitle, setStaffJobTitle] = useState('Admission Officer');

  // General Admin Admission Fee & Settings Form
  const [feeNairaInput, setFeeNairaInput] = useState('');
  const [admissionsOpenInput, setAdmissionsOpenInput] = useState(true);
  const [sessionLabelInput, setSessionLabelInput] = useState('2026/2027');

  const [isLoading, setIsLoading] = useState(true);
  const [isActionBusy, setIsActionBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [printApp, setPrintApp] = useState<AdmissionApplicationExpanded | null>(null);

  const loadAdmissionsWorkspace = useCallback(async () => {
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

      if (lookupData.admissionSettings) {
        setAdmissionsOpenInput(lookupData.admissionSettings.admissions_open);
        setSessionLabelInput(lookupData.admissionSettings.current_session_label || '2026/2027');
        if (lookupData.admissionSettings.application_fee_kobo) {
          setFeeNairaInput(String(lookupData.admissionSettings.application_fee_kobo / 100));
        } else {
          setFeeNairaInput('');
        }
      }

      if (allApps.length > 0) {
        setSelectedAppId((prev) =>
          prev && allApps.some((a) => a.id === prev) ? prev : allApps[0].id
        );
      } else {
        setSelectedAppId(null);
      }

      if (canManageStaff || isGeneralAdmin) {
        try {
          const token = await getClerkToken();
          const gov = await fetchAdminStaffDirectory(supabase, token);
          setStaffDirectory(gov.staff);
          setSystemAuditLogs(gov.auditLogs);
        } catch {
          // non-blocking if staff/audit read restricted
        }
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to load admissions administration workspace.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [supabase, isSupabaseReady, canManageStaff, isGeneralAdmin, getClerkToken]);

  useEffect(() => {
    void loadAdmissionsWorkspace();
  }, [loadAdmissionsWorkspace]);

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
      await loadAdmissionsWorkspace();
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
      await loadAdmissionsWorkspace();
      await loadSelectedDetails();
      setSuccessMsg(`Application status updated to "${params.applicationStatus.replace(/_/g, ' ')}".`);
    } finally {
      setIsActionBusy(false);
    }
  };

  const handleAdminOverride = async (params: {
    applicationId: string;
    applicationStatus: 'submitted' | 'under_review' | 'correction_requested' | 'approved' | 'rejected';
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
      await loadAdmissionsWorkspace();
      await loadSelectedDetails();
      setSuccessMsg('General Administrator decision override executed and logged.');
    } finally {
      setIsActionBusy(false);
    }
  };

  const handleAssignStaffRole = async (action: 'assign_role' | 'revoke_role') => {
    if (!staffEmail.trim()) {
      setErrorMsg('Enter the staff user’s email address.');
      return;
    }
    setIsActionBusy(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const token = await getClerkToken();
      await assignOrRevokeStaffRole(token, {
        action,
        targetEmail: staffEmail.trim(),
        roleCode: staffRoleCode,
        jobTitle: staffJobTitle.trim(),
      });
      await loadAdmissionsWorkspace();
      setSuccessMsg(
        `Role "${staffRoleCode}" ${action === 'assign_role' ? 'assigned to' : 'revoked from'} ${staffEmail}.`
      );
      setStaffEmail('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Staff role update failed.');
    } finally {
      setIsActionBusy(false);
    }
  };

  const handleSaveAdmissionSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !authorization.profileId) return;
    setIsActionBusy(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const parsedNaira = feeNairaInput.trim() ? Number(feeNairaInput.trim()) : null;
      const feeKobo =
        parsedNaira !== null && Number.isFinite(parsedNaira) && parsedNaira > 0
          ? Math.round(parsedNaira * 100)
          : null;

      const nextSettings: AdmissionSettingsConfig = {
        admissions_open: admissionsOpenInput,
        current_session_label: sessionLabelInput.trim() || '2026/2027',
        application_fee_configured: feeKobo !== null,
        application_fee_kobo: feeKobo,
        currency: 'NGN',
        physical_submission_instructions:
          lookups?.admissionSettings?.physical_submission_instructions,
      };

      const token = await getClerkToken();
      await updateAdmissionSettingsConfig(
        supabase,
        token,
        authorization.profileId,
        nextSettings
      );
      await loadAdmissionsWorkspace();
      setSuccessMsg('Official admission configuration updated.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save admission settings.');
    } finally {
      setIsActionBusy(false);
    }
  };

  const handleDownloadOfficialPdf = (app: AdmissionApplicationExpanded) => {
    try {
      downloadOfficialAdmissionPdf(app);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'PDF download unavailable.');
    }
  };

  const handlePrintOfficialForm = (app: AdmissionApplicationExpanded) => {
    if (app.payment_status !== 'paid') {
      setErrorMsg('Official paid A4 form printing requires verified payment.');
      return;
    }
    setPrintApp(app);
    document.body.classList.add('printing-admission-form');
    setTimeout(() => {
      window.print();
      document.body.classList.remove('printing-admission-form');
    }, 100);
  };

  const metricCards = [
    { label: 'Total Applications', value: metrics.totalApplications, accent: 'text-[#102B46]' },
    { label: 'New Submissions', value: metrics.newSubmissions, accent: 'text-blue-700' },
    { label: 'Awaiting Review', value: metrics.awaitingReview, accent: 'text-amber-700' },
    {
      label: 'Awaiting Physical Docs',
      value: metrics.awaitingPhysicalDocuments,
      accent: 'text-slate-700',
    },
    { label: 'Incomplete Docs', value: metrics.incompleteDocuments, accent: 'text-orange-700' },
    {
      label: 'Corrections Requested',
      value: metrics.correctionsRequested,
      accent: 'text-orange-800',
    },
    { label: 'Approved', value: metrics.approvedApplications, accent: 'text-[#15803D]' },
    { label: 'Not Approved', value: metrics.rejectedApplications, accent: 'text-red-700' },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="Admissions & Administration Workspace"
        subtitle="Review prospective student applications, track physical document submissions, and manage institutional admission governance."
        breadcrumbs={[{ name: 'Portal', path: '/portal' }, { name: 'Administration' }]}
      />

      <section className="py-10 sm:py-12 px-4 sm:px-6 lg:px-8 bg-[#F5F3ED] flex-1">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Top Navigation Bar */}
          <div className="bg-white rounded-3xl shadow-md border border-slate-200 p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#102B46] text-[#D9B76A] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-[#102B46] font-['Manrope']">
                  {user?.fullName || 'Authorized Staff'}
                </h2>
                <p className="text-xs text-slate-600">
                  Verified Role(s):{' '}
                  <code className="font-mono font-bold text-[#102B46]">
                    {authorization.allRoles.join(', ')}
                  </code>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('admissions')}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                  activeTab === 'admissions'
                    ? 'bg-[#102B46] text-white'
                    : 'bg-[#F5F3ED] text-[#102B46] hover:bg-slate-200'
                }`}
              >
                <ClipboardList className="w-4 h-4 text-[#D9B76A]" />
                <span>Admissions Queue</span>
              </button>

              {(canManageStaff || canManageSettings) && (
                <button
                  type="button"
                  onClick={() => setActiveTab('governance')}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                    activeTab === 'governance'
                      ? 'bg-[#102B46] text-white'
                      : 'bg-[#F5F3ED] text-[#102B46] hover:bg-slate-200'
                  }`}
                >
                  <Settings className="w-4 h-4 text-[#D9B76A]" />
                  <span>General Admin Controls</span>
                </button>
              )}

              {isGeneralAdmin && (
                <button
                  type="button"
                  onClick={() => setActiveTab('audit')}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                    activeTab === 'audit'
                      ? 'bg-[#102B46] text-white'
                      : 'bg-[#F5F3ED] text-[#102B46] hover:bg-slate-200'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-[#D9B76A]" />
                  <span>System Audit Logs</span>
                </button>
              )}

              <NavLink
                to="/portal"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs"
              >
                <ArrowLeft className="w-4 h-4 text-[#D9B76A]" />
                <span>Portal Hub</span>
              </NavLink>
            </div>
          </div>

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl p-4 text-xs sm:text-sm flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#15803D] shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-900 rounded-2xl p-4 text-xs sm:text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-[#102B46] animate-spin" />
              <p className="text-sm font-semibold text-[#102B46]">
                Loading admissions management records...
              </p>
            </div>
          ) : activeTab === 'admissions' ? (
            <div className="space-y-6">
              {/* Summary Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                {metricCards.map((m) => (
                  <div
                    key={m.label}
                    className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-sm"
                  >
                    <div className={`text-2xl font-extrabold font-['Manrope'] ${m.accent}`}>
                      {m.value}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-500 mt-0.5 leading-tight">
                      {m.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Search & Multi-Filters */}
              <div className="bg-white rounded-3xl shadow-md border border-slate-200 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-[#102B46] font-['Manrope'] flex items-center gap-2">
                    <Filter className="w-4 h-4 text-[#D9B76A]" />
                    <span>Search & Filter Admission Applications</span>
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
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={filters.search}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, search: e.target.value }))
                      }
                      placeholder="Ref (FACA-ADM-...), child or parent"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm"
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
                    className="rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm bg-white"
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
                    className="rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm bg-white"
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
                    className="rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm bg-white"
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
                    className="rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm bg-white"
                  >
                    <option value="all">All Application Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="submitted">Submitted</option>
                    <option value="pending">Pending</option>
                    <option value="under_review">Under Review</option>
                    <option value="correction_requested">Correction Requested</option>
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
                    className="rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm bg-white"
                  >
                    <option value="all">All Payment Statuses</option>
                    <option value="unpaid">Unpaid</option>
                    <option value="pending">Pending Verification</option>
                    <option value="paid">Paid (Verified)</option>
                    <option value="failed">Failed</option>
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
                    className="rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm bg-white"
                  >
                    <option value="all">All Physical Doc Statuses</option>
                    <option value="not_submitted">Not Submitted</option>
                    <option value="received">Received</option>
                    <option value="under_review">Docs Under Review</option>
                    <option value="incomplete">Incomplete</option>
                    <option value="complete">Complete & Verified</option>
                  </select>
                </div>
              </div>

              {/* Queue + Detail Workspace */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-4 bg-white rounded-3xl shadow-md border border-slate-200 p-4 space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-sm font-extrabold text-[#102B46] font-['Manrope']">
                      Matching Applications ({filteredApps.length})
                    </h4>
                  </div>

                  {filteredApps.length === 0 ? (
                    <p className="text-xs text-slate-500 p-4 text-center">
                      No admission applications match the selected filters.
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
                                className={`font-mono font-bold ${
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
                      application={selectedApplication}
                      history={appHistory}
                      auditLogs={appAuditLogs}
                      canOverride={canOverride}
                      defaultStaffName={user?.fullName || 'Admissions Officer'}
                      isBusy={isActionBusy}
                      onUpdatePhysicalDocs={handleUpdatePhysicalDocs}
                      onUpdateReviewDecision={handleUpdateReviewDecision}
                      onAdminOverrideDecision={handleAdminOverride}
                      onDownloadOfficialPdf={handleDownloadOfficialPdf}
                      onPrintOfficialForm={handlePrintOfficialForm}
                    />
                  ) : (
                    <div className="bg-white rounded-3xl shadow-md border border-slate-200 p-10 text-center text-sm text-slate-600">
                      Select an application from the queue to review details, record physical
                      documents, or issue an admission decision.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : activeTab === 'governance' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Assign / Revoke Admission Officer & Staff Roles */}
              <div className="bg-white rounded-3xl shadow-md border border-slate-200 p-6 space-y-5">
                <div className="flex items-center gap-2 text-base font-extrabold text-[#102B46] font-['Manrope']">
                  <UserPlus className="w-5 h-5 text-[#D9B76A]" />
                  <span>Assign Admission Officer & Staff Roles</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Only the General Administrator may grant or revoke staff permissions. The
                  staff member must sign into the portal with Clerk first so their verified
                  profile exists.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#102B46] mb-1">
                      Staff Member Portal Email
                    </label>
                    <input
                      type="email"
                      value={staffEmail}
                      onChange={(e) => setStaffEmail(e.target.value)}
                      placeholder="staff@fatherabrahamacademy.edu.ng"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#102B46] mb-1">
                        Institutional Role
                      </label>
                      <select
                        value={staffRoleCode}
                        onChange={(e) => setStaffRoleCode(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
                      >
                        <option value="admission_officer">Admission Officer</option>
                        <option value="principal">Principal</option>
                        <option value="secretary">School Secretary</option>
                        <option value="finance_officer">Finance Officer</option>
                        <option value="teacher">Teacher</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#102B46] mb-1">
                        Job Title
                      </label>
                      <input
                        type="text"
                        value={staffJobTitle}
                        onChange={(e) => setStaffJobTitle(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isActionBusy}
                      onClick={() => void handleAssignStaffRole('assign_role')}
                      className="px-4 py-2.5 rounded-xl bg-[#102B46] hover:bg-[#091C30] text-white font-bold text-xs"
                    >
                      Assign Role
                    </button>
                    <button
                      type="button"
                      disabled={isActionBusy}
                      onClick={() => void handleAssignStaffRole('revoke_role')}
                      className="px-4 py-2.5 rounded-xl border border-red-300 text-red-700 hover:bg-red-50 font-bold text-xs"
                    >
                      Revoke Role
                    </button>
                  </div>
                </div>

                {/* Current Staff Directory */}
                <div className="pt-4 border-t border-slate-200 space-y-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                    Active Staff & Assigned Roles ({staffDirectory.length})
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {staffDirectory.map((st, idx) => {
                      const prof = st.profiles as {
                        email?: string;
                        first_name?: string;
                        last_name?: string;
                      } | null;
                      const rolesList = (
                        (st.staff_roles as Array<{
                          is_active?: boolean;
                          roles?: { code?: string; name?: string };
                        }>) ?? []
                      )
                        .filter((r) => r.is_active)
                        .map((r) => r.roles?.name || r.roles?.code);

                      return (
                        <div
                          key={(st.id as string) || idx}
                          className="bg-[#F5F3ED] rounded-xl p-3 border border-slate-200 text-xs flex items-center justify-between gap-2"
                        >
                          <div>
                            <strong className="text-[#102B46]">
                              {prof?.first_name} {prof?.last_name}
                            </strong>
                            <div className="text-slate-600">{prof?.email}</div>
                          </div>
                          <div className="text-right font-semibold text-[#102B46]">
                            {rolesList.length > 0 ? rolesList.join(', ') : 'No active roles'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Official Admission Settings & Fee Config */}
              <form
                onSubmit={(e) => void handleSaveAdmissionSettings(e)}
                className="bg-white rounded-3xl shadow-md border border-slate-200 p-6 space-y-5"
              >
                <div className="flex items-center gap-2 text-base font-extrabold text-[#102B46] font-['Manrope']">
                  <Settings className="w-5 h-5 text-[#D9B76A]" />
                  <span>Admission Session & Application Fee Configuration</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Application fees are never hardcoded in the application. Configure the
                  authorized Naira admission application fee here so parents see the exact
                  institutional amount.
                </p>

                <div className="space-y-4">
                  <label className="flex items-center gap-2.5 text-sm font-bold text-[#102B46] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={admissionsOpenInput}
                      onChange={(e) => setAdmissionsOpenInput(e.target.checked)}
                      className="rounded border-slate-300 text-[#102B46]"
                    />
                    <span>Online Admissions Currently Open</span>
                  </label>

                  <div>
                    <label className="block text-xs font-bold text-[#102B46] mb-1">
                      Active Admission Session Label
                    </label>
                    <input
                      type="text"
                      value={sessionLabelInput}
                      onChange={(e) => setSessionLabelInput(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#102B46] mb-1">
                      Official Admission Application Fee (NGN — leave blank if unset)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="100"
                      value={feeNairaInput}
                      onChange={(e) => setFeeNairaInput(e.target.value)}
                      placeholder="e.g. 10000"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Current configured value:{' '}
                      <strong>
                        {formatNairaFromKobo(
                          lookups?.admissionSettings?.application_fee_kobo
                        ) ?? 'Not configured yet'}
                      </strong>
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isActionBusy}
                    className="px-5 py-2.5 rounded-xl bg-[#102B46] hover:bg-[#091C30] text-white font-bold text-xs sm:text-sm"
                  >
                    Save Admission Configuration
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-md border border-slate-200 p-6 space-y-4">
              <h3 className="text-base font-extrabold text-[#102B46] font-['Manrope']">
                Immutable System Audit Logs (Latest 60 Events)
              </h3>
              {systemAuditLogs.length === 0 ? (
                <p className="text-xs text-slate-500">No audit log records found yet.</p>
              ) : (
                <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
                  {systemAuditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="bg-[#F5F3ED] rounded-xl p-3 border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <code className="font-mono font-bold text-[#102B46]">
                            {log.action}
                          </code>
                          <span className="text-slate-500">
                            {log.entity_type} ({log.entity_id || '—'})
                          </span>
                        </div>
                        {log.new_values && (
                          <div className="text-[11px] text-slate-600 truncate">
                            {JSON.stringify(log.new_values)}
                          </div>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 shrink-0">
                        {new Date(log.created_at).toLocaleString('en-NG')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <OfficialAdmissionPrintSheet application={printApp} />
    </div>
  );
};
