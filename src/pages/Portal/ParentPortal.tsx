import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Bell,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Database,
  FileText,
  Home,
  Loader2,
  Megaphone,
  Plus,
  ShieldCheck,
  UserCog,
  Users,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { useAppAuth } from '../../context/AuthContext';
import { useSupabaseClient } from '../../hooks/useSupabaseClient';
import { usePublicSchoolSettings } from '../../hooks/usePublicSchoolSettings';
import {
  AdmissionApplicationExpanded,
  AdmissionFormInput,
  AdmissionNotification,
  AdmissionReferenceLookups,
  AdmissionStatusHistoryItem,
  ApplicationPaymentWithChild,
  ParentWorkspaceProfile,
} from '../../types/admissions';
import { DbAnnouncement } from '../../types/database';
import {
  fetchAdmissionLookups,
  fetchApplicationHistory,
  fetchParentAnnouncements,
  fetchParentApplicationPayments,
  fetchParentApplications,
  fetchParentNotifications,
  fetchParentWorkspaceProfile,
  formatNairaFromKobo,
  initializeApplicationFeeCheckout,
  markNotificationRead,
  saveOrSubmitParentApplication,
  updateParentWorkspaceProfile,
} from '../../services/admissionsService';
import {
  ApplicationStatusBadge,
  PaymentStatusBadge,
  PhysicalDocsBadge,
} from '../../components/admissions/AdmissionStatusBadge';
import { ParentApplicationForm } from '../../components/admissions/ParentApplicationForm';
import { ParentAdmissionDetailDrawer } from '../../components/admissions/ParentAdmissionDetailDrawer';
import { OfficialAdmissionPrintSheet } from '../../components/admissions/OfficialAdmissionPrintSheet';
import { downloadOfficialAdmissionPdf } from '../../utils/admissionPdf';

type ParentViewKey =
  | 'dashboard'
  | 'applications'
  | 'new'
  | 'detail'
  | 'payments'
  | 'profile';

