import React from 'react';
import { SCHOOL_INFO } from '../../constants/data';
import {
  AdmissionApplicationExpanded,
  PHYSICAL_DOCUMENT_CHECKLIST_ITEMS,
} from '../../types/admissions';
import { formatNairaFromKobo } from '../../services/admissionsService';

interface OfficialAdmissionPrintSheetProps {
  application: AdmissionApplicationExpanded | null;
}

/**
 * Clean A4 Print Representation rendered off-screen until print mode is activated
 * (or previewed in a dedicated modal). Strictly gated to payment_status === 'paid'.
 */
export const OfficialAdmissionPrintSheet: React.FC<OfficialAdmissionPrintSheetProps> = ({
  application,
}) => {
  if (!application || application.payment_status !== 'paid') {
    return null;
  }

  const feeFormatted = formatNairaFromKobo(application.application_fee_kobo) ?? 'Verified Amount';
  const med = application.medical_details;

  return (
    <div
      id="official-admission-print-root"
      className="hidden print:block bg-white text-[#091C30] text-xs leading-snug"
    >
      {/* Institutional Header */}
      <div className="bg-[#102B46] text-white p-4 border-b-4 border-[#D9B76A] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 bg-white text-[#102B46] rounded-md flex flex-col items-center justify-center font-extrabold text-[10px] shrink-0">
            <span>FACA</span>
            <span className="text-[7px] font-semibold tracking-widest">CREST</span>
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-wide uppercase font-['Manrope']">
              {SCHOOL_INFO.name}
            </h1>
            <p className="text-[10px] font-bold text-[#D9B76A] tracking-widest">
              {SCHOOL_INFO.levels}
            </p>
            <p className="text-[10px] text-slate-200 mt-0.5">{SCHOOL_INFO.address}</p>
            <p className="text-[10px] text-slate-200">
              Tel: {SCHOOL_INFO.phone} | Email: {SCHOOL_INFO.email}
            </p>
          </div>
        </div>
        <div className="text-right text-[10px]">
          <div className="font-bold text-[#D9B76A] uppercase">Application Reference</div>
          <div className="font-mono font-bold text-sm">{application.application_reference}</div>
          <div>Session: {application.academic_sessions?.name || '—'}</div>
        </div>
      </div>

      {/* Form Title & Passport Photo Box */}
      <div className="mt-3 flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <h2 className="text-sm font-extrabold uppercase text-[#102B46] font-['Manrope']">
            Official Admission Application Form
          </h2>
          <div className="border border-emerald-700 bg-emerald-50 p-2 rounded">
            <div className="font-bold text-emerald-800 text-[11px]">
              APPLICATION FEE PAYMENT VERIFIED
            </div>
            <div className="text-[10px] text-slate-700">
              Payment Ref: {application.payment_reference || 'Verified'} | Amount: {feeFormatted}{' '}
              | Date:{' '}
              {application.paid_at
                ? new Date(application.paid_at).toLocaleDateString('en-NG')
                : 'Confirmed'}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 border border-slate-300 p-2">
            <div>
              <span className="text-[9px] uppercase text-slate-500 font-bold block">
                Intended Section
              </span>
              <span className="font-semibold">{application.school_sections?.name || '—'}</span>
            </div>
            <div>
              <span className="text-[9px] uppercase text-slate-500 font-bold block">
                Intended Class
              </span>
              <span className="font-semibold">{application.class_levels?.name || '—'}</span>
            </div>
          </div>
        </div>

        <div className="w-[34mm] h-[42mm] border-2 border-[#102B46] flex flex-col items-center justify-center text-center text-[9px] font-bold text-slate-500 shrink-0">
          <span>AFFIX RECENT</span>
          <span>PASSPORT</span>
          <span>PHOTOGRAPH</span>
          <span className="font-normal text-[8px] mt-1">(35mm x 45mm)</span>
        </div>
      </div>

      {/* Section A */}
      <div className="mt-3 print-avoid-break">
        <div className="bg-[#F5F3ED] border border-[#102B46] border-l-4 px-2 py-1 font-bold text-[11px] uppercase text-[#102B46]">
          Section A — Child / Applicant Information
        </div>
        <div className="grid grid-cols-3 border-x border-b border-slate-300">
          <div className="p-1.5 border-r border-slate-300">
            <span className="text-[9px] text-slate-500 uppercase block">First Name</span>
            <span className="font-semibold">{application.child_first_name}</span>
          </div>
          <div className="p-1.5 border-r border-slate-300">
            <span className="text-[9px] text-slate-500 uppercase block">Middle Name</span>
            <span className="font-semibold">{application.child_middle_name || '—'}</span>
          </div>
          <div className="p-1.5">
            <span className="text-[9px] text-slate-500 uppercase block">Last Name</span>
            <span className="font-semibold">{application.child_last_name}</span>
          </div>
        </div>
        <div className="grid grid-cols-4 border-x border-b border-slate-300">
          <div className="p-1.5 border-r border-slate-300">
            <span className="text-[9px] text-slate-500 uppercase block">Date of Birth</span>
            <span>{application.child_date_of_birth}</span>
          </div>
          <div className="p-1.5 border-r border-slate-300">
            <span className="text-[9px] text-slate-500 uppercase block">Gender</span>
            <span className="uppercase">{application.child_gender}</span>
          </div>
          <div className="p-1.5 border-r border-slate-300">
            <span className="text-[9px] text-slate-500 uppercase block">Nationality</span>
            <span>{application.child_nationality || 'Nigerian'}</span>
          </div>
          <div className="p-1.5">
            <span className="text-[9px] text-slate-500 uppercase block">State / LGA</span>
            <span>
              {[application.child_state_of_origin, application.child_lga]
                .filter(Boolean)
                .join(' / ') || '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Section B */}
      <div className="mt-3 print-avoid-break">
        <div className="bg-[#F5F3ED] border border-[#102B46] border-l-4 px-2 py-1 font-bold text-[11px] uppercase text-[#102B46]">
          Section B — Parent / Guardian & Emergency Contact
        </div>
        <div className="grid grid-cols-3 border-x border-b border-slate-300">
          <div className="p-1.5 border-r border-slate-300">
            <span className="text-[9px] text-slate-500 uppercase block">Parent / Guardian</span>
            <span className="font-semibold">{application.parent_full_name || '—'}</span>
          </div>
          <div className="p-1.5 border-r border-slate-300">
            <span className="text-[9px] text-slate-500 uppercase block">Relationship</span>
            <span>{application.parent_relationship || '—'}</span>
          </div>
          <div className="p-1.5">
            <span className="text-[9px] text-slate-500 uppercase block">Occupation</span>
            <span>{application.parent_occupation || '—'}</span>
          </div>
        </div>
        <div className="grid grid-cols-3 border-x border-b border-slate-300">
          <div className="p-1.5 border-r border-slate-300">
            <span className="text-[9px] text-slate-500 uppercase block">Email</span>
            <span>{application.parent_email || '—'}</span>
          </div>
          <div className="p-1.5 border-r border-slate-300">
            <span className="text-[9px] text-slate-500 uppercase block">Primary Phone</span>
            <span>{application.parent_phone || '—'}</span>
          </div>
          <div className="p-1.5">
            <span className="text-[9px] text-slate-500 uppercase block">Alternate Phone</span>
            <span>{application.parent_alternate_phone || '—'}</span>
          </div>
        </div>
        <div className="p-1.5 border-x border-b border-slate-300">
          <span className="text-[9px] text-slate-500 uppercase block">Residential Address</span>
          <span>{application.residential_address || '—'}</span>
        </div>
        <div className="grid grid-cols-3 border-x border-b border-slate-300">
          <div className="p-1.5 border-r border-slate-300">
            <span className="text-[9px] text-slate-500 uppercase block">Emergency Contact</span>
            <span>{application.emergency_contact_name || '—'}</span>
          </div>
          <div className="p-1.5 border-r border-slate-300">
            <span className="text-[9px] text-slate-500 uppercase block">Emergency Phone</span>
            <span>{application.emergency_contact_phone || '—'}</span>
          </div>
          <div className="p-1.5">
            <span className="text-[9px] text-slate-500 uppercase block">Relationship</span>
            <span>{application.emergency_contact_relationship || '—'}</span>
          </div>
        </div>
      </div>

      {/* Section C & D */}
      <div className="mt-3 print-avoid-break">
        <div className="bg-[#F5F3ED] border border-[#102B46] border-l-4 px-2 py-1 font-bold text-[11px] uppercase text-[#102B46]">
          Section C & D — Previous Schooling & Health Information
        </div>
        <div className="grid grid-cols-2 border-x border-b border-slate-300">
          <div className="p-1.5 border-r border-slate-300">
            <span className="text-[9px] text-slate-500 uppercase block">Previous School</span>
            <span>
              {application.is_first_time_schooling
                ? 'First-time school / Creche entrant'
                : application.previous_school_name || application.previous_school || '—'}
            </span>
          </div>
          <div className="p-1.5">
            <span className="text-[9px] text-slate-500 uppercase block">Last Class Attended</span>
            <span>
              {application.is_first_time_schooling ? 'N/A' : application.previous_class || '—'}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-3 border-x border-b border-slate-300">
          <div className="p-1.5 border-r border-slate-300">
            <span className="text-[9px] text-slate-500 uppercase block">Blood Group / Genotype</span>
            <span>
              {[med?.blood_group, med?.genotype].filter(Boolean).join(' / ') || '—'}
            </span>
          </div>
          <div className="p-1.5 col-span-2">
            <span className="text-[9px] text-slate-500 uppercase block">
              Allergies / Medical / Learning Needs
            </span>
            <span>
              {[
                med?.allergies,
                med?.chronic_conditions,
                med?.dietary_requirements,
                med?.special_learning_needs,
              ]
                .filter(Boolean)
                .join(' | ') || 'None stated'}
            </span>
          </div>
        </div>
      </div>

      {/* Section E: Declaration */}
      <div className="mt-3 border border-slate-300 p-2.5 print-avoid-break">
        <div className="font-bold text-[11px] uppercase text-[#102B46] mb-1">
          Section E — Parent / Guardian Declaration
        </div>
        <p className="text-[10px] text-slate-700">
          I declare that the information supplied in this admission application is true and complete.
          I undertake to provide original supporting documents at the Admissions Office for physical
          verification.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-4 text-[10px]">
          <div>
            <strong>Electronic Signer:</strong>{' '}
            {application.declaration_signer_name || application.parent_full_name || '—'}
          </div>
          <div>
            <strong>Submitted Date:</strong>{' '}
            {application.submitted_at
              ? new Date(application.submitted_at).toLocaleString('en-NG')
              : '—'}
          </div>
          <div className="pt-3 border-b border-slate-500">Handwritten Signature:</div>
          <div className="pt-3 border-b border-slate-500">Date Signed:</div>
        </div>
      </div>

      {/* Section F: School Use Only */}
      <div className="mt-3 border-2 border-[#102B46] p-2.5 print-avoid-break">
        <div className="font-bold text-[11px] uppercase text-[#102B46] mb-1.5">
          Section F — For Official School Use Only (Admissions Office)
        </div>
        <div className="grid grid-cols-2 gap-1.5 text-[10px] mb-2">
          {PHYSICAL_DOCUMENT_CHECKLIST_ITEMS.map((item) => (
            <div key={item} className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 border border-slate-600 shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-300 text-[10px]">
          <div className="pt-3 border-b border-slate-400">Received By (Staff Name & Signature):</div>
          <div className="pt-3 border-b border-slate-400">Date Received:</div>
        </div>
        <div className="pt-4 border-b border-slate-400 text-[10px]">
          Admission Officer Remarks:
        </div>
        <div className="mt-2.5 flex items-center justify-between text-[10px] font-bold">
          <span>DECISION: [ ] APPROVED   [ ] CORRECTION REQUESTED   [ ] NOT APPROVED</span>
          <span>Official Stamp & Signature</span>
        </div>
      </div>
    </div>
  );
};
