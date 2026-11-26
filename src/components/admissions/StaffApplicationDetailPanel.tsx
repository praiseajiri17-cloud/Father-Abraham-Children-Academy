import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileText,
  HeartPulse,
  History,
  Loader2,
  Printer,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import {
  AdmissionApplicationExpanded,
  AdmissionStatusHistoryItem,
  PHYSICAL_DOCUMENT_CHECKLIST_ITEMS,
} from '../../types/admissions';
import {
  DbAuditLog,
  PhysicalDocumentsStatus,
} from '../../types/database';
import {
  ApplicationStatusBadge,
  PaymentStatusBadge,
  PhysicalDocsBadge,
} from './AdmissionStatusBadge';

interface StaffApplicationDetailPanelProps {
  application: AdmissionApplicationExpanded;
  history: AdmissionStatusHistoryItem[];
  auditLogs: DbAuditLog[];
  canOverride: boolean;
  defaultStaffName: string;
  isBusy: boolean;
  onUpdatePhysicalDocs: (params: {
    applicationId: string;
    physicalDocumentsStatus: PhysicalDocumentsStatus;
    receivedByName: string;
    receivedAt: string;
    receivedList: string[];
    missingList: string[];
    notes: string;
  }) => Promise<void>;
  onUpdateReviewDecision: (params: {
    applicationId: string;
    applicationStatus: 'under_review' | 'correction_requested' | 'approved' | 'rejected';
    reviewerNotes: string;
    correctionNotes: string;
  }) => Promise<void>;
  onAdminOverrideDecision: (params: {
    applicationId: string;
    applicationStatus: 'submitted' | 'under_review' | 'correction_requested' | 'approved' | 'rejected';
    overrideReason: string;
    reviewerNotes?: string;
  }) => Promise<void>;
  onDownloadOfficialPdf: (app: AdmissionApplicationExpanded) => void;
  onPrintOfficialForm: (app: AdmissionApplicationExpanded) => void;
}