export const ParentPortal: React.FC = () => {
  const { user, authorization } = useAppAuth();
  const { supabase, isSupabaseReady, getClerkToken } = useSupabaseClient();
  const { contactInfo, announcement: publicBannerAnnouncement } = usePublicSchoolSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const { id: routeAppId } = useParams<{ id?: string }>();

  const activeView: ParentViewKey = useMemo(() => {
    const path = location.pathname.replace(/\/+$/, '');
    if (path === '/portal/parent/applications/new') return 'new';
    if (path.startsWith('/portal/parent/applications/') && routeAppId) return 'detail';
    if (path === '/portal/parent/applications') return 'applications';
    if (path === '/portal/parent/payments') return 'payments';
    if (path === '/portal/parent/profile') return 'profile';
    return 'dashboard';
  }, [location.pathname, routeAppId]);

  const [lookups, setLookups] = useState<AdmissionReferenceLookups | null>(null);
  const [applications, setApplications] = useState<AdmissionApplicationExpanded[]>([]);
  const [notifications, setNotifications] = useState<AdmissionNotification[]>([]);
  const [payments, setPayments] = useState<ApplicationPaymentWithChild[]>([]);
  const [announcements, setAnnouncements] = useState<DbAnnouncement[]>([]);
  const [parentProfile, setParentProfile] = useState<ParentWorkspaceProfile | null>(null);

  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [history, setHistory] = useState<AdmissionStatusHistoryItem[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  const [editingApp, setEditingApp] = useState<AdmissionApplicationExpanded | null>(null);
  const [submittedConfirmationApp, setSubmittedConfirmationApp] =
    useState<AdmissionApplicationExpanded | null>(null);

  const [printApp, setPrintApp] = useState<AdmissionApplicationExpanded | null>(null);
  const [printPassportUrl, setPrintPassportUrl] = useState<string | null>(null);
  const [paymentActionNotice, setPaymentActionNotice] = useState<string | null>(null);
  const [paymentActionAppId, setPaymentActionAppId] = useState<string | null>(null);

  // Family Profile form state
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    alternate_phone: '',
    occupation: '',
    residential_address: '',
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const loadWorkspace = useCallback(async () => {
    if (!supabase || !isSupabaseReady || !authorization.profileId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [
        lookupData,
        appRows,
        notifRows,
        paymentRows,
        announcementRows,
        profileRow,
      ] = await Promise.all([
        fetchAdmissionLookups(supabase),
        fetchParentApplications(supabase, authorization.profileId),
        fetchParentNotifications(supabase, authorization.profileId),
        fetchParentApplicationPayments(supabase, authorization.profileId).catch(() => []),
        fetchParentAnnouncements(supabase).catch(() => []),
        fetchParentWorkspaceProfile(supabase, authorization.profileId).catch(() => null),
      ]);

      setLookups(lookupData);
      setApplications(appRows);
      setNotifications(notifRows);
      setPayments(paymentRows);
      setAnnouncements(announcementRows);
      setParentProfile(profileRow);

      if (profileRow) {
        setProfileForm({
          first_name: profileRow.first_name || user?.firstName || '',
          last_name: profileRow.last_name || user?.lastName || '',
          phone: profileRow.phone || '',
          alternate_phone: profileRow.alternate_phone || '',
          occupation: profileRow.occupation || '',
          residential_address: profileRow.residential_address || '',
        });
      }

      if (appRows.length > 0) {
        setSelectedAppId((prev) =>
          routeAppId && appRows.some((a) => a.id === routeAppId)
            ? routeAppId
            : prev && appRows.some((a) => a.id === prev)
              ? prev
              : appRows[0].id
        );
      } else {
        setSelectedAppId(null);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Unable to load your family admission records at this time.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [supabase, isSupabaseReady, authorization.profileId, routeAppId, user?.firstName, user?.lastName]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  // Clear edit state when switching away from detail/edit views
  useEffect(() => {
    if (activeView === 'new') {
      setEditingApp(null);
    } else if (activeView !== 'detail') {
      setEditingApp(null);
      setSubmittedConfirmationApp(null);
    }
  }, [activeView]);

  useEffect(() => {
    if (activeView === 'detail' && routeAppId) {
      setSelectedAppId(routeAppId);
    }
  }, [activeView, routeAppId]);

  const selectedApplication = useMemo(() => {
    if (activeView === 'detail' && routeAppId) {
      return applications.find((a) => a.id === routeAppId) ?? null;
    }
    return applications.find((a) => a.id === selectedAppId) ?? applications[0] ?? null;
  }, [activeView, routeAppId, applications, selectedAppId]);

  useEffect(() => {
    const loadHistory = async () => {
      if (!supabase || !selectedApplication) {
        setHistory([]);
        return;
      }
      try {
        const items = await fetchApplicationHistory(supabase, selectedApplication.id);
        setHistory(items);
      } catch {
        setHistory([]);
      }
    };
    void loadHistory();
  }, [supabase, selectedApplication]);

  const handleEnsureDraftId = async (input: AdmissionFormInput): Promise<string> => {
    if (!supabase || !authorization.profileId) {
      throw new Error('Portal database session is unavailable.');
    }
    if (input.id) return input.id;

    const selectedSession = lookups?.sessions.find(
      (s) => s.id === input.intended_session_id
    );
    const saved = await saveOrSubmitParentApplication(supabase, {
      profileId: authorization.profileId,
      parentId: parentProfile?.parentId ?? null,
      input,
      mode: 'draft',
      sessionYearLabel: selectedSession?.name,
      existingStatus: editingApp?.application_status,
      configuredFeeKobo: lookups?.admissionSettings?.application_fee_kobo ?? null,
    });
    setApplications((prev) => [saved, ...prev.filter((a) => a.id !== saved.id)]);
    return saved.id;
  };

  const handleSaveDraft = async (input: AdmissionFormInput) => {
    if (!supabase || !authorization.profileId) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    setFeedbackBanner(null);
    try {
      const selectedSession = lookups?.sessions.find(
        (s) => s.id === input.intended_session_id
      );
      const saved = await saveOrSubmitParentApplication(supabase, {
        profileId: authorization.profileId,
        parentId: parentProfile?.parentId ?? null,
        input,
        mode: 'draft',
        sessionYearLabel: selectedSession?.name,
        existingStatus: editingApp?.application_status,
        configuredFeeKobo: lookups?.admissionSettings?.application_fee_kobo ?? null,
      });
      await loadWorkspace();
      setSelectedAppId(saved.id);
      setEditingApp(null);
      setFeedbackBanner(
        `Draft saved (${saved.application_reference}). You can resume and submit anytime.`
      );
      navigate(`/portal/parent/applications/${saved.id}`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save draft.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitApplication = async (input: AdmissionFormInput) => {
    if (!supabase || !authorization.profileId) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    setFeedbackBanner(null);
    try {
      const selectedSession = lookups?.sessions.find(
        (s) => s.id === input.intended_session_id
      );
      const saved = await saveOrSubmitParentApplication(supabase, {
        profileId: authorization.profileId,
        parentId: parentProfile?.parentId ?? null,
        input,
        mode: 'submit',
        sessionYearLabel: selectedSession?.name,
        existingStatus: editingApp?.application_status,
        configuredFeeKobo: lookups?.admissionSettings?.application_fee_kobo ?? null,
      });
      await loadWorkspace();
      setSelectedAppId(saved.id);
      setEditingApp(null);
      setSubmittedConfirmationApp(saved);
      setFeedbackBanner(
        `Application ${saved.application_reference} submitted successfully.`
      );
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to submit application.');
    } finally {
      setIsSubmitting(false);
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
      setErrorMessage(err instanceof Error ? err.message : 'Unable to generate PDF.');
    }
  };

  const handlePrintOfficialForm = (
    app: AdmissionApplicationExpanded,
    passportUrl?: string | null
  ) => {
    if (app.payment_status !== 'paid') {
      setErrorMessage(
        'Official A4 Admission Form printing is locked until application fee payment is verified.'
      );
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

  const handleMarkNotificationRead = async (notificationId: string) => {
    if (!supabase) return;
    try {
      await markNotificationRead(supabase, notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
    } catch {
      // ignore non-blocking UI update error
    }
  };

  const handleSaveFamilyProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !authorization.profileId) return;
    if (!profileForm.first_name.trim() || !profileForm.last_name.trim()) {
      setErrorMessage('First name and last name are required.');
      return;
    }
    setIsSavingProfile(true);
    setErrorMessage(null);
    setFeedbackBanner(null);
    try {
      await updateParentWorkspaceProfile(supabase, authorization.profileId, profileForm);
      await loadWorkspace();
      setFeedbackBanner('Family and guardian profile updated successfully.');
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to update family profile.'
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleStartPaystackCheckout = async (appId: string) => {
    setPaymentActionAppId(appId);
    setPaymentActionNotice(null);
    try {
      const token = await getClerkToken();
      const res = await initializeApplicationFeeCheckout(
        token,
        appId,
        `${window.location.origin}/portal/parent/payments`
      );
      if (res.ready && res.authorizationUrl.startsWith('https://')) {
        window.location.assign(res.authorizationUrl);
        return;
      }
      setPaymentActionNotice(
        res.ready ? 'Invalid checkout redirect URL.' : res.reason
      );
    } catch (err) {
      setPaymentActionNotice(
        err instanceof Error ? err.message : 'Unable to initiate payment checkout.'
      );
    } finally {
      setPaymentActionAppId(null);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const summaryCounts = useMemo(() => {
    const submittedCount = applications.filter(
      (a) => a.application_status !== 'draft'
    ).length;
    const awaitingAction = applications.filter(
      (a) =>
        a.application_status === 'submitted' ||
        a.application_status === 'pending' ||
        a.application_status === 'under_review' ||
        a.application_status === 'correction_requested'
    ).length;
    const approvedCount = applications.filter(
      (a) => a.application_status === 'approved'
    ).length;

    return {
      childrenCount: applications.length,
      submittedCount,
      awaitingAction,
      approvedCount,
    };
  }, [applications]);

  const navTabs = [
    { to: '/portal/parent', label: 'Dashboard', icon: Home, end: true },
    { to: '/portal/parent/applications', label: 'Applications', icon: ClipboardList, end: true },
    { to: '/portal/parent/applications/new', label: 'New Application', icon: Plus, end: true },
    { to: '/portal/parent/payments', label: 'Payments', icon: CreditCard, end: true },
    { to: '/portal/parent/profile', label: 'Family Profile', icon: UserCog, end: true },
  ];

  const renderSubmittedConfirmation = (app: AdmissionApplicationExpanded) => {
    const feeDisplay = formatNairaFromKobo(
      app.application_fee_kobo ?? lookups?.admissionSettings?.application_fee_kobo
    );
    return (
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden max-w-3xl mx-auto">
        <div className="bg-[#102B46] text-white p-6 sm:p-8 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-[#15803D] text-white flex items-center justify-center mx-auto shadow-md">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-[#D9B76A]">
            Online Admission Submission Confirmed
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-['Manrope']">
            Application Successfully Submitted
          </h2>
          <p className="text-xs sm:text-sm text-slate-200 max-w-lg mx-auto">
            Your child&apos;s admission record has been saved and assigned an official reference
            number.
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <div className="bg-[#F5F3ED] border border-slate-200 rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-500 block">
                Application Reference
              </span>
              <span className="font-mono text-base font-extrabold text-[#102B46] tabular-nums">
                {app.application_reference}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-500 block">
                Applicant Name
              </span>
              <strong className="text-[#102B46]">
                {app.child_first_name} {app.child_middle_name || ''} {app.child_last_name}
              </strong>
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-500 block">
                Section &amp; Class
              </span>
              <span>
                {app.school_sections?.name || '—'} • {app.class_levels?.name || '—'}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-500 block">
                Application Fee Status
              </span>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <PaymentStatusBadge status={app.payment_status} />
                {feeDisplay && <span className="font-bold text-[#102B46]">{feeDisplay}</span>}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#D9B76A] bg-amber-50/40 p-4 text-xs sm:text-sm text-[#102B46] space-y-1.5">
            <div className="font-extrabold">Next Steps for Parents / Guardians</div>
            <p className="text-slate-700 leading-relaxed">
              1. Complete the application fee payment when Paystack checkout goes live in Phase 5.
              <br />
              2. Download and print your official paid A4 application form from your portal.
              <br />
              3. Sign and submit the printed form with original supporting documents at the school
              Admissions Office.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setSubmittedConfirmationApp(null);
                navigate(`/portal/parent/applications/${app.id}`);
              }}
              className="inline-flex items-center justify-center gap-2 px-5 min-h-[44px] rounded-xl bg-[#102B46] hover:bg-[#091C30] text-white font-bold text-sm"
            >
              <span>View Application Status</span>
              <ArrowRight className="w-4 h-4 text-[#D9B76A]" />
            </button>

            <button
              type="button"
              onClick={() => {
                setSubmittedConfirmationApp(null);
                setEditingApp(null);
                navigate('/portal/parent/applications/new');
              }}
              className="inline-flex items-center justify-center gap-2 px-5 min-h-[44px] rounded-xl bg-[#F5F3ED] hover:bg-slate-200 text-[#102B46] border border-slate-200 font-bold text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Apply for Another Child</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="Parent Admissions & Family Portal"
        subtitle="Manage online applications for all children under your single family account, monitor fee status, and track school verification."
        breadcrumbs={[{ name: 'Portal', path: '/portal' }, { name: 'Parent Portal' }]}
      />

      <section className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 bg-[#F5F3ED] flex-1">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Family Header + Sub-Route Navigation Bar */}
          <div className="bg-white rounded-3xl shadow-md border border-slate-200 overflow-hidden">
            <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-[#102B46] text-[#D9B76A] flex items-center justify-center shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-extrabold text-[#102B46] font-['Manrope'] truncate">
                    {parentProfile
                      ? `${parentProfile.first_name} ${parentProfile.last_name}`.trim() ||
                        user?.fullName ||
                        'Parent / Guardian'
                      : user?.fullName || 'Parent / Guardian'}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 truncate tabular-nums">
                    {user?.primaryEmail} • {applications.length}{' '}
                    {applications.length === 1 ? 'child application' : 'child applications'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {lookups && activeView !== 'new' && (
                  <NavLink
                    to="/portal/parent/applications/new"
                    className="inline-flex items-center justify-center gap-2 px-4 min-h-[44px] rounded-xl bg-[#102B46] hover:bg-[#091C30] text-white font-bold text-xs sm:text-sm shadow-sm transition-colors"
                  >
                    <Plus className="w-4 h-4 text-[#D9B76A]" />
                    <span>Start New Application</span>
                  </NavLink>
                )}
              </div>
            </div>

            {/* Responsive Tab Navigation across the 6 parent routes */}
            <nav
              aria-label="Parent Portal Navigation"
              className="px-4 sm:px-6 py-3 bg-slate-50/70 flex items-center gap-2 overflow-x-auto"
            >
              {navTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <NavLink
                    key={tab.to}
                    to={tab.to}
                    end={tab.end}
                    className={({ isActive }) =>
                      `inline-flex items-center gap-2 px-3.5 min-h-[44px] rounded-xl text-xs font-bold shrink-0 transition-colors ${
                        isActive
                          ? 'bg-[#102B46] text-white shadow-sm'
                          : 'bg-white text-slate-700 border border-slate-200 hover:border-[#102B46]/40'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 text-[#D9B76A]" />
                    <span>{tab.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {feedbackBanner && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl p-4 text-xs sm:text-sm flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-[#15803D] shrink-0" />
              <span>{feedbackBanner}</span>
            </div>
          )}

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-900 rounded-2xl p-4 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold">Notice</div>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {!isSupabaseReady ? (
            <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 text-center max-w-2xl mx-auto space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#102B46] text-[#D9B76A] flex items-center justify-center mx-auto">
                <Database className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-extrabold text-[#102B46] font-['Manrope']">
                Portal Records Temporarily Unavailable
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Admissions records cannot be loaded right now. Please try again shortly or contact
                the school administration.
              </p>
            </div>
          ) : isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-[#102B46] animate-spin" />
              <p className="text-sm font-semibold text-[#102B46]">
                Loading your family admission records...
              </p>
            </div>
          ) : submittedConfirmationApp ? (
            renderSubmittedConfirmation(submittedConfirmationApp)
          ) : (activeView === 'new' || editingApp) && lookups ? (
            <ParentApplicationForm
              user={user}
              supabase={supabase}
              profileId={authorization.profileId}
              parentProfile={parentProfile}
              lookups={lookups}
              initialApplication={editingApp}
              isSubmitting={isSubmitting}
              onEnsureDraftId={handleEnsureDraftId}
              onSaveDraft={handleSaveDraft}
              onSubmitApplication={handleSubmitApplication}
              onCancel={() => {
                setEditingApp(null);
                navigate('/portal/parent/applications');
              }}
            />
          ) : activeView === 'dashboard' ? (
            /* ===================================================================
               ROUTE 1: /portal/parent — Parent Overview Dashboard
               =================================================================== */
            <div className="space-y-6">
              {/* Welcome Banner */}
              <div className="bg-[#091C30] text-white rounded-3xl shadow-lg border border-[#D9B76A]/30 p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#D9B76A]">
                    Welcome to Your Parent Portal
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-extrabold font-['Manrope']">
                    Father Abraham Children Academy Admissions
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                    Submit online applications for Creche, Primary, or Secondary classes under one
                    family account, upload your child&apos;s passport photo, and track verification
                    updates in real time.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                  <NavLink
                    to="/portal/parent/applications/new"
                    className="inline-flex items-center justify-center gap-2 px-5 min-h-[44px] rounded-xl bg-[#D9B76A] hover:bg-[#c8a556] text-[#091C30] font-extrabold text-sm transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Start New Application</span>
                  </NavLink>
                  <NavLink
                    to="/portal/parent/applications"
                    className="inline-flex items-center justify-center gap-2 px-5 min-h-[44px] rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-sm transition-colors"
                  >
                    <ClipboardList className="w-4 h-4 text-[#D9B76A]" />
                    <span>View Applications</span>
                  </NavLink>
                </div>
              </div>

              {/* 4 Overview Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Children Registered
                  </div>
                  <div className="text-3xl font-extrabold text-[#102B46] font-['Manrope'] mt-1 tabular-nums">
                    {summaryCounts.childrenCount}
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Submitted Apps
                  </div>
                  <div className="text-3xl font-extrabold text-blue-700 font-['Manrope'] mt-1 tabular-nums">
                    {summaryCounts.submittedCount}
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    In Review / Action
                  </div>
                  <div className="text-3xl font-extrabold text-amber-700 font-['Manrope'] mt-1 tabular-nums">
                    {summaryCounts.awaitingAction}
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Approved
                  </div>
                  <div className="text-3xl font-extrabold text-[#15803D] font-['Manrope'] mt-1 tabular-nums">
                    {summaryCounts.approvedCount}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Recent Applications & Activity */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="bg-white rounded-3xl shadow-md border border-slate-200 p-6 space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base font-extrabold text-[#102B46] font-['Manrope']">
                        Recent Applications &amp; Status
                      </h3>
                      <NavLink
                        to="/portal/parent/applications"
                        className="text-xs font-bold text-[#102B46] hover:text-[#D9B76A]"
                      >
                        View All
                      </NavLink>
                    </div>

                    {applications.length === 0 ? (
                      <div className="bg-[#F5F3ED] rounded-2xl p-6 text-center space-y-3 border border-slate-200">
                        <FileText className="w-8 h-8 text-[#102B46] mx-auto opacity-80" />
                        <p className="text-xs sm:text-sm text-slate-600">
                          No admission applications yet. Start your first child&apos;s application
                          online in minutes.
                        </p>
                        <NavLink
                          to="/portal/parent/applications/new"
                          className="inline-flex items-center justify-center gap-2 px-5 min-h-[44px] rounded-xl bg-[#102B46] text-white text-xs font-bold"
                        >
                          <Plus className="w-4 h-4 text-[#D9B76A]" />
                          <span>Start First Application</span>
                        </NavLink>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {applications.slice(0, 4).map((app) => (
                          <NavLink
                            key={app.id}
                            to={`/portal/parent/applications/${app.id}`}
                            className="block rounded-2xl p-4 border border-slate-200 bg-[#F5F3ED] hover:bg-white transition-colors space-y-2"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-mono text-xs font-bold text-[#102B46] tabular-nums">
                                {app.application_reference}
                              </span>
                              <span className="text-xs text-slate-500">
                                {app.school_sections?.name} • {app.class_levels?.name}
                              </span>
                            </div>
                            <div className="font-extrabold text-sm text-[#102B46] font-['Manrope']">
                              {app.child_first_name} {app.child_last_name}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              <ApplicationStatusBadge status={app.application_status} />
                              <PaymentStatusBadge status={app.payment_status} />
                              <PhysicalDocsBadge status={app.physical_documents_status} />
                            </div>
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Payment History Preview */}
                  <div className="bg-white rounded-3xl shadow-md border border-slate-200 p-6 space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base font-extrabold text-[#102B46] font-['Manrope'] flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-[#D9B76A]" />
                        <span>Payment History Preview</span>
                      </h3>
                      <NavLink
                        to="/portal/parent/payments"
                        className="text-xs font-bold text-[#102B46] hover:text-[#D9B76A]"
                      >
                        Full Payment History
                      </NavLink>
                    </div>

                    {payments.length === 0 ? (
                      <p className="text-xs sm:text-sm text-slate-600 bg-[#F5F3ED] rounded-2xl p-4 border border-slate-200">
                        No verified application fee payments recorded yet. Live Paystack checkout
                        launches in Phase 5.
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {payments.slice(0, 3).map((pay) => (
                          <div
                            key={pay.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#F5F3ED] rounded-xl px-4 py-3 border border-slate-200 text-xs"
                          >
                            <div>
                              <strong className="text-[#102B46]">
                                {pay.admission_applications
                                  ? `${pay.admission_applications.child_first_name} ${pay.admission_applications.child_last_name}`
                                  : pay.payment_reference}
                              </strong>
                              <div className="text-slate-500 font-mono tabular-nums">
                                {pay.payment_reference}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-[#102B46] tabular-nums">
                                {formatNairaFromKobo(pay.amount_kobo) || 'NGN'}
                              </span>
                              <span className="uppercase text-[11px] font-bold px-2 py-0.5 rounded bg-white border border-slate-200">
                                {pay.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Notifications + School Announcements */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="bg-white rounded-3xl shadow-md border border-slate-200 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-extrabold text-[#102B46] font-['Manrope'] flex items-center gap-2">
                        <Bell className="w-4 h-4 text-[#D9B76A]" />
                        <span>Admission Notifications</span>
                      </h3>
                      {unreadCount > 0 && (
                        <span className="text-xs font-bold bg-[#D9B76A] text-[#091C30] px-2.5 py-0.5 rounded-full tabular-nums">
                          {unreadCount} new
                        </span>
                      )}
                    </div>

                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-500">
                        Status updates, correction requests, and document verification notices will
                        appear here.
                      </p>
                    ) : (
                      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                        {notifications.slice(0, 6).map((n) => (
                          <div
                            key={n.id}
                            className={`rounded-2xl p-3 border text-xs space-y-1 ${
                              n.is_read
                                ? 'bg-slate-50 border-slate-200 text-slate-600'
                                : 'bg-amber-50/60 border-amber-200 text-[#091C30]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <strong className="text-[#102B46]">{n.title}</strong>
                              {!n.is_read && (
                                <button
                                  type="button"
                                  onClick={() => void handleMarkNotificationRead(n.id)}
                                  className="text-[11px] font-bold text-[#102B46] underline shrink-0"
                                >
                                  Mark read
                                </button>
                              )}
                            </div>
                            <p className="leading-relaxed">{n.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* School Announcements */}
                  <div className="bg-white rounded-3xl shadow-md border border-slate-200 p-6 space-y-4">
                    <h3 className="text-base font-extrabold text-[#102B46] font-['Manrope'] flex items-center gap-2">
                      <Megaphone className="w-4 h-4 text-[#D9B76A]" />
                      <span>School Announcements</span>
                    </h3>

                    {publicBannerAnnouncement?.is_active && publicBannerAnnouncement.message && (
                      <div className="bg-[#102B46] text-white rounded-2xl p-4 text-xs space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#D9B76A]">
                          {publicBannerAnnouncement.badge || 'Notice'}
                        </div>
                        <p className="leading-relaxed">{publicBannerAnnouncement.message}</p>
                      </div>
                    )}

                    {announcements.length === 0 ? (
                      !publicBannerAnnouncement?.is_active && (
                        <p className="text-xs text-slate-500">
                          Official school circulars and admission notices will appear here once
                          published by the administration.
                        </p>
                      )
                    ) : (
                      <div className="space-y-2.5">
                        {announcements.map((a) => (
                          <div
                            key={a.id}
                            className="bg-[#F5F3ED] rounded-2xl p-3.5 border border-slate-200 text-xs space-y-1"
                          >
                            <strong className="text-[#102B46] block">{a.title}</strong>
                            <p className="text-slate-600 leading-relaxed">{a.body}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : activeView === 'payments' ? (
            /* ===================================================================
               ROUTE 5: /portal/parent/payments — Payment History & Fee Readiness
               =================================================================== */
            <div className="space-y-6">
              <div className="bg-white rounded-3xl shadow-md border border-slate-200 p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-[#D9B76A]">
                      Admissions Billing &amp; Paystack Readiness
                    </span>
                    <h3 className="text-xl font-extrabold text-[#102B46] font-['Manrope']">
                      Application Fee Status &amp; Payment History
                    </h3>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#F5F3ED] text-[#102B46] px-3 py-1.5 rounded-xl border border-slate-200">
                    <ShieldCheck className="w-4 h-4 text-[#D9B76A]" />
                    <span>Admissions Fee Separate From Termly School Fees</span>
                  </span>
                </div>

                {paymentActionNotice && (
                  <div className="bg-[#F5F3ED] border border-[#D9B76A] rounded-2xl p-4 text-xs sm:text-sm text-[#102B46]">
                    <strong>Paystack Notice:</strong> {paymentActionNotice}
                  </div>
                )}

                {applications.length === 0 ? (
                  <p className="text-sm text-slate-600 bg-[#F5F3ED] rounded-2xl p-5 border border-slate-200">
                    Start an admission application first to see applicable NGN application fee
                    details.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {applications.map((app) => {
                      const fee = formatNairaFromKobo(
                        app.application_fee_kobo ?? lookups?.admissionSettings?.application_fee_kobo
                      );
                      const isPaid = app.payment_status === 'paid';
                      const isDraft = app.application_status === 'draft';
                      return (
                        <div
                          key={app.id}
                          className="bg-[#F5F3ED] rounded-2xl border border-slate-200 p-5 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="font-mono text-xs font-bold text-[#102B46] tabular-nums">
                                {app.application_reference}
                              </span>
                              <h4 className="font-extrabold text-base text-[#102B46] font-['Manrope']">
                                {app.child_first_name} {app.child_last_name}
                              </h4>
                              <p className="text-xs text-slate-600">
                                {app.school_sections?.name} • {app.class_levels?.name}
                              </p>
                            </div>
                            <PaymentStatusBadge status={app.payment_status} />
                          </div>

                          <div className="text-xs text-slate-700 flex items-center justify-between pt-2 border-t border-slate-200">
                            <span>Configured Application Fee:</span>
                            <strong className="text-[#102B46] tabular-nums">
                              {fee || 'Pending Admin Setup'}
                            </strong>
                          </div>

                          <div className="flex flex-wrap gap-2 pt-1">
                            {!isPaid && !isDraft && (
                              <button
                                type="button"
                                disabled={paymentActionAppId === app.id}
                                onClick={() => void handleStartPaystackCheckout(app.id)}
                                className="inline-flex items-center gap-2 px-4 min-h-[44px] rounded-xl bg-[#D9B76A] hover:bg-[#c8a556] text-[#091C30] font-bold text-xs"
                              >
                                {paymentActionAppId === app.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <CreditCard className="w-4 h-4" />
                                )}
                                <span>Proceed to Paystack Payment</span>
                              </button>
                            )}
                            <NavLink
                              to={`/portal/parent/applications/${app.id}`}
                              className="inline-flex items-center gap-1.5 px-4 min-h-[44px] rounded-xl bg-white border border-slate-200 text-[#102B46] font-bold text-xs"
                            >
                              <span>Open Application</span>
                            </NavLink>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Verified / Recorded Transaction Log */}
              <div className="bg-white rounded-3xl shadow-md border border-slate-200 p-6 space-y-4">
                <h3 className="text-base font-extrabold text-[#102B46] font-['Manrope']">
                  Recorded Payment Transactions
                </h3>
                {payments.length === 0 ? (
                  <p className="text-xs sm:text-sm text-slate-500">
                    No Paystack payment transactions have been recorded for your account yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {payments.map((p) => (
                      <div
                        key={p.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F5F3ED] rounded-2xl p-4 border border-slate-200 text-xs sm:text-sm"
                      >
                        <div className="space-y-0.5">
                          <div className="font-bold text-[#102B46]">
                            {p.admission_applications
                              ? `${p.admission_applications.child_first_name} ${p.admission_applications.child_last_name} (${p.admission_applications.application_reference})`
                              : 'Admission Application Fee'}
                          </div>
                          <div className="font-mono text-xs text-slate-600 tabular-nums">
                            Ref: {p.payment_reference} •{' '}
                            {new Date(p.created_at).toLocaleString('en-NG')}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-extrabold text-[#102B46] tabular-nums">
                            {formatNairaFromKobo(p.amount_kobo) || 'NGN'}
                          </span>
                          <span className="uppercase text-xs font-bold px-2.5 py-1 rounded-lg bg-white border border-slate-200">
                            {p.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : activeView === 'profile' ? (
            /* ===================================================================
               ROUTE 6: /portal/parent/profile — Family & Guardian Profile
               =================================================================== */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <form
                onSubmit={(e) => void handleSaveFamilyProfile(e)}
                className="lg:col-span-7 bg-white rounded-3xl shadow-md border border-slate-200 p-6 sm:p-8 space-y-5"
              >
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#D9B76A]">
                    Single Family Account
                  </span>
                  <h3 className="text-xl font-extrabold text-[#102B46] font-['Manrope']">
                    Parent / Guardian Profile
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1">
                    Keep your contact information up to date. These details pre-fill new child
                    admission forms automatically.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#102B46] mb-1.5">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={profileForm.first_name}
                      onChange={(e) =>
                        setProfileForm((p) => ({ ...p, first_name: e.target.value }))
                      }
                      className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#102B46] mb-1.5">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={profileForm.last_name}
                      onChange={(e) =>
                        setProfileForm((p) => ({ ...p, last_name: e.target.value }))
                      }
                      className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#102B46] mb-1.5">
                      Primary Phone Number
                    </label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) =>
                        setProfileForm((p) => ({ ...p, phone: e.target.value }))
                      }
                      placeholder="+234..."
                      className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#102B46] mb-1.5">
                      Alternate Phone Number
                    </label>
                    <input
                      type="tel"
                      value={profileForm.alternate_phone}
                      onChange={(e) =>
                        setProfileForm((p) => ({ ...p, alternate_phone: e.target.value }))
                      }
                      placeholder="Optional"
                      className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#102B46] mb-1.5">
                      Verified Portal Email
                    </label>
                    <input
                      type="email"
                      value={parentProfile?.email || user?.primaryEmail || ''}
                      disabled
                      className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-slate-100 text-slate-600 px-3.5 py-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#102B46] mb-1.5">
                      Occupation / Profession
                    </label>
                    <input
                      type="text"
                      value={profileForm.occupation}
                      onChange={(e) =>
                        setProfileForm((p) => ({ ...p, occupation: e.target.value }))
                      }
                      className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#102B46] mb-1.5">
                    Residential Address
                  </label>
                  <input
                    type="text"
                    value={profileForm.residential_address}
                    onChange={(e) =>
                      setProfileForm((p) => ({ ...p, residential_address: e.target.value }))
                    }
                    className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="inline-flex items-center justify-center gap-2 px-6 min-h-[44px] rounded-xl bg-[#102B46] hover:bg-[#091C30] text-white font-bold text-sm disabled:opacity-50"
                >
                  {isSavingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Save Family Profile</span>
                </button>
              </form>

              <div className="lg:col-span-5 bg-white rounded-3xl shadow-md border border-slate-200 p-6 space-y-4">
                <h4 className="text-base font-extrabold text-[#102B46] font-['Manrope']">
                  Children Registered Under Your Account ({applications.length})
                </h4>
                <p className="text-xs text-slate-600">
                  A single family account manages all siblings separately while keeping shared
                  guardian contact records.
                </p>

                {applications.length === 0 ? (
                  <div className="bg-[#F5F3ED] rounded-2xl p-4 text-xs text-slate-600 border border-slate-200">
                    No child applications recorded yet.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {applications.map((app) => (
                      <NavLink
                        key={app.id}
                        to={`/portal/parent/applications/${app.id}`}
                        className="block bg-[#F5F3ED] hover:bg-slate-100 rounded-2xl p-3.5 border border-slate-200 space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <strong className="text-[#102B46]">
                            {app.child_first_name} {app.child_last_name}
                          </strong>
                          <span className="font-mono text-[11px] text-slate-500">
                            {app.application_reference}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600">
                          {app.school_sections?.name} • {app.class_levels?.name}
                        </div>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ===================================================================
               ROUTES 2 & 4: /portal/parent/applications & /portal/parent/applications/:id
               =================================================================== */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Children's Applications Switcher */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-white rounded-3xl shadow-md border border-slate-200 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-extrabold text-[#102B46] font-['Manrope']">
                      Your Child Applications
                    </h3>
                    <span className="text-xs font-bold bg-[#F5F3ED] text-[#102B46] px-2.5 py-0.5 rounded-full tabular-nums">
                      {applications.length}
                    </span>
                  </div>

                  {applications.length === 0 ? (
                    <div className="bg-[#F5F3ED] rounded-2xl p-5 text-center space-y-3 border border-slate-200">
                      <FileText className="w-8 h-8 text-[#102B46] mx-auto opacity-80" />
                      <p className="text-xs sm:text-sm text-slate-600">
                        You have not started any child admission application yet. Each child
                        receives a separate reference and tracking record.
                      </p>
                      <NavLink
                        to="/portal/parent/applications/new"
                        className="w-full inline-flex items-center justify-center gap-2 bg-[#102B46] hover:bg-[#091C30] text-white px-4 min-h-[44px] rounded-xl font-bold text-xs"
                      >
                        <Plus className="w-4 h-4 text-[#D9B76A]" />
                        <span>Start First Application</span>
                      </NavLink>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {applications.map((app) => {
                        const active = selectedApplication?.id === app.id;
                        return (
                          <button
                            key={app.id}
                            type="button"
                            onClick={() => {
                              setSelectedAppId(app.id);
                              navigate(`/portal/parent/applications/${app.id}`);
                            }}
                            className={`w-full text-left rounded-2xl p-4 border transition-all space-y-2 ${
                              active
                                ? 'bg-[#102B46] text-white border-[#102B46] shadow-md'
                                : 'bg-[#F5F3ED] hover:bg-white border-slate-200 text-[#091C30]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`font-mono text-[11px] font-bold tabular-nums ${
                                  active ? 'text-[#D9B76A]' : 'text-[#102B46]'
                                }`}
                              >
                                {app.application_reference}
                              </span>
                              <span
                                className={`text-[11px] ${
                                  active ? 'text-slate-300' : 'text-slate-500'
                                }`}
                              >
                                {app.school_sections?.name}
                              </span>
                            </div>
                            <div className="font-extrabold text-sm font-['Manrope']">
                              {app.child_first_name} {app.child_last_name}
                            </div>
                            <div className="text-[11px] opacity-85">
                              {app.class_levels?.name} • {app.academic_sessions?.name}
                            </div>
                            <div className="flex flex-wrap gap-1.5 pt-1">
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
              </div>

              {/* Right Column: Selected Child Application Details */}
              <div className="lg:col-span-8">
                {selectedApplication ? (
                  <ParentAdmissionDetailDrawer
                    supabase={supabase}
                    getClerkToken={getClerkToken}
                    application={selectedApplication}
                    admissionSettings={lookups?.admissionSettings ?? null}
                    history={history}
                    onEditApplication={(app) => {
                      setEditingApp(app);
                    }}
                    onDownloadOfficialPdf={(app, url) =>
                      void handleDownloadOfficialPdf(app, url)
                    }
                    onPrintOfficialForm={handlePrintOfficialForm}
                  />
                ) : (
                  <div className="bg-white rounded-3xl shadow-md border border-slate-200 p-8 sm:p-12 text-center space-y-4">
                    <h3 className="text-xl font-extrabold text-[#102B46] font-['Manrope']">
                      {activeView === 'detail'
                        ? 'Admission Application Not Found'
                        : 'Select or Start an Admission Application'}
                    </h3>
                    <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                      Submit an online application for Creche, Primary, or Secondary School under
                      your family account.
                    </p>
                    <NavLink
                      to="/portal/parent/applications/new"
                      className="inline-flex items-center justify-center gap-2 bg-[#102B46] text-white px-5 min-h-[44px] rounded-xl font-bold text-xs"
                    >
                      <Plus className="w-4 h-4 text-[#D9B76A]" />
                      <span>Start New Application</span>
                    </NavLink>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Clean A4 Native Print Container (only active when paid & printing) */}
      <OfficialAdmissionPrintSheet
        application={printApp}
        passportImageUrl={printPassportUrl}
      />
    </div>
  );
};
