import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { UserButton } from '@clerk/react';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  FileSpreadsheet,
  Filter,
  Globe,
  GraduationCap,
  LayoutDashboard,
  Loader2,
  LogOut,
  Megaphone,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { useAppAuth } from '../../context/AuthContext';
import { useSupabaseClient } from '../../hooks/useSupabaseClient';
import {
  notifyPublicSchoolSettingsChanged,
  usePublicSchoolSettings,
} from '../../hooks/usePublicSchoolSettings';
import { getSupabaseConfigStatus } from '../../lib/supabase';
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
  updatePublicAnnouncementConfig,
  updatePublicContactInfoConfig,
} from '../../services/admissionsService';
import {
  ApplicationStatusBadge,
  PaymentStatusBadge,
  PhysicalDocsBadge,
} from '../../components/admissions/AdmissionStatusBadge';
import { StaffApplicationDetailPanel } from '../../components/admissions/StaffApplicationDetailPanel';
import { OfficialAdmissionPrintSheet } from '../../components/admissions/OfficialAdmissionPrintSheet';
import { downloadOfficialAdmissionPdf } from '../../utils/admissionPdf';

type AdminModuleId =
  | 'overview'
  | 'admissions'
  | 'students'
  | 'parents'
  | 'staff'
  | 'classes'
  | 'sessions'
  | 'attendance'
  | 'results'
  | 'finance'
  | 'announcements'
  | 'website'
  | 'settings'
  | 'audit';