export const StaffApplicationDetailPanel: React.FC<StaffApplicationDetailPanelProps> = ({
  application,
  history,
  auditLogs,
  canOverride,
  defaultStaffName,
  isBusy,
  onUpdatePhysicalDocs,
  onUpdateReviewDecision,
  onAdminOverrideDecision,
  onDownloadOfficialPdf,
  onPrintOfficialForm,
}) => {
  const [docStatus, setDocStatus] = useState<PhysicalDocumentsStatus>(
    application.physical_documents_status
  );
  const [receivedByName, setReceivedByName] = useState(
    application.physical_documents_received_by_name || defaultStaffName
  );
  const [receivedAt, setReceivedAt] = useState(
    application.physical_documents_received_at
      ? application.physical_documents_received_at.slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  );
  const [receivedList, setReceivedList] = useState<string[]>(
    application.physical_documents_received_list ?? []
  );
  const [docNotes, setDocNotes] = useState(application.physical_documents_notes ?? '');

  const [reviewerNotes, setReviewerNotes] = useState(application.reviewer_notes ?? '');
  const [correctionNotes, setCorrectionNotes] = useState(application.correction_notes ?? '');

  const [overrideTarget, setOverrideTarget] = useState<
    'submitted' | 'under_review' | 'correction_requested' | 'approved' | 'rejected'
  >('under_review');
  const [overrideReason, setOverrideReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setDocStatus(application.physical_documents_status);
    setReceivedByName(application.physical_documents_received_by_name || defaultStaffName);
    setReceivedAt(
      application.physical_documents_received_at
        ? application.physical_documents_received_at.slice(0, 10)
        : new Date().toISOString().slice(0, 10)
    );
    setReceivedList(application.physical_documents_received_list ?? []);
    setDocNotes(application.physical_documents_notes ?? '');
    setReviewerNotes(application.reviewer_notes ?? '');
    setCorrectionNotes(application.correction_notes ?? '');
    setOverrideReason('');
    setActionError(null);
  }, [application, defaultStaffName]);

  const isFinalized =
    application.application_status === 'approved' ||
    application.application_status === 'rejected';
  const isPaid = application.payment_status === 'paid';
  const med = application.medical_details;

  const toggleReceivedDoc = (item: string) => {
    setReceivedList((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  };

  const missingList = PHYSICAL_DOCUMENT_CHECKLIST_ITEMS.filter(
    (item) => !receivedList.includes(item)
  );

  const handleSavePhysicalDocs = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      await onUpdatePhysicalDocs({
        applicationId: application.id,
        physicalDocumentsStatus: docStatus,
        receivedByName,
        receivedAt: receivedAt ? new Date(`${receivedAt}T12:00:00Z`).toISOString() : '',
        receivedList,
        missingList: docStatus === 'complete' ? [] : missingList,
        notes: docNotes,
      });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update physical documents.');
    }
  };

  const handleDecision = async (
    targetStatus: 'under_review' | 'correction_requested' | 'approved' | 'rejected'
  ) => {
    setActionError(null);
    if (targetStatus === 'correction_requested' && !correctionNotes.trim()) {
      setActionError('Please enter specific correction instructions for the parent.');
      return;
    }
    try {
      await onUpdateReviewDecision({
        applicationId: application.id,
        applicationStatus: targetStatus,
        reviewerNotes,
        correctionNotes,
      });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update review status.');
    }
  };

  const handleOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    if (!overrideReason.trim()) {
      setActionError('An audit reason is required to override or reopen a decision.');
      return;
    }
    try {
      await onAdminOverrideDecision({
        applicationId: application.id,
        applicationStatus: overrideTarget,
        overrideReason,
        reviewerNotes,
      });
      setOverrideReason('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Override failed.');
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-[#091C30] text-white p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="font-mono text-xs font-bold bg-[#D9B76A] text-[#091C30] px-2.5 py-0.5 rounded">
              {application.application_reference}
            </span>
            <ApplicationStatusBadge status={application.application_status} />
            <PaymentStatusBadge status={application.payment_status} />
            <PhysicalDocsBadge status={application.physical_documents_status} />
          </div>
          <h3 className="text-xl font-extrabold font-['Manrope']">
            {application.child_first_name} {application.child_middle_name || ''}{' '}
            {application.child_last_name}
          </h3>
          <p className="text-xs text-slate-300 mt-0.5">
            {application.school_sections?.name} • {application.class_levels?.name} •{' '}
            {application.academic_sessions?.name}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!isPaid}
            onClick={() => onDownloadOfficialPdf(application)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
            title={isPaid ? 'Download Official Paid A4 Form' : 'Locked until payment is verified'}
          >
            <Download className="w-3.5 h-3.5 text-[#D9B76A]" />
            <span>Official PDF</span>
          </button>
          <button
            type="button"
            disabled={!isPaid}
            onClick={() => onPrintOfficialForm(application)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Printer className="w-3.5 h-3.5 text-[#D9B76A]" />
            <span>Print A4</span>
          </button>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {actionError && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-3.5 text-xs sm:text-sm flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Applicant & Parent Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-[#F5F3ED] rounded-2xl p-4 border border-slate-200 text-xs space-y-2">
            <h4 className="font-extrabold text-[#102B46] text-sm font-['Manrope'] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#D9B76A]" />
              <span>Child & Family Details</span>
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-500 block">DOB / Gender</span>
                <strong>
                  {application.child_date_of_birth} ({application.child_gender})
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Origin</span>
                <strong>
                  {[application.child_nationality, application.child_state_of_origin, application.child_lga]
                    .filter(Boolean)
                    .join(' • ') || '—'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Parent / Guardian</span>
                <strong>
                  {application.parent_full_name || '—'} ({application.parent_relationship || '—'})
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Contact</span>
                <strong>
                  {application.parent_phone || '—'} • {application.parent_email || '—'}
                </strong>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 block">Address & Emergency Contact</span>
                <span>
                  {application.residential_address || '—'} | Emergency:{' '}
                  {application.emergency_contact_name || '—'} (
                  {application.emergency_contact_phone || '—'})
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 block">Previous School</span>
                <span>
                  {application.is_first_time_schooling
                    ? 'First-time entrant'
                    : `${application.previous_school_name || application.previous_school || '—'} (${
                        application.previous_class || 'N/A'
                      })`}
                </span>
              </div>
            </div>
          </div>

          {/* Restricted Medical Details */}
          <div className="bg-rose-50/50 rounded-2xl p-4 border border-rose-200 text-xs space-y-2">
            <h4 className="font-extrabold text-[#102B46] text-sm font-['Manrope'] flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-rose-700" />
              <span>Restricted Medical & Learning Notes</span>
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-500 block">Blood Group / Genotype</span>
                <strong>
                  {[med?.blood_group, med?.genotype].filter(Boolean).join(' / ') || 'Not stated'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Allergies</span>
                <strong>{med?.allergies || 'None stated'}</strong>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 block">Conditions / Dietary / Learning Support</span>
                <span>
                  {[
                    med?.chronic_conditions,
                    med?.dietary_requirements,
                    med?.special_learning_needs,
                    med?.emergency_medical_notes,
                  ]
                    .filter(Boolean)
                    .join(' | ') || 'None stated'}
                </span>
              </div>
              {application.additional_details && (
                <div className="col-span-2">
                  <span className="text-slate-500 block">Parent Additional Notes</span>
                  <span>{application.additional_details}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Physical Document Receipt Tracking Form */}
        <form
          onSubmit={(e) => void handleSavePhysicalDocs(e)}
          className="rounded-2xl border border-slate-200 p-5 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h4 className="text-sm font-extrabold text-[#102B46] font-['Manrope'] flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-[#D9B76A]" />
              <span>Record Physical Document Submission & Verification</span>
            </h4>
            <PhysicalDocsBadge status={docStatus} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#102B46] mb-1">
                Physical Documents Status
              </label>
              <select
                value={docStatus}
                onChange={(e) => setDocStatus(e.target.value as PhysicalDocumentsStatus)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm bg-white"
              >
                <option value="not_submitted">Not Submitted</option>
                <option value="received">Received at School</option>
                <option value="under_review">Under Document Review</option>
                <option value="incomplete">Incomplete (Missing Docs)</option>
                <option value="complete">Complete & Verified</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#102B46] mb-1">
                Staff Receiver Name
              </label>
              <input
                type="text"
                value={receivedByName}
                onChange={(e) => setReceivedByName(e.target.value)}
                placeholder="Name of staff receiving form"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#102B46] mb-1">
                Date Received
              </label>
              <input
                type="date"
                value={receivedAt}
                onChange={(e) => setReceivedAt(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#102B46] mb-2">
              Tick Received Physical Documents (unticked items are flagged missing)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PHYSICAL_DOCUMENT_CHECKLIST_ITEMS.map((item) => (
                <label
                  key={item}
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-[#F5F3ED] text-xs cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={receivedList.includes(item)}
                    onChange={() => toggleReceivedDoc(item)}
                    className="rounded border-slate-300 text-[#102B46]"
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#102B46] mb-1">
              Physical Document Verification Notes (visible to parent)
            </label>
            <textarea
              rows={2}
              value={docNotes}
              onChange={(e) => setDocNotes(e.target.value)}
              placeholder="e.g. Received signed form and birth certificate; bring immunization card."
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={isBusy}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#102B46] hover:bg-[#091C30] text-white font-bold text-xs sm:text-sm disabled:opacity-50"
          >
            {isBusy && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Save Physical Document Record</span>
          </button>
        </form>

        {/* Admission Officer Review & Decision Controls */}
        <div className="rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-extrabold text-[#102B46] font-['Manrope']">
              Admission Review & Decision
            </h4>
            {isFinalized && !canOverride && (
              <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                Finalized (General Admin override required to reopen)
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#102B46] mb-1">
                Internal Reviewer Remarks (Staff Only)
              </label>
              <textarea
                rows={2}
                value={reviewerNotes}
                onChange={(e) => setReviewerNotes(e.target.value)}
                placeholder="Internal assessment or interview notes..."
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#102B46] mb-1">
                Parent-Visible Correction / Decision Note
              </label>
              <textarea
                rows={2}
                value={correctionNotes}
                onChange={(e) => setCorrectionNotes(e.target.value)}
                placeholder="Required if requesting corrections from the parent..."
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={isBusy || (isFinalized && !canOverride)}
              onClick={() => void handleDecision('under_review')}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs disabled:opacity-40"
            >
              Mark Under Review
            </button>
            <button
              type="button"
              disabled={isBusy || (isFinalized && !canOverride)}
              onClick={() => void handleDecision('correction_requested')}
              className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs disabled:opacity-40"
            >
              Request Corrections
            </button>
            <button
              type="button"
              disabled={isBusy || (isFinalized && !canOverride)}
              onClick={() => void handleDecision('approved')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#15803D] hover:bg-emerald-800 text-white font-bold text-xs disabled:opacity-40"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Approve Application</span>
            </button>
            <button
              type="button"
              disabled={isBusy || (isFinalized && !canOverride)}
              onClick={() => void handleDecision('rejected')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs disabled:opacity-40"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Reject Application</span>
            </button>
          </div>
        </div>

        {/* General Administrator Override / Reopen Panel */}
        {canOverride && (
          <form
            onSubmit={(e) => void handleOverride(e)}
            className="rounded-2xl border-2 border-[#D9B76A] bg-[#F5F3ED] p-5 space-y-3"
          >
            <div className="flex items-center gap-2 text-sm font-extrabold text-[#102B46] font-['Manrope']">
              <ShieldAlert className="w-4 h-4 text-[#102B46]" />
              <span>General Administrator Decision Override / Reopen Control</span>
            </div>
            <p className="text-xs text-slate-600">
              Allows reopening a finalized decision or overriding status with a mandatory reason
              recorded in the immutable audit log.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                value={overrideTarget}
                onChange={(e) =>
                  setOverrideTarget(
                    e.target.value as
                      | 'submitted'
                      | 'under_review'
                      | 'correction_requested'
                      | 'approved'
                      | 'rejected'
                  )
                }
                className="rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white"
              >
                <option value="under_review">Reopen to Under Review</option>
                <option value="submitted">Reopen to Submitted</option>
                <option value="correction_requested">Reopen & Request Corrections</option>
                <option value="approved">Override to Approved</option>
                <option value="rejected">Override to Rejected</option>
              </select>
              <input
                type="text"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Mandatory audit reason for override/reopen"
                className="sm:col-span-2 rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white"
              />
            </div>
            <button
              type="submit"
              disabled={isBusy}
              className="px-4 py-2 rounded-xl bg-[#102B46] hover:bg-[#091C30] text-white font-bold text-xs"
            >
              Execute Audited Override / Reopen
            </button>
          </form>
        )}

        {/* Application History & Immutable Audit Trail */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
            <h5 className="text-xs font-extrabold uppercase tracking-wider text-[#102B46] flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-[#D9B76A]" />
              <span>Application History (Including Internal Notes)</span>
            </h5>
            {history.length === 0 ? (
              <p className="text-xs text-slate-500">No history entries yet.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {history.map((h) => (
                  <div
                    key={h.id}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[#102B46] uppercase">
                        {h.event_type.replace(/_/g, ' ')}
                        {h.is_internal ? ' (Internal)' : ''}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(h.created_at).toLocaleString('en-NG')}
                      </span>
                    </div>
                    {h.notes && <p className="text-slate-600 mt-1">{h.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
            <h5 className="text-xs font-extrabold uppercase tracking-wider text-[#102B46] flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-[#D9B76A]" />
              <span>Immutable Audit Logs</span>
            </h5>
            {auditLogs.length === 0 ? (
              <p className="text-xs text-slate-500">
                No audit log records visible for your role or application yet.
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <code className="font-mono font-bold text-[#102B46]">{log.action}</code>
                      <span className="text-[10px] text-slate-500">
                        {new Date(log.created_at).toLocaleString('en-NG')}
                      </span>
                    </div>
                    {log.new_values && (
                      <p className="text-[11px] text-slate-600 mt-1 truncate">
                        {JSON.stringify(log.new_values)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
