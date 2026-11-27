import React, { useEffect, useState } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Edit3,
  ExternalLink,
  FileCheck2,
  FileLock2,
  FileText,
  Loader2,
  Printer,
  ShieldCheck,
} from 'lucide-react';
import {
  AdmissionApplicationExpanded,
  AdmissionSettingsConfig,
  AdmissionStatusHistoryItem,
  PHYSICAL_DOCUMENT_CHECKLIST_ITEMS,
} from '../../types/admissions';
import { AdmissionDocumentType, DbAdmissionDocument } from '../../types/database';
import {
  AdmissionWorkflowStepper,
  ApplicationStatusBadge,
  PaymentStatusBadge,
  PhysicalDocsBadge,
} from './AdmissionStatusBadge';
import {
  createAdmissionDocumentSignedUrl,
  fetchApplicationDocuments,
  formatNairaFromKobo,
  initializeApplicationFeeCheckout,
} from '../../services/admissionsService';

interface ParentAdmissionDetailDrawerProps {
  supabase: SupabaseClient | null;
  getClerkToken: () => Promise<string | null>;
  application: AdmissionApplicationExpanded;
  admissionSettings: AdmissionSettingsConfig | null;
  history: AdmissionStatusHistoryItem[];
  onEditApplication: (app: AdmissionApplicationExpanded) => void;
  onDownloadOfficialPdf: (app: AdmissionApplicationExpanded, passportUrl?: string | null) => void;
  onPrintOfficialForm: (app: AdmissionApplicationExpanded, passportUrl?: string | null) => void;
}

const DOC_LABELS: Record<AdmissionDocumentType, string> = {
  passport_photo: 'Passport Photograph',
  birth_certificate: 'Birth Certificate / Age Declaration',
  previous_report_card: 'Previous School Report Card',
  transfer_certificate: 'Transfer Certificate',
  medical_report: 'Immunization / Medical Record',
  other: 'Supporting Document',
};