interface AdminNavItem {
  id: AdminModuleId;
  label: string;
  icon: React.ReactNode;
  visible: boolean;
}

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
  const { user, authorization, signOut } = useAppAuth();
  const { supabase, isSupabaseReady, getClerkToken } = useSupabaseClient();
  const {
    contactInfo,
    announcement,
    refresh: refreshPublicSettings,
  } = usePublicSchoolSettings();
  const supabaseStatus = getSupabaseConfigStatus();

  const isGeneralAdmin = authorization.allRoles.includes('general_admin');
  const canReadAdmissions =
    isGeneralAdmin ||
    authorization.permissions.includes('admissions.read') ||
    authorization.permissions.includes('admissions.review') ||
    authorization.allRoles.includes('admission_officer');
  const canOverride =
    isGeneralAdmin || authorization.permissions.includes('admissions.override');
  const canManageStaff =
    isGeneralAdmin || authorization.permissions.includes('staff.manage');
  const canManageSettings =
    isGeneralAdmin || authorization.permissions.includes('settings.manage');
  const canManageCommunication =
    isGeneralAdmin ||
    canManageSettings ||
    authorization.permissions.includes('communication.manage');
  const canManageFinance =
    isGeneralAdmin ||
    authorization.permissions.includes('finance.manage') ||
    authorization.permissions.includes('finance.read');
  const canReadAudit =
    isGeneralAdmin || authorization.permissions.includes('audit.read');

  const [activeModule, setActiveModule] = useState<AdminModuleId>(() =>
    isGeneralAdmin ? 'overview' : 'admissions'
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [lookups, setLookups] = useState<AdmissionReferenceLookups | null>(null);
  const [applications, setApplications] = useState<AdmissionApplicationExpanded[]>([]);
  const [filters, setFilters] = useState<AdmissionFilters>(DEFAULT_FILTERS);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [appHistory, setAppHistory] = useState<AdmissionStatusHistoryItem[]>([]);
  const [appAuditLogs, setAppAuditLogs] = useState<DbAuditLog[]>([]);

  const [staffDirectory, setStaffDirectory] = useState<Array<Record<string, unknown>>>([]);
  const [systemAuditLogs, setSystemAuditLogs] = useState<DbAuditLog[]>([]);

  // Staff Role Assignment Form
  const [staffEmail, setStaffEmail] = useState('');
  const [staffRoleCode, setStaffRoleCode] = useState('admission_officer');
  const [staffJobTitle, setStaffJobTitle] = useState('Admission Officer');
  const [staffDepartment, setStaffDepartment] = useState('Admissions');

  // Admission & Fee Settings Form
  const [feeNairaInput, setFeeNairaInput] = useState('');
  const [admissionsOpenInput, setAdmissionsOpenInput] = useState(true);
  const [sessionLabelInput, setSessionLabelInput] = useState('2026/2027');

  // Website Contact Settings Form
  const [contactAddress, setContactAddress] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactHours, setContactHours] = useState('');
  const [contactWhatsapp, setContactWhatsapp] = useState('');

  // Public Announcement Form
  const [announceActive, setAnnounceActive] = useState(false);
  const [announceBadge, setAnnounceBadge] = useState('Notice');
  const [announceMessage, setAnnounceMessage] = useState('');
  const [announceCtaLabel, setAnnounceCtaLabel] = useState('Apply Now');
  const [announceCtaPath, setAnnounceCtaPath] = useState('/apply');

  const [isLoading, setIsLoading] = useState(true);
  const [isActionBusy, setIsActionBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [printApp, setPrintApp] = useState<AdmissionApplicationExpanded | null>(null);
  const [printPassportUrl, setPrintPassportUrl] = useState<string | null>(null);

  useEffect(() => {
    if (contactInfo) {
      setContactAddress(contactInfo.address || '');
      setContactPhone(contactInfo.phone || '');
      setContactEmail(contactInfo.email || '');
      setContactHours(contactInfo.hours || '');
      setContactWhatsapp(contactInfo.whatsapp_url || '');
    }
  }, [contactInfo]);

  useEffect(() => {
    if (announcement) {
      setAnnounceActive(announcement.is_active);
      setAnnounceBadge(announcement.badge || 'Notice');
      setAnnounceMessage(announcement.message || '');
      setAnnounceCtaLabel(announcement.cta_label || 'Apply Now');
      setAnnounceCtaPath(announcement.cta_path || '/apply');
    }
  }, [announcement]);

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
        canReadAdmissions ? fetchAllApplicationsForStaff(supabase) : Promise.resolve([]),
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

      if (canManageStaff || canReadAudit || isGeneralAdmin) {
        try {
          const token = await getClerkToken();
          const gov = await fetchAdminStaffDirectory(supabase, token);
          setStaffDirectory(gov.staff);
          setSystemAuditLogs(gov.auditLogs);
        } catch {
          // Non-blocking if restricted
        }
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to load administration workspace.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    supabase,
    isSupabaseReady,
    canReadAdmissions,
    canManageStaff,
    canReadAudit,
    isGeneralAdmin,
    getClerkToken,
  ]);

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

  const navItems: AdminNavItem[] = useMemo(
    () => [
      {
        id: 'overview',
        label: 'Dashboard Overview',
        icon: <LayoutDashboard className="w-4 h-4" />,
        visible: isGeneralAdmin || authorization.allRoles.includes('principal'),
      },
      {
        id: 'admissions',
        label: 'Admissions',
        icon: <ClipboardList className="w-4 h-4" />,
        visible: canReadAdmissions,
      },
      {
        id: 'students',
        label: 'Students',
        icon: <GraduationCap className="w-4 h-4" />,
        visible: isGeneralAdmin || authorization.allRoles.includes('principal') || authorization.allRoles.includes('secretary'),
      },
      {
        id: 'parents',
        label: 'Parents & Guardians',
        icon: <Users className="w-4 h-4" />,
        visible: isGeneralAdmin || authorization.allRoles.includes('principal') || authorization.allRoles.includes('secretary'),
      },
      {
        id: 'staff',
        label: 'Staff Management',
        icon: <UserCheck className="w-4 h-4" />,
        visible: canManageStaff,
      },
      {
        id: 'classes',
        label: 'Classes & Subjects',
        icon: <BookOpen className="w-4 h-4" />,
        visible: isGeneralAdmin || authorization.allRoles.includes('principal'),
      },
      {
        id: 'sessions',
        label: 'Academic Sessions & Terms',
        icon: <CalendarDays className="w-4 h-4" />,
        visible: isGeneralAdmin || authorization.allRoles.includes('principal'),
      },
      {
        id: 'attendance',
        label: 'Attendance',
        icon: <ClipboardCheck className="w-4 h-4" />,
        visible: isGeneralAdmin || authorization.allRoles.includes('principal'),
      },
      {
        id: 'results',
        label: 'Results & Report Cards',
        icon: <FileSpreadsheet className="w-4 h-4" />,
        visible: isGeneralAdmin || authorization.allRoles.includes('principal'),
      },
      {
        id: 'finance',
        label: 'Fees & Payments',
        icon: <CreditCard className="w-4 h-4" />,
        visible: canManageFinance,
      },
      {
        id: 'announcements',
        label: 'Announcements',
        icon: <Megaphone className="w-4 h-4" />,
        visible: canManageCommunication,
      },
      {
        id: 'website',
        label: 'Website Management',
        icon: <Globe className="w-4 h-4" />,
        visible: canManageSettings,
      },
      {
        id: 'settings',
        label: 'School Settings',
        icon: <Settings className="w-4 h-4" />,
        visible: canManageSettings,
      },
      {
        id: 'audit',
        label: 'Audit Logs',
        icon: <Activity className="w-4 h-4" />,
        visible: canReadAudit,
      },
    ],
    [
      isGeneralAdmin,
      authorization.allRoles,
      canReadAdmissions,
      canManageStaff,
      canManageFinance,
      canManageCommunication,
      canManageSettings,
      canReadAudit,
    ]
  );

  const visibleNavItems = navItems.filter((item) => item.visible);

  useEffect(() => {
    if (visibleNavItems.length > 0 && !visibleNavItems.some((i) => i.id === activeModule)) {
      setActiveModule(visibleNavItems[0].id);
    }
  }, [visibleNavItems, activeModule]);

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
      await loadAdmissionsWorkspace();
      await loadSelectedDetails();
      setSuccessMsg('General Administrator decision override executed and logged.');
    } finally {
      setIsActionBusy(false);
    }
  };

  const handleAssignStaffRole = async (
    action: 'assign_role' | 'revoke_role',
    overrideEmail?: string,
    overrideRole?: string
  ) => {
    if (!supabase) return;
    const targetEmail = (overrideEmail ?? staffEmail).trim();
    const roleCode = (overrideRole ?? staffRoleCode).trim();

    if (!targetEmail) {
      setErrorMsg('Enter the staff member’s portal email address.');
      return;
    }

    setIsActionBusy(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const token = await getClerkToken();
      await assignOrRevokeStaffRole(supabase, token, authorization.profileId, {
        action,
        targetEmail,
        roleCode,
        jobTitle: staffJobTitle.trim(),
        department: staffDepartment.trim(),
      });
      await loadAdmissionsWorkspace();
      setSuccessMsg(
        `Role "${roleCode.replace(/_/g, ' ')}" ${
          action === 'assign_role' ? 'assigned to' : 'revoked from'
        } ${targetEmail}.`
      );
      if (!overrideEmail) {
        setStaffEmail('');
      }
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

  const handleSaveWebsiteContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !authorization.profileId) return;
    setIsActionBusy(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const token = await getClerkToken();
      await updatePublicContactInfoConfig(supabase, token, authorization.profileId, {
        address: contactAddress,
        phone: contactPhone,
        email: contactEmail,
        hours: contactHours,
        whatsapp_url: contactWhatsapp,
      });
      await refreshPublicSettings();
      notifyPublicSchoolSettingsChanged();
      setSuccessMsg('Public website contact details saved.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save public contact details.');
    } finally {
      setIsActionBusy(false);
    }
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !authorization.profileId) return;
    setIsActionBusy(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const token = await getClerkToken();
      await updatePublicAnnouncementConfig(supabase, token, authorization.profileId, {
        is_active: announceActive,
        badge: announceBadge,
        message: announceMessage,
        cta_label: announceCtaLabel,
        cta_path: announceCtaPath,
      });
      await refreshPublicSettings();
      notifyPublicSchoolSettingsChanged();
      setSuccessMsg(
        announceActive && announceMessage.trim()
          ? 'Public website announcement banner published.'
          : 'Public website announcement banner hidden.'
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save public announcement.');
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

  const activeNavLabel =
    visibleNavItems.find((i) => i.id === activeModule)?.label || 'Administration';

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F3ED]">
      <PageHeader
        title={
          isGeneralAdmin
            ? 'General Administrator Control Panel'
            : 'School Administration Workspace'
        }
        subtitle="Father Abraham Children Academy • Institutional Operations & Governance"
        breadcrumbs={[{ name: 'Administration' }]}
      />

      <section className="py-8 px-4 sm:px-6 lg:px-8 flex-1">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 items-start">
          {/* Responsive Sidebar Navigation */}
          <aside className="w-full lg:w-68 shrink-0 bg-[#091C30] text-white rounded-3xl shadow-xl border border-[#D9B76A]/30 overflow-hidden">
            <div className="p-5 border-b border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: 'w-10 h-10 border-2 border-[#D9B76A]',
                    },
                  }}
                />
                <div className="min-w-0">
                  <div className="text-sm font-extrabold font-['Manrope'] truncate">
                    {user?.fullName || 'Administrator'}
                  </div>
                  <div className="text-[11px] text-[#D9B76A] font-semibold uppercase tracking-wider truncate">
                    {isGeneralAdmin
                      ? 'School Owner • General Admin'
                      : authorization.allRoles.map((r) => r.replace(/_/g, ' ')).join(', ')}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobileNavOpen((prev) => !prev)}
                className="lg:hidden p-2 rounded-xl bg-white/10 hover:bg-white/20 text-[#D9B76A]"
                aria-label="Toggle admin navigation"
              >
                {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>

            <nav
              className={`${
                mobileNavOpen ? 'flex' : 'hidden lg:flex'
              } flex-col gap-1 p-3`}
            >
              {visibleNavItems.map((item) => {
                const isActive = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveModule(item.id);
                      setMobileNavOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors text-left ${
                      isActive
                        ? 'bg-[#D9B76A] text-[#091C30]'
                        : 'text-slate-200 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className={isActive ? 'text-[#091C30]' : 'text-[#D9B76A]'}>
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}

              <div className="mt-3 pt-3 border-t border-white/10 flex flex-col gap-1">
                <NavLink
                  to="/"
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white"
                >
                  <ArrowLeft className="w-4 h-4 text-[#D9B76A]" />
                  <span>Public Website</span>
                </NavLink>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-red-500/20 hover:text-white text-left"
                >
                  <LogOut className="w-4 h-4 text-[#D9B76A]" />
                  <span>Sign Out</span>
                </button>
              </div>
            </nav>
          </aside>

          {/* Main Workspace Content */}
          <div className="flex-1 w-full min-w-0 space-y-6">
            {/* Active Section Header */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#D9B76A]">
                  Institutional Control Panel
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#102B46] font-['Manrope']">
                  {activeNavLabel}
                </h2>
              </div>
              <div className="text-xs text-slate-500">
                Active Session:{' '}
                <strong className="text-[#102B46]">
                  {lookups?.admissionSettings?.current_session_label ||
                    lookups?.sessions.find((s) => s.is_current)?.name ||
                    'Not configured'}
                </strong>
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
              <div className="py-16 flex flex-col items-center justify-center gap-3 bg-white rounded-3xl border border-slate-200">
                <Loader2 className="w-8 h-8 text-[#102B46] animate-spin" />
                <p className="text-sm font-semibold text-[#102B46]">
                  Loading workspace records...
                </p>
              </div>
            ) : activeModule === 'overview' ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Admission Applications
                    </div>
                    <div className="text-3xl font-extrabold text-[#102B46] font-['Manrope'] mt-2">
                      {metrics.totalApplications}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {metrics.awaitingReview} awaiting review • {metrics.approvedApplications}{' '}
                      approved
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Provisioned Staff
                    </div>
                    <div className="text-3xl font-extrabold text-[#102B46] font-['Manrope'] mt-2">
                      {staffDirectory.length}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Authoritative staff records
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      School Sections
                    </div>
                    <div className="text-3xl font-extrabold text-[#102B46] font-['Manrope'] mt-2">
                      {lookups?.sections.length ?? 0}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {lookups?.classLevels.length ?? 0} active class levels
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Website Contact Profile
                    </div>
                    <div className="text-lg font-extrabold text-[#102B46] font-['Manrope'] mt-2">
                      {contactInfo?.configured ? 'Configured' : 'Not Configured'}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {announcement?.is_active
                        ? 'Announcement banner active'
                        : 'Announcement banner hidden'}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
                  <h3 className="text-base font-extrabold text-[#102B46] font-['Manrope']">
                    Quick Administrative Actions
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveModule('admissions')}
                      className="p-4 rounded-2xl bg-[#F5F3ED] hover:bg-[#102B46] hover:text-white text-[#102B46] border border-slate-200 text-left transition-colors group"
                    >
                      <ClipboardList className="w-5 h-5 text-[#D9B76A] mb-2" />
                      <div className="font-bold text-sm">Review Admissions</div>
                      <div className="text-xs opacity-75 mt-0.5">
                        Inspect &amp; approve applications
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveModule('staff')}
                      className="p-4 rounded-2xl bg-[#F5F3ED] hover:bg-[#102B46] hover:text-white text-[#102B46] border border-slate-200 text-left transition-colors"
                    >
                      <UserPlus className="w-5 h-5 text-[#D9B76A] mb-2" />
                      <div className="font-bold text-sm">Manage Staff Roles</div>
                      <div className="text-xs opacity-75 mt-0.5">
                        Assign multi-role permissions
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveModule('website')}
                      className="p-4 rounded-2xl bg-[#F5F3ED] hover:bg-[#102B46] hover:text-white text-[#102B46] border border-slate-200 text-left transition-colors"
                    >
                      <Globe className="w-5 h-5 text-[#D9B76A] mb-2" />
                      <div className="font-bold text-sm">Website Contact Info</div>
                      <div className="text-xs opacity-75 mt-0.5">
                        Configure verified school contact details
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveModule('announcements')}
                      className="p-4 rounded-2xl bg-[#F5F3ED] hover:bg-[#102B46] hover:text-white text-[#102B46] border border-slate-200 text-left transition-colors"
                    >
                      <Megaphone className="w-5 h-5 text-[#D9B76A] mb-2" />
                      <div className="font-bold text-sm">Public Announcements</div>
                      <div className="text-xs opacity-75 mt-0.5">
                        Publish or hide website notice bar
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            ) : activeModule === 'admissions' ? (
              <div className="space-y-6">
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

                <div className="bg-white rounded-3xl shadow-md border border-slate-200 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-[#102B46] font-['Manrope'] flex items-center gap-2">
                      <Filter className="w-4 h-4 text-[#D9B76A]" />
                      <span>Search &amp; Filter Admission Applications</span>
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
                      <option value="complete">Complete &amp; Verified</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-4 bg-white rounded-3xl shadow-md border border-slate-200 p-4 space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <h4 className="text-sm font-extrabold text-[#102B46] font-['Manrope']">
                        Matching Applications ({filteredApps.length})
                      </h4>
                    </div>

                    {filteredApps.length === 0 ? (
                      <p className="text-xs text-slate-500 p-4 text-center">
                        No admission applications found.
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
                        Select an application from the queue to review details, verify physical
                        documents, or issue an admission decision.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : activeModule === 'staff' ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-5 bg-white rounded-3xl shadow-md border border-slate-200 p-6 space-y-5">
                  <div className="flex items-center gap-2 text-base font-extrabold text-[#102B46] font-['Manrope']">
                    <UserPlus className="w-5 h-5 text-[#D9B76A]" />
                    <span>Assign &amp; Revoke Staff Roles</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Provisioned staff may hold multiple institutional roles simultaneously (for
                    example, Teacher and Admission Officer). Staff members must sign into the
                    portal first so their verified account profile exists.
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-[#102B46] mb-1">
                        Staff Portal Email *
                      </label>
                      <input
                        type="email"
                        value={staffEmail}
                        onChange={(e) => setStaffEmail(e.target.value)}
                        placeholder="staff.member@example.com"
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
                          {isGeneralAdmin && (
                            <option value="general_admin">General Administrator</option>
                          )}
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

                    <div>
                      <label className="block text-xs font-bold text-[#102B46] mb-1">
                        Department
                      </label>
                      <input
                        type="text"
                        value={staffDepartment}
                        onChange={(e) => setStaffDepartment(e.target.value)}
                        placeholder="e.g. Admissions, Academics, Finance"
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                      />
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
                </div>

                <div className="lg:col-span-7 bg-white rounded-3xl shadow-md border border-slate-200 p-6 space-y-4">
                  <h4 className="text-sm font-extrabold text-[#102B46] font-['Manrope']">
                    Active Staff &amp; Institutional Responsibilities ({staffDirectory.length})
                  </h4>
                  {staffDirectory.length === 0 ? (
                    <p className="text-xs text-slate-500">No staff records found yet.</p>
                  ) : (
                    <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                      {staffDirectory.map((st, idx) => {
                        const prof = st.profiles as {
                          id?: string;
                          email?: string;
                          first_name?: string;
                          last_name?: string;
                        } | null;
                        const activeRoles = (
                          (st.staff_roles as Array<{
                            is_active?: boolean;
                            roles?: { code?: string; name?: string };
                          }>) ?? []
                        ).filter((r) => r.is_active);

                        return (
                          <div
                            key={(st.id as string) || idx}
                            className="bg-[#F5F3ED] rounded-2xl p-4 border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="font-bold text-sm text-[#102B46] font-['Manrope'] truncate">
                                {prof?.first_name} {prof?.last_name}
                              </div>
                              <div className="text-slate-600 truncate">{prof?.email || '—'}</div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {(st.job_title as string) || 'Staff'} •{' '}
                                {(st.employment_status as string) || 'active'}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {activeRoles.length > 0 ? (
                                activeRoles.map((ar) => {
                                  const rCode = ar.roles?.code || '';
                                  const isOwnerRole =
                                    rCode === 'general_admin' &&
                                    prof?.id === authorization.profileId;
                                  return (
                                    <span
                                      key={rCode}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[#102B46] font-bold text-[11px]"
                                    >
                                      <span>{ar.roles?.name || rCode}</span>
                                      {!isOwnerRole && prof?.email && (
                                        <button
                                          type="button"
                                          disabled={isActionBusy}
                                          onClick={() =>
                                            void handleAssignStaffRole(
                                              'revoke_role',
                                              prof.email,
                                              rCode
                                            )
                                          }
                                          className="text-red-600 hover:text-red-800 ml-1"
                                          title="Revoke role"
                                        >
                                          ×
                                        </button>
                                      )}
                                    </span>
                                  );
                                })
                              ) : (
                                <span className="text-slate-500">No active roles</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : activeModule === 'classes' ? (
              <div className="bg-white rounded-3xl shadow-md border border-slate-200 p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-[#102B46] font-['Manrope']">
                      School Sections &amp; Class Levels
                    </h3>
                    <p className="text-xs text-slate-600">
                      Live educational levels configured in PostgreSQL across Creche, Primary, and
                      Secondary.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {lookups?.sections.map((sec) => {
                    const secLevels =
                      lookups?.classLevels.filter((cl) => cl.school_section_id === sec.id) ?? [];
                    return (
                      <div
                        key={sec.id}
                        className="bg-[#F5F3ED] rounded-2xl p-4 border border-slate-200 space-y-2"
                      >
                        <div className="font-extrabold text-sm text-[#102B46] font-['Manrope']">
                          {sec.name}
                        </div>
                        <ul className="space-y-1 text-xs text-slate-700">
                          {secLevels.length === 0 ? (
                            <li className="text-slate-500">No class levels configured.</li>
                          ) : (
                            secLevels.map((lvl) => <li key={lvl.id}>• {lvl.name}</li>)
                          )}
                        </ul>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-500 bg-[#F5F3ED] rounded-xl p-3 border border-slate-200">
                  Subject allocations, class arms, and teacher class assignments will be managed
                  here as the Academics phase is activated.
                </p>
              </div>
            ) : activeModule === 'sessions' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-3xl shadow-md border border-slate-200 p-6 space-y-4">
                  <h3 className="text-base font-extrabold text-[#102B46] font-['Manrope']">
                    Configured Academic Sessions
                  </h3>
                  {!lookups || lookups.sessions.length === 0 ? (
                    <p className="text-xs text-slate-500">No academic sessions configured yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {lookups.sessions.map((ses) => (
                        <div
                          key={ses.id}
                          className="bg-[#F5F3ED] rounded-xl p-3.5 border border-slate-200 flex items-center justify-between text-xs"
                        >
                          <div>
                            <strong className="text-[#102B46] text-sm">{ses.name}</strong>
                            <div className="text-slate-500">
                              {ses.start_date} — {ses.end_date}
                            </div>
                          </div>
                          {ses.is_current && (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-[#15803D] border border-emerald-200 font-bold text-[11px]">
                              Active
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <form
                  onSubmit={(e) => void handleSaveAdmissionSettings(e)}
                  className="bg-white rounded-3xl shadow-md border border-slate-200 p-6 space-y-4"
                >
                  <h3 className="text-base font-extrabold text-[#102B46] font-['Manrope']">
                    Active Admission Session Window
                  </h3>
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
                  <button
                    type="submit"
                    disabled={isActionBusy}
                    className="px-5 py-2.5 rounded-xl bg-[#102B46] hover:bg-[#091C30] text-white font-bold text-xs sm:text-sm"
                  >
                    Save Session Settings
                  </button>
                </form>
              </div>
            ) : activeModule === 'finance' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <form
                  onSubmit={(e) => void handleSaveAdmissionSettings(e)}
                  className="bg-white rounded-3xl shadow-md border border-slate-200 p-6 space-y-4"
                >
                  <h3 className="text-base font-extrabold text-[#102B46] font-['Manrope']">
                    Official Admission Application Fee (NGN)
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Application fees are never hardcoded. Configure the official Nigerian Naira
                    admission fee here.
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-[#102B46] mb-1">
                      Admission Application Fee (NGN — leave blank if unset)
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
                    Save Fee Configuration
                  </button>
                </form>

                <div className="bg-white rounded-3xl shadow-md border border-slate-200 p-6 space-y-3">
                  <h3 className="text-base font-extrabold text-[#102B46] font-['Manrope']">
                    Tuition Invoicing &amp; Paystack Reconciliation
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Termly fee structures, student invoices, Paystack webhook verification, and
                    official Naira receipts will be activated in the Finance &amp; Payments phase.
                    Parent access to termly academic results remains locked until full required
                    school fees are verified paid.
                  </p>
                </div>
              </div>
            ) : activeModule === 'announcements' ? (
              <form
                onSubmit={(e) => void handleSaveAnnouncement(e)}
                className="bg-white rounded-3xl shadow-md border border-slate-200 p-6 space-y-5 max-w-3xl"
              >
                <div>
                  <h3 className="text-base font-extrabold text-[#102B46] font-['Manrope']">
                    Public Website Announcement Bar
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    When disabled or left blank, the top announcement banner stays hidden on the
                    public website. No hardcoded session notices are displayed without your
                    explicit configuration.
                  </p>
                </div>

                <label className="flex items-center gap-2.5 text-sm font-bold text-[#102B46] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={announceActive}
                    onChange={(e) => setAnnounceActive(e.target.checked)}
                    className="rounded border-slate-300 text-[#102B46]"
                  />
                  <span>Display Public Announcement Bar on Website</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#102B46] mb-1">
                      Badge Label
                    </label>
                    <input
                      type="text"
                      value={announceBadge}
                      onChange={(e) => setAnnounceBadge(e.target.value)}
                      placeholder="Notice"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#102B46] mb-1">
                      Button Label
                    </label>
                    <input
                      type="text"
                      value={announceCtaLabel}
                      onChange={(e) => setAnnounceCtaLabel(e.target.value)}
                      placeholder="Apply Now"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#102B46] mb-1">
                    Announcement Message
                  </label>
                  <textarea
                    rows={3}
                    value={announceMessage}
                    onChange={(e) => setAnnounceMessage(e.target.value)}
                    placeholder="Enter an official announcement for parents and prospective families..."
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#102B46] mb-1">
                    Destination Path
                  </label>
                  <select
                    value={announceCtaPath}
                    onChange={(e) => setAnnounceCtaPath(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm bg-white"
                  >
                    <option value="/apply">Online Admission Application (/apply)</option>
                    <option value="/admissions">Admissions Information (/admissions)</option>
                    <option value="/contact">Contact School (/contact)</option>
                    <option value="/portal">School Portal (/portal)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isActionBusy}
                  className="px-5 py-2.5 rounded-xl bg-[#102B46] hover:bg-[#091C30] text-white font-bold text-xs sm:text-sm"
                >
                  Save Public Announcement
                </button>
              </form>
            ) : activeModule === 'website' ? (
              <form
                onSubmit={(e) => void handleSaveWebsiteContact(e)}
                className="bg-white rounded-3xl shadow-md border border-slate-200 p-6 space-y-5 max-w-3xl"
              >
                <div>
                  <h3 className="text-base font-extrabold text-[#102B46] font-['Manrope']">
                    Verified Public Website Contact Details
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Only official contact details saved here appear in the website header, footer,
                    admissions page, and contact page. Leave blank to hide unverified fields.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#102B46] mb-1">
                      Official Campus Address
                    </label>
                    <input
                      type="text"
                      value={contactAddress}
                      onChange={(e) => setContactAddress(e.target.value)}
                      placeholder="Enter verified campus street address"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#102B46] mb-1">
                        Official Phone Number
                      </label>
                      <input
                        type="text"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="+234 ..."
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#102B46] mb-1">
                        Official Contact Email
                      </label>
                      <input
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="admissions@..."
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#102B46] mb-1">
                        Office Hours
                      </label>
                      <input
                        type="text"
                        value={contactHours}
                        onChange={(e) => setContactHours(e.target.value)}
                        placeholder="e.g. Monday - Friday: 7:30 AM - 4:00 PM"
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#102B46] mb-1">
                        WhatsApp Link (Optional)
                      </label>
                      <input
                        type="url"
                        value={contactWhatsapp}
                        onChange={(e) => setContactWhatsapp(e.target.value)}
                        placeholder="https://wa.me/..."
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isActionBusy}
                  className="px-5 py-2.5 rounded-xl bg-[#102B46] hover:bg-[#091C30] text-white font-bold text-xs sm:text-sm"
                >
                  Save Website Contact Details
                </button>
              </form>
            ) : activeModule === 'settings' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <form
                  onSubmit={(e) => void handleSaveAdmissionSettings(e)}
                  className="bg-white rounded-3xl shadow-md border border-slate-200 p-6 space-y-4"
                >
                  <h3 className="text-base font-extrabold text-[#102B46] font-['Manrope']">
                    Institutional Admission Configuration
                  </h3>
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
                      Current Admission Session Label
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
                      Admission Application Fee (NGN)
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
                  </div>
                  <button
                    type="submit"
                    disabled={isActionBusy}
                    className="px-5 py-2.5 rounded-xl bg-[#102B46] hover:bg-[#091C30] text-white font-bold text-xs sm:text-sm"
                  >
                    Save School Settings
                  </button>
                </form>

                {/* Restricted General Administrator Diagnostics */}
                {isGeneralAdmin && (
                  <div className="bg-white rounded-3xl shadow-md border border-slate-200 p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-[#15803D]" />
                      <h3 className="text-base font-extrabold text-[#102B46] font-['Manrope']">
                        System &amp; Authorization Diagnostics (Admin Only)
                      </h3>
                    </div>
                    <div className="space-y-2.5 text-xs text-slate-700">
                      <div className="bg-[#F5F3ED] rounded-xl p-3 border border-slate-200 flex items-center justify-between">
                        <span className="font-semibold">Identity Provider (Clerk)</span>
                        <span className="font-bold text-[#15803D]">Verified Session</span>
                      </div>
                      <div className="bg-[#F5F3ED] rounded-xl p-3 border border-slate-200 flex items-center justify-between">
                        <span className="font-semibold">Database Configuration</span>
                        <span
                          className={`font-bold ${
                            supabaseStatus.configured ? 'text-[#15803D]' : 'text-amber-700'
                          }`}
                        >
                          {supabaseStatus.configured ? 'Configured' : 'Pending'}
                        </span>
                      </div>
                      <div className="bg-[#F5F3ED] rounded-xl p-3 border border-slate-200 flex items-center justify-between">
                        <span className="font-semibold">Verified Database Role(s)</span>
                        <span className="font-mono font-bold text-[#102B46]">
                          {authorization.allRoles.join(', ') || 'None'}
                        </span>
                      </div>
                      {authorization.diagnosticError && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-900">
                          <strong>Diagnostic Note:</strong> {authorization.diagnosticError}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : activeModule === 'audit' ? (
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
            ) : (
              /* Clean unimplemented future-phase module shell (Students, Parents, Attendance, Results) */
              <div className="bg-white rounded-3xl shadow-md border border-slate-200 p-8 sm:p-12 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-[#102B46] text-[#D9B76A] flex items-center justify-center mx-auto">
                  <Building2 className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-extrabold text-[#102B46] font-['Manrope']">
                  {activeNavLabel} Module Ready for Activation
                </h3>
                <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                  Database tables and strict row-level security policies are prepared for{' '}
                  <strong>{activeNavLabel}</strong>. Live operational workflows for this module
                  will be enabled in its dedicated implementation phase without placeholder data.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <OfficialAdmissionPrintSheet
        application={printApp}
        passportImageUrl={printPassportUrl}
      />
    </div>
  );
};
