import React, { useCallback, useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  CheckCircle2,
  Database,
  FileText,
  Loader2,
  Plus,
  Users,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { useAppAuth } from '../../context/AuthContext';
import { useSupabaseClient } from '../../hooks/useSupabaseClient';
import {
  AdmissionApplicationExpanded,
  AdmissionFormInput,
  AdmissionNotification,
  AdmissionReferenceLookups,
  AdmissionStatusHistoryItem,
} from '../../types/admissions';
import {
  fetchAdmissionLookups,
  fetchApplicationHistory,
  fetchParentApplications,
  fetchParentNotifications,
  markNotificationRead,
  saveOrSubmitParentApplication,
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

export const ParentPortal: React.FC = () => {
  const { user, authorization } = useAppAuth();
  const { supabase, isSupabaseReady } = useSupabaseClient();

  const [lookups, setLookups] = useState<AdmissionReferenceLookups | null>(null);
  const [applications, setApplications] = useState<AdmissionApplicationExpanded[]>([]);
  const [notifications, setNotifications] = useState<AdmissionNotification[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [history, setHistory] = useState<AdmissionStatusHistoryItem[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  // 'list' | 'create' | 'edit'
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [editingApp, setEditingApp] = useState<AdmissionApplicationExpanded | null>(null);
  const [printApp, setPrintApp] = useState<AdmissionApplicationExpanded | null>(null);

  const loadWorkspace = useCallback(async () => {
    if (!supabase || !isSupabaseReady || !authorization.profileId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [lookupData, appRows, notifRows] = await Promise.all([
        fetchAdmissionLookups(supabase),
        fetchParentApplications(supabase, authorization.profileId),
        fetchParentNotifications(supabase, authorization.profileId),
      ]);
      setLookups(lookupData);
      setApplications(appRows);
      setNotifications(notifRows);
      if (appRows.length > 0) {
        setSelectedAppId((prev) =>
          prev && appRows.some((a) => a.id === prev) ? prev : appRows[0].id
        );
      } else {
        setSelectedAppId(null);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Unable to load admission records. Ensure Phase 3 & 4 SQL migrations (0001–0011) are applied.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [supabase, isSupabaseReady, authorization.profileId]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  const selectedApplication =
    applications.find((a) => a.id === selectedAppId) ?? applications[0] ?? null;

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
        input,
        mode: 'draft',
        sessionYearLabel: selectedSession?.name,
        existingStatus: editingApp?.application_status,
        configuredFeeKobo: lookups?.admissionSettings?.application_fee_kobo ?? null,
      });
      await loadWorkspace();
      setSelectedAppId(saved.id);
      setMode('list');
      setEditingApp(null);
      setFeedbackBanner(
        `Draft saved (${saved.application_reference}). You can resume and submit anytime.`
      );
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
        input,
        mode: 'submit',
        sessionYearLabel: selectedSession?.name,
        existingStatus: editingApp?.application_status,
        configuredFeeKobo: lookups?.admissionSettings?.application_fee_kobo ?? null,
      });
      await loadWorkspace();
      setSelectedAppId(saved.id);
      setMode('list');
      setEditingApp(null);
      setFeedbackBanner(
        `Application ${saved.application_reference} submitted successfully.`
      );
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to submit application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadOfficialPdf = (app: AdmissionApplicationExpanded) => {
    try {
      downloadOfficialAdmissionPdf(app);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to generate PDF.');
    }
  };

  const handlePrintOfficialForm = (app: AdmissionApplicationExpanded) => {
    if (app.payment_status !== 'paid') {
      setErrorMessage(
        'Official A4 Admission Form printing is locked until application fee payment is verified.'
      );
      return;
    }
    setPrintApp(app);
    document.body.classList.add('printing-admission-form');
    setTimeout(() => {
      window.print();
      document.body.classList.remove('printing-admission-form');
    }, 100);
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

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="Family Admissions & Parent Portal"
        subtitle="Manage online applications for all children under your family account, track payment verification, and follow physical document checks."
        breadcrumbs={[{ name: 'Portal', path: '/portal' }, { name: 'Parent Portal' }]}
      />

      <section className="py-10 sm:py-14 px-4 sm:px-6 lg:px-8 bg-[#F5F3ED] flex-1">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Top Bar */}
          <div className="bg-white rounded-3xl shadow-md border border-slate-200 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-[#102B46] text-[#D9B76A] flex items-center justify-center shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-extrabold text-[#102B46] font-['Manrope'] truncate">
                  {user?.fullName || 'Parent / Guardian'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 truncate">
                  {user?.primaryEmail} • {applications.length}{' '}
                  {applications.length === 1 ? 'child application' : 'child applications'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <NavLink
                to="/portal"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm"
              >
                <ArrowLeft className="w-4 h-4 text-[#D9B76A]" />
                <span>Portal Hub</span>
              </NavLink>

              {lookups && mode === 'list' && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingApp(null);
                    setMode('create');
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#102B46] hover:bg-[#091C30] text-white font-bold text-xs sm:text-sm shadow-sm"
                >
                  <Plus className="w-4 h-4 text-[#D9B76A]" />
                  <span>Start New Child Application</span>
                </button>
              )}
            </div>
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
                <div className="font-bold">Database / Request Notice</div>
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
                Supabase Connection Required
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Configure <code className="font-mono">VITE_SUPABASE_URL</code> and{' '}
                <code className="font-mono">VITE_SUPABASE_PUBLISHABLE_KEY</code> and apply
                migrations <code className="font-mono">0001</code>–
                <code className="font-mono">0011</code> before saving or viewing live admission
                applications.
              </p>
            </div>
          ) : isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-[#102B46] animate-spin" />
              <p className="text-sm font-semibold text-[#102B46]">
                Loading your family admission records...
              </p>
            </div>
          ) : mode !== 'list' && lookups ? (
            <ParentApplicationForm
              user={user}
              lookups={lookups}
              initialApplication={mode === 'edit' ? editingApp : null}
              isSubmitting={isSubmitting}
              onSaveDraft={handleSaveDraft}
              onSubmitApplication={handleSubmitApplication}
              onCancel={() => {
                setMode('list');
                setEditingApp(null);
              }}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Children's Applications Switcher + Notifications */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-white rounded-3xl shadow-md border border-slate-200 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-extrabold text-[#102B46] font-['Manrope']">
                      Your Child Applications
                    </h3>
                    <span className="text-xs font-bold bg-[#F5F3ED] text-[#102B46] px-2.5 py-0.5 rounded-full">
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
                      {lookups && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingApp(null);
                            setMode('create');
                          }}
                          className="w-full inline-flex items-center justify-center gap-2 bg-[#102B46] hover:bg-[#091C30] text-white px-4 py-2.5 rounded-xl font-bold text-xs"
                        >
                          <Plus className="w-4 h-4 text-[#D9B76A]" />
                          <span>Start First Application</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {applications.map((app) => {
                        const active = selectedApplication?.id === app.id;
                        return (
                          <button
                            key={app.id}
                            type="button"
                            onClick={() => setSelectedAppId(app.id)}
                            className={`w-full text-left rounded-2xl p-4 border transition-all space-y-2 ${
                              active
                                ? 'bg-[#102B46] text-white border-[#102B46] shadow-md'
                                : 'bg-[#F5F3ED] hover:bg-white border-slate-200 text-[#091C30]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`font-mono text-[11px] font-bold ${
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

                {/* Admissions Notifications Feed */}
                <div className="bg-white rounded-3xl shadow-md border border-slate-200 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-extrabold text-[#102B46] font-['Manrope'] flex items-center gap-2">
                      <Bell className="w-4 h-4 text-[#D9B76A]" />
                      <span>Admission Notifications</span>
                    </h3>
                    {unreadCount > 0 && (
                      <span className="text-xs font-bold bg-[#D9B76A] text-[#091C30] px-2 py-0.5 rounded-full">
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
                    <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                      {notifications.map((n) => (
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
                          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                            <span>{new Date(n.created_at).toLocaleString('en-NG')}</span>
                            <span>
                              {n.delivery_status === 'email_queued_pending_provider'
                                ? 'Email queued (provider pending)'
                                : 'Portal Notice'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Selected Child Application Details */}
              <div className="lg:col-span-8">
                {selectedApplication ? (
                  <ParentAdmissionDetailDrawer
                    application={selectedApplication}
                    admissionSettings={lookups?.admissionSettings ?? null}
                    history={history}
                    onEditApplication={(app) => {
                      setEditingApp(app);
                      setMode('edit');
                    }}
                    onDownloadOfficialPdf={handleDownloadOfficialPdf}
                    onPrintOfficialForm={handlePrintOfficialForm}
                  />
                ) : (
                  <div className="bg-white rounded-3xl shadow-md border border-slate-200 p-8 sm:p-12 text-center space-y-4">
                    <h3 className="text-xl font-extrabold text-[#102B46] font-['Manrope']">
                      Begin Your Child&apos;s Admission Journey
                    </h3>
                    <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                      Submit an online application for Creche, Primary, or Secondary School.
                      You can manage multiple children from this single parent account, save
                      drafts, and track physical document verification.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Clean A4 Native Print Container (only active when paid & printing) */}
      <OfficialAdmissionPrintSheet application={printApp} />
    </div>
  );
};