export const ParentAdmissionDetailDrawer: React.FC<ParentAdmissionDetailDrawerProps> = ({
  supabase,
  getClerkToken,
  application,
  admissionSettings,
  history,
  onEditApplication,
  onDownloadOfficialPdf,
  onPrintOfficialForm,
}) => {
  const [documents, setDocuments] = useState<DbAdmissionDocument[]>([]);
  const [passportUrl, setPassportUrl] = useState<string | null>(null);
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);

  useEffect(() => {
    setCheckoutNotice(null);
    const loadDocs = async () => {
      if (!supabase) return;
      try {
        const docs = await fetchApplicationDocuments(supabase, application.id);
        setDocuments(docs);

        const passportDoc = docs.find((d) => d.document_type === 'passport_photo');
        const passportPath = passportDoc?.storage_path || application.passport_photo_path;
        if (passportPath) {
          const url = await createAdmissionDocumentSignedUrl(supabase, passportPath, 600);
          setPassportUrl(url);
        } else {
          setPassportUrl(null);
        }

        const urls: Record<string, string> = {};
        await Promise.all(
          docs.map(async (doc) => {
            const url = await createAdmissionDocumentSignedUrl(supabase, doc.storage_path, 600);
            if (url) urls[doc.id] = url;
          })
        );
        setDocUrls(urls);
      } catch {
        setDocuments([]);
        setPassportUrl(null);
      }
    };
    void loadDocs();
  }, [supabase, application.id, application.passport_photo_path]);

  const isPaid = application.payment_status === 'paid';
  const isDraft = application.application_status === 'draft';
  const canEditOrResubmit =
    application.application_status === 'draft' ||
    application.application_status === 'correction_requested';

  const feeKobo =
    application.application_fee_kobo ?? admissionSettings?.application_fee_kobo ?? null;
  const formattedFee = formatNairaFromKobo(feeKobo);

  const receivedSet = new Set(application.physical_documents_received_list ?? []);
  const missingList = application.physical_documents_missing_list ?? [];

  const handlePayCheckout = async () => {
    setCheckoutLoading(true);
    setCheckoutNotice(null);
    try {
      const token = await getClerkToken();
      const res = await initializeApplicationFeeCheckout(
        token,
        application.id,
        `${window.location.origin}/portal/parent/payments`
      );
      if (res.ready && res.authorizationUrl.startsWith('https://')) {
        window.location.assign(res.authorizationUrl);
        return;
      }
      setCheckoutNotice(res.ready ? 'Invalid checkout URL returned.' : res.reason);
    } catch (err) {
      setCheckoutNotice(
        err instanceof Error ? err.message : 'Unable to start Paystack checkout right now.'
      );
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-[#102B46] text-white p-5 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          {passportUrl ? (
            <img
              src={passportUrl}
              alt={`${application.child_first_name} passport`}
              className="w-16 h-20 rounded-xl object-cover border-2 border-[#D9B76A] shrink-0 bg-white"
            />
          ) : (
            <div className="w-16 h-20 rounded-xl bg-white/10 border border-[#D9B76A]/40 flex items-center justify-center shrink-0">
              <Camera className="w-5 h-5 text-[#D9B76A]" />
            </div>
          )}

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold bg-white/10 text-[#D9B76A] px-2.5 py-0.5 rounded-lg tabular-nums">
                {application.application_reference}
              </span>
              <span className="text-xs text-slate-300">
                {application.academic_sessions?.name || 'Academic Session'}
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold font-['Manrope'] truncate">
              {application.child_first_name} {application.child_middle_name || ''}{' '}
              {application.child_last_name}
            </h3>
            <p className="text-xs sm:text-sm text-slate-200 mt-0.5">
              {application.school_sections?.name || 'Section'} •{' '}
              {application.class_levels?.name || 'Class Level'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {canEditOrResubmit && (
            <button
              type="button"
              onClick={() => onEditApplication(application)}
              className="inline-flex items-center gap-2 bg-[#D9B76A] hover:bg-[#c9a555] text-[#091C30] px-4 min-h-[44px] rounded-xl font-bold text-xs sm:text-sm transition-colors"
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
            <p className="text-xs text-slate-600 leading-relaxed tabular-nums">
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
            <p className="text-xs text-slate-600 leading-relaxed tabular-nums">
              {formattedFee
                ? `Application Fee: ${formattedFee}`
                : 'Application fee pending General Administrator configuration'}
            </p>
          </div>

          <div className="bg-[#F5F3ED] rounded-2xl p-4 border border-slate-200 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              3. Physical Document Submission
            </div>
            <PhysicalDocsBadge status={application.physical_documents_status} />
            <p className="text-xs text-slate-600 leading-relaxed tabular-nums">
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
          <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-extrabold text-[#102B46] font-['Manrope']">
              <CreditCard className="w-4 h-4 text-[#D9B76A]" />
              <span>Admission Application Fee & Official A4 Form PDF</span>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              NGN • Separate From Termly School Fees
            </span>
          </div>

          <div className="p-5 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div className="space-y-2 flex-1">
                {isPaid ? (
                  <div className="flex items-start gap-2.5 text-emerald-800">
                    <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-[#15803D]" />
                    <div className="text-xs sm:text-sm">
                      <strong>Payment Verified:</strong> Your official A4 Admission Application
                      Form is unlocked. Download the PDF or print it, confirm your passport
                      photograph, sign the declaration, and submit it physically at the school.
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5 text-slate-700">
                    <FileLock2 className="w-5 h-5 shrink-0 mt-0.5 text-amber-700" />
                    <div className="text-xs sm:text-sm space-y-1">
                      <div>
                        <strong>Official A4 Form Unlocks After Payment Verification:</strong>{' '}
                        {isDraft
                          ? 'Submit your completed draft application first, then proceed to Paystack application fee checkout.'
                          : 'Complete the Paystack application fee payment to unlock your official printable A4 admission form.'}
                      </div>
                      <p className="text-xs text-slate-500">
                        Live Paystack checkout goes active in Phase 5 once the school connects its
                        live Paystack merchant keys. Payment cannot be bypassed in the browser.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                {!isPaid && !isDraft && (
                  <button
                    type="button"
                    disabled={checkoutLoading}
                    onClick={() => void handlePayCheckout()}
                    className="inline-flex items-center gap-2 px-4 min-h-[44px] rounded-xl font-bold text-xs sm:text-sm bg-[#D9B76A] hover:bg-[#c8a556] text-[#091C30] disabled:opacity-50 transition-colors"
                  >
                    {checkoutLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CreditCard className="w-4 h-4" />
                    )}
                    <span>
                      {formattedFee ? `Pay Application Fee (${formattedFee})` : 'Proceed to Payment'}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={!isPaid}
                  onClick={() => onDownloadOfficialPdf(application, passportUrl)}
                  className="inline-flex items-center gap-2 px-4 min-h-[44px] rounded-xl font-bold text-xs sm:text-sm bg-[#102B46] hover:bg-[#091C30] text-white disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Official A4 PDF</span>
                </button>

                <button
                  type="button"
                  disabled={!isPaid}
                  onClick={() => onPrintOfficialForm(application, passportUrl)}
                  className="inline-flex items-center gap-2 px-4 min-h-[44px] rounded-xl font-bold text-xs sm:text-sm border border-[#102B46] text-[#102B46] hover:bg-[#F5F3ED] disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print A4 Form</span>
                </button>
              </div>
            </div>

            {checkoutNotice && (
              <div className="bg-[#F5F3ED] border border-[#D9B76A] rounded-xl p-3.5 text-xs sm:text-sm text-[#102B46]">
                <strong>Paystack Payment Status:</strong> {checkoutNotice}
              </div>
            )}
          </div>
        </div>

        {/* Uploaded Digital Files + Previous School Reason */}
        {(documents.length > 0 || application.reason_for_leaving) && (
          <div className="rounded-2xl border border-slate-200 p-5 space-y-4">
            <h4 className="text-sm font-extrabold text-[#102B46] font-['Manrope'] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#D9B76A]" />
              <span>Submitted Application Files &amp; Background</span>
            </h4>

            {application.reason_for_leaving && (
              <div className="bg-[#F5F3ED] rounded-xl px-4 py-3 text-xs text-[#102B46]">
                <strong>Reason for Leaving Previous School:</strong>{' '}
                {application.reason_for_leaving}
              </div>
            )}

            {documents.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between gap-2 bg-[#F5F3ED] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-[#102B46] truncate">
                        {DOC_LABELS[doc.document_type] || doc.document_type}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">{doc.file_name}</div>
                    </div>
                    {docUrls[doc.id] && (
                      <a
                        href={docUrls[doc.id]}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-[#102B46] font-bold hover:bg-slate-50 shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>View</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
                      {item.notes && <p className="text-slate-700 mt-0.5">{item.notes}</p>}
                    </div>
                    <span className="text-[11px] text-slate-500 shrink-0 tabular-nums">
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
