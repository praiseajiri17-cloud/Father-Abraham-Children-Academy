import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Edit3,
  FileCheck2,
  FileLock2,
  Printer,
  ShieldCheck,
} from 'lucide-react';
import {
  AdmissionApplicationExpanded,
  AdmissionSettingsConfig,
  AdmissionStatusHistoryItem,
  PHYSICAL_DOCUMENT_CHECKLIST_ITEMS,
} from '../../types/admissions';
import {
  AdmissionWorkflowStepper,
  ApplicationStatusBadge,
  PaymentStatusBadge,
  PhysicalDocsBadge,
} from './AdmissionStatusBadge';
import { formatNairaFromKobo } from '../../services/admissionsService';

interface ParentAdmissionDetailDrawerProps {
  application: AdmissionApplicationExpanded;
  admissionSettings: AdmissionSettingsConfig | null;
  history: AdmissionStatusHistoryItem[];
  onEditApplication: (app: AdmissionApplicationExpanded) => void;
  onDownloadOfficialPdf: (app: AdmissionApplicationExpanded) => void;
  onPrintOfficialForm: (app: AdmissionApplicationExpanded) => void;
}

export const ParentAdmissionDetailDrawer: React.FC<ParentAdmissionDetailDrawerProps> = ({
  application,
  admissionSettings,
  history,
  onEditApplication,
  onDownloadOfficialPdf,
  onPrintOfficialForm,
}) => {
  const isPaid = application.payment_status === 'paid';
  const canEditOrResubmit =
    application.application_status === 'draft' ||
    application.application_status === 'correction_requested';

  const feeKobo =
    application.application_fee_kobo ?? admissionSettings?.application_fee_kobo ?? null;
  const formattedFee = formatNairaFromKobo(feeKobo);

  const receivedSet = new Set(application.physical_documents_received_list ?? []);
  const missingList = application.physical_documents_missing_list ?? [];

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-[#102B46] text-white p-5 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-mono text-xs font-bold bg-white/10 text-[#D9B76A] px-2.5 py-0.5 rounded-lg">
              {application.application_reference}
            </span>
            <span className="text-xs text-slate-300">
              {application.academic_sessions?.name || 'Academic Session'}
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold font-['Manrope']">
            {application.child_first_name} {application.child_middle_name || ''}{' '}
            {application.child_last_name}
          </h3>
          <p className="text-xs sm:text-sm text-slate-200 mt-0.5">
            {application.school_sections?.name || 'Section'} •{' '}
            {application.class_levels?.name || 'Class Level'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEditOrResubmit && (
            <button
              type="button"
              onClick={() => onEditApplication(application)}
              className="inline-flex items-center gap-2 bg-[#D9B76A] hover:bg-[#c9a555] text-[#091C30] px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              <span>
                {application.application_status === 'correction_requested'
                  ? 'Make Requested Corrections'
                  : 'Resume Draft'}
              </span>
            </button>
          )}
        </div>
      </div>

      <div className="p-5 sm:p-8 space-y-7">
        {/* Progress Stepper */}
        <AdmissionWorkflowStepper
          applicationStatus={application.application_status}
          paymentStatus={application.payment_status}
          physicalDocumentsStatus={application.physical_documents_status}
        />

        {/* Correction Requested Alert */}
        {application.application_status === 'correction_requested' && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-700 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-orange-950 space-y-1">
              <div className="font-bold">Action Required: Corrections Requested by Admissions</div>
              <p>{application.correction_notes || 'Please review and update your application.'}</p>
            </div>
          </div>
        )}

        {/* Three Separate Status Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#F5F3ED] rounded-2xl p-4 border border-slate-200 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              1. Application Review Status
            </div>
            <ApplicationStatusBadge status={application.application_status} />
            <p className="text-xs text-slate-600 leading-relaxed">
              {application.submitted_at
                ? `Submitted ${new Date(application.submitted_at).toLocaleDateString('en-NG')}`
                : 'Not yet submitted'}
            </p>
          </div>

          <div className="bg-[#F5F3ED] rounded-2xl p-4 border border-slate-200 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              2. Application Fee Payment
            </div>
            <PaymentStatusBadge status={application.payment_status} />
            <p className="text-xs text-slate-600 leading-relaxed">
              {formattedFee
                ? `Configured Application Fee: ${formattedFee}`
                : 'Application fee pending General Administrator configuration'}
            </p>
          </div>

          <div className="bg-[#F5F3ED] rounded-2xl p-4 border border-slate-200 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              3. Physical Document Submission
            </div>
            <PhysicalDocsBadge status={application.physical_documents_status} />
            <p className="text-xs text-slate-600 leading-relaxed">
              {application.physical_documents_received_at
                ? `Logged at school ${new Date(
                    application.physical_documents_received_at
                  ).toLocaleDateString('en-NG')}`
                : 'Submit printed A4 form & required documents at the Admissions Office.'}
            </p>
          </div>
        </div>

        {/* Payment Verification & Official A4 PDF Download / Print Card */}
        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-extrabold text-[#102B46] font-['Manrope']">
              <CreditCard className="w-4 h-4 text-[#D9B76A]" />
              <span>Admission Application Fee & Official A4 Form PDF</span>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              NGN • Separate From School Fees
            </span>
          </div>

          <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-2 flex-1">
              {isPaid ? (
                <div className="flex items-start gap-2.5 text-emerald-800">
                  <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-[#15803D]" />
                  <div className="text-xs sm:text-sm">
                    <strong>Payment Verified:</strong> Your official A4 Admission Application
                    Form is unlocked. Download the PDF or print it, affix a passport photograph,
                    sign the declaration, and submit it physically at the school.
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 text-slate-700">
                  <FileLock2 className="w-5 h-5 shrink-0 mt-0.5 text-amber-700" />
                  <div className="text-xs sm:text-sm space-y-1">
                    <div>
                      <strong>Official Paid A4 Form Locked Until Backend Verification:</strong>{' '}
                      In accordance with school security policy, official admission form PDF
                      downloads only activate after the backend verifies the Paystack admission
                      fee payment.
                    </div>
                    <p className="text-xs text-slate-500">
                      {application.application_status === 'draft'
                        ? 'Complete and submit this draft application first, then proceed when Phase 5 Paystack checkout is enabled.'
                        : 'Live Paystack payment checkout & webhook verification is scheduled for Phase 5. Payments cannot be confirmed from browser state.'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                disabled={!isPaid}
                onClick={() => onDownloadOfficialPdf(application)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-[#102B46] hover:bg-[#091C30] text-white disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download Official A4 PDF</span>
              </button>

              <button
                type="button"
                disabled={!isPaid}
                onClick={() => onPrintOfficialForm(application)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm border border-[#102B46] text-[#102B46] hover:bg-[#F5F3ED] disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Print A4 Form</span>
              </button>
            </div>
          </div>
        </div>

        {/* Physical Document Verification Checklist Progress */}
        <div className="rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h4 className="text-sm font-extrabold text-[#102B46] font-['Manrope'] flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-[#D9B76A]" />
              <span>Physical Document Submission Checklist</span>
            </h4>
            <PhysicalDocsBadge status={application.physical_documents_status} />
          </div>

          {application.physical_documents_notes && (
            <div className="bg-[#F5F3ED] border border-slate-200 rounded-xl p-3 text-xs text-slate-700">
              <strong>Admissions Desk Remarks:</strong> {application.physical_documents_notes}
            </div>
          )}

          {missingList.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs text-orange-900">
              <strong>Missing / Outstanding Items:</strong> {missingList.join(', ')}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {PHYSICAL_DOCUMENT_CHECKLIST_ITEMS.map((item) => {
              const isReceived = receivedSet.has(item);
              return (
                <div
                  key={item}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs ${
                    isReceived
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  {isReceived ? (
                    <CheckCircle2 className="w-4 h-4 text-[#15803D] shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  <span>{item}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Parent-Visible Application Timeline */}
        <div className="rounded-2xl border border-slate-200 p-5 space-y-4">
          <h4 className="text-sm font-extrabold text-[#102B46] font-['Manrope']">
            Application Status History
          </h4>
          {history.length === 0 ? (
            <p className="text-xs text-slate-500">No history events recorded yet.</p>
          ) : (
            <div className="space-y-2.5">
              {history
                .filter((item) => !item.is_internal)
                .map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 bg-[#F5F3ED] rounded-xl px-3.5 py-2.5 border border-slate-200 text-xs"
                  >
                    <div>
                      <span className="font-bold text-[#102B46] uppercase">
                        {item.event_type.replace(/_/g, ' ')}
                      </span>
                      {item.to_status && (
                        <span className="text-slate-600"> → {item.to_status.replace(/_/g, ' ')}</span>
                      )}
                      {item.notes && (
                        <p className="text-slate-700 mt-0.5">{item.notes}</p>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 shrink-0">
                      {new Date(item.created_at).toLocaleString('en-NG')}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
