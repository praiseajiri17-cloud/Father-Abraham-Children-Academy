import React from 'react';
import {
  APPLICATION_STATUS_META,
  PAYMENT_STATUS_META,
  PHYSICAL_DOCS_STATUS_META,
} from '../../types/admissions';
import {
  ApplicationStatus,
  PaymentStatus,
  PhysicalDocumentsStatus,
} from '../../types/database';
import { CheckCircle2 } from 'lucide-react';

export const ApplicationStatusBadge: React.FC<{ status: ApplicationStatus }> = ({ status }) => {
  const meta = APPLICATION_STATUS_META[status] ?? APPLICATION_STATUS_META.draft;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${meta.badgeClass}`}
    >
      {meta.label}
    </span>
  );
};

export const PaymentStatusBadge: React.FC<{ status: PaymentStatus }> = ({ status }) => {
  const meta = PAYMENT_STATUS_META[status] ?? PAYMENT_STATUS_META.unpaid;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${meta.badgeClass}`}
    >
      {meta.label}
    </span>
  );
};

export const PhysicalDocsBadge: React.FC<{ status: PhysicalDocumentsStatus }> = ({ status }) => {
  const meta = PHYSICAL_DOCS_STATUS_META[status] ?? PHYSICAL_DOCS_STATUS_META.not_submitted;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${meta.badgeClass}`}
    >
      {meta.label}
    </span>
  );
};

interface WorkflowStepperProps {
  applicationStatus: ApplicationStatus;
  paymentStatus: PaymentStatus;
  physicalDocumentsStatus: PhysicalDocumentsStatus;
}

export const AdmissionWorkflowStepper: React.FC<WorkflowStepperProps> = ({
  applicationStatus,
  paymentStatus,
  physicalDocumentsStatus,
}) => {
  const steps = [
    {
      label: 'Application Completed',
      done: applicationStatus !== 'draft',
    },
    {
      label: 'Fee Payment Verified',
      done: paymentStatus === 'paid',
    },
    {
      label: 'Official A4 Form Unlocked',
      done: paymentStatus === 'paid',
    },
    {
      label: 'Physical Docs Submitted',
      done: physicalDocumentsStatus !== 'not_submitted',
    },
    {
      label: 'Final Admission Decision',
      done: applicationStatus === 'approved' || applicationStatus === 'rejected',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
      {steps.map((step, index) => (
        <div
          key={step.label}
          className={`rounded-xl p-2.5 border text-xs flex items-center gap-2 ${
            step.done
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-semibold'
              : 'bg-[#F5F3ED] border-slate-200 text-slate-600'
          }`}
        >
          <span
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
              step.done ? 'bg-[#15803D] text-white' : 'bg-white border border-slate-300 text-slate-600'
            }`}
          >
            {step.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : index + 1}
          </span>
          <span className="leading-tight">{step.label}</span>
        </div>
      ))}
    </div>
  );
};
