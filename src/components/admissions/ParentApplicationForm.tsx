import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  HeartPulse,
  Loader2,
  Save,
  School,
  Send,
  UserCheck,
  Users,
  AlertCircle,
} from 'lucide-react';
import {
  AdmissionApplicationExpanded,
  AdmissionFormInput,
  AdmissionReferenceLookups,
} from '../../types/admissions';
import { AuthenticatedUserProfile } from '../../types/auth';
import { formatNairaFromKobo } from '../../services/admissionsService';

interface ParentApplicationFormProps {
  user: AuthenticatedUserProfile | null;
  lookups: AdmissionReferenceLookups;
  initialApplication?: AdmissionApplicationExpanded | null;
  isSubmitting: boolean;
  onSaveDraft: (input: AdmissionFormInput) => Promise<void>;
  onSubmitApplication: (input: AdmissionFormInput) => Promise<void>;
  onCancel: () => void;
}

const STEPS = [
  { id: 1, title: 'Child Information', icon: UserCheck },
  { id: 2, title: 'Parent & Emergency', icon: Users },
  { id: 3, title: 'Previous School', icon: School },
  { id: 4, title: 'Health & Care Notes', icon: HeartPulse },
  { id: 5, title: 'Review & Declaration', icon: FileText },
];

export const ParentApplicationForm: React.FC<ParentApplicationFormProps> = ({
  user,
  lookups,
  initialApplication,
  isSubmitting,
  onSaveDraft,
  onSubmitApplication,
  onCancel,
}) => {
  const defaultSection = lookups.sections[0];
  const currentSession =
    lookups.sessions.find((s) => s.is_current) ?? lookups.sessions[0];

  const [step, setStep] = useState(1);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [form, setForm] = useState<AdmissionFormInput>(() => {
    const initialSectionId =
      initialApplication?.intended_section_id || defaultSection?.id || '';
    const matchingLevels = lookups.classLevels.filter(
      (cl) => cl.school_section_id === initialSectionId
    );
    const initialLevelId =
      initialApplication?.intended_class_level_id || matchingLevels[0]?.id || '';

    return {
      id: initialApplication?.id,
      child_first_name: initialApplication?.child_first_name || '',
      child_middle_name: initialApplication?.child_middle_name || '',
      child_last_name: initialApplication?.child_last_name || '',
      child_date_of_birth: initialApplication?.child_date_of_birth || '',
      child_gender: initialApplication?.child_gender || 'female',
      child_nationality: initialApplication?.child_nationality || 'Nigerian',
      child_state_of_origin: initialApplication?.child_state_of_origin || '',
      child_lga: initialApplication?.child_lga || '',
      intended_section_id: initialSectionId,
      intended_class_level_id: initialLevelId,
      intended_session_id:
        initialApplication?.intended_session_id || currentSession?.id || '',
      parent_full_name:
        initialApplication?.parent_full_name || user?.fullName || '',
      parent_relationship: initialApplication?.parent_relationship || 'Parent',
      parent_email:
        initialApplication?.parent_email || user?.primaryEmail || '',
      parent_phone: initialApplication?.parent_phone || '',
      parent_alternate_phone: initialApplication?.parent_alternate_phone || '',
      residential_address: initialApplication?.residential_address || '',
      parent_occupation: initialApplication?.parent_occupation || '',
      emergency_contact_name: initialApplication?.emergency_contact_name || '',
      emergency_contact_phone: initialApplication?.emergency_contact_phone || '',
      emergency_contact_relationship:
        initialApplication?.emergency_contact_relationship || '',
      is_first_time_schooling:
        initialApplication?.is_first_time_schooling ?? false,
      previous_school_name:
        initialApplication?.previous_school_name ||
        initialApplication?.previous_school ||
        '',
      previous_class: initialApplication?.previous_class || '',
      previous_school_address:
        initialApplication?.previous_school_address || '',
      additional_details: initialApplication?.additional_details || '',
      blood_group: initialApplication?.medical_details?.blood_group || '',
      genotype: initialApplication?.medical_details?.genotype || '',
      allergies: initialApplication?.medical_details?.allergies || '',
      chronic_conditions:
        initialApplication?.medical_details?.chronic_conditions || '',
      dietary_requirements:
        initialApplication?.medical_details?.dietary_requirements || '',
      special_learning_needs:
        initialApplication?.medical_details?.special_learning_needs || '',
      emergency_medical_notes:
        initialApplication?.medical_details?.emergency_medical_notes || '',
      declaration_accepted: initialApplication?.declaration_accepted ?? false,
      declaration_signer_name:
        initialApplication?.declaration_signer_name || user?.fullName || '',
    };
  });

  const selectedSection = useMemo(
    () => lookups.sections.find((s) => s.id === form.intended_section_id) ?? null,
    [lookups.sections, form.intended_section_id]
  );

  const isCreche = selectedSection?.code === 'creche';

  const availableClassLevels = useMemo(
    () =>
      lookups.classLevels.filter(
        (cl) => cl.school_section_id === form.intended_section_id
      ),
    [lookups.classLevels, form.intended_section_id]
  );

  const selectedClassLevel = useMemo(
    () => availableClassLevels.find((c) => c.id === form.intended_class_level_id) ?? null,
    [availableClassLevels, form.intended_class_level_id]
  );

  const selectedSession = useMemo(
    () => lookups.sessions.find((s) => s.id === form.intended_session_id) ?? null,
    [lookups.sessions, form.intended_session_id]
  );

  const updateField = <K extends keyof AdmissionFormInput>(
    field: K,
    value: AdmissionFormInput[K]
  ) => {
    setValidationError(null);
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSectionChange = (sectionId: string) => {
    const nextSection = lookups.sections.find((s) => s.id === sectionId);
    const matching = lookups.classLevels.filter(
      (cl) => cl.school_section_id === sectionId
    );
    setValidationError(null);
    setForm((prev) => ({
      ...prev,
      intended_section_id: sectionId,
      intended_class_level_id: matching[0]?.id || '',
      is_first_time_schooling:
        nextSection?.code === 'creche' ? true : prev.is_first_time_schooling,
    }));
  };

  const validateStep = (targetStep: number): string | null => {
    if (targetStep === 1) {
      if (!form.child_first_name.trim() || !form.child_last_name.trim()) {
        return "Please enter the child's first name and last name.";
      }
      if (!form.child_date_of_birth) {
        return "Please select the child's date of birth.";
      }
      if (!form.intended_section_id || !form.intended_class_level_id || !form.intended_session_id) {
        return 'Please select the intended educational section, class level, and academic session.';
      }
    }

    if (targetStep === 2) {
      if (!form.parent_full_name.trim() || !form.parent_relationship.trim()) {
        return 'Please provide the parent/guardian full name and relationship.';
      }
      if (!form.parent_email.trim() || !form.parent_phone.trim()) {
        return 'Please provide a valid parent/guardian email address and phone number.';
      }
      if (!form.residential_address.trim()) {
        return 'Please enter your current residential address.';
      }
      if (
        !form.emergency_contact_name.trim() ||
        !form.emergency_contact_phone.trim() ||
        !form.emergency_contact_relationship.trim()
      ) {
        return 'Please provide full emergency contact details (name, phone, and relationship).';
      }
    }

    if (targetStep === 3 && !isCreche && !form.is_first_time_schooling) {
      if (!form.previous_school_name.trim()) {
        return 'Please enter the previous school name or tick "First-time school entrant".';
      }
    }

    if (targetStep === 5) {
      for (const s of [1, 2, 3]) {
        const err = validateStep(s);
        if (err) return err;
      }
      if (!form.declaration_accepted) {
        return 'Please review and accept the parent/guardian declaration before submitting.';
      }
      if (!form.declaration_signer_name.trim()) {
        return 'Please enter your full name in the electronic signature box.';
      }
    }

    return null;
  };

  const handleNextStep = () => {
    const err = validateStep(step);
    if (err) {
      setValidationError(err);
      return;
    }
    setStep((s) => Math.min(5, s + 1));
  };

  const handleDraftSave = async () => {
    const err = validateStep(1);
    if (err) {
      setValidationError(err);
      setStep(1);
      return;
    }
    setValidationError(null);
    await onSaveDraft(form);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateStep(5);
    if (err) {
      setValidationError(err);
      return;
    }
    setValidationError(null);
    await onSubmitApplication(form);
  };

  const formattedFee = formatNairaFromKobo(
    lookups.admissionSettings?.application_fee_kobo
  );

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
      {/* Form Top Bar */}
      <div className="bg-[#102B46] text-white p-5 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#D9B76A]">
            Online Admission Application
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold font-['Manrope'] mt-0.5">
            {initialApplication
              ? `Continue Application (${initialApplication.application_reference})`
              : 'Start New Child Application'}
          </h2>
          {initialApplication?.application_status === 'correction_requested' &&
            initialApplication.correction_notes && (
              <div className="mt-2 bg-orange-500/20 border border-orange-300/40 rounded-xl px-3 py-2 text-xs text-orange-100">
                <strong>Admissions Correction Request:</strong>{' '}
                {initialApplication.correction_notes}
              </div>
            )}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="self-start sm:self-center inline-flex items-center gap-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-[#D9B76A]" />
          <span>Back to Applications</span>
        </button>
      </div>

      {/* Multi-Step Stepper */}
      <div className="bg-[#F5F3ED] border-b border-slate-200 px-4 sm:px-7 py-3.5 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const active = step === s.id;
            const completed = step > s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setValidationError(null);
                  setStep(s.id);
                }}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                  active
                    ? 'bg-[#102B46] text-white shadow-sm'
                    : completed
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-[#102B46]/40'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-[#D9B76A]' : ''}`} />
                <span>
                  {s.id}. {s.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={(e) => void handleFinalSubmit(e)} className="p-5 sm:p-8 space-y-6">
        {validationError && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 text-xs sm:text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span>{validationError}</span>
          </div>
        )}

        {/* STEP 1: Child Information */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-extrabold text-[#102B46] font-['Manrope']">
                Section A — Child / Applicant Information & Intended Placement
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                Enter the prospective pupil or student&apos;s official details exactly as they
                appear on their birth certificate.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#102B46] mb-1.5">
                  Intended Educational Section *
                </label>
                <select
                  value={form.intended_section_id}
                  onChange={(e) => handleSectionChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white focus:border-[#102B46] focus:outline-none"
                  required
                >
                  {lookups.sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#102B46] mb-1.5">
                  Intended Class Level *
                </label>
                <select
                  value={form.intended_class_level_id}
                  onChange={(e) => updateField('intended_class_level_id', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white focus:border-[#102B46] focus:outline-none"
                  required
                >
                  {availableClassLevels.map((lvl) => (
                    <option key={lvl.id} value={lvl.id}>
                      {lvl.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#102B46] mb-1.5">
                  Academic Session *
                </label>
                <select
                  value={form.intended_session_id}
                  onChange={(e) => updateField('intended_session_id', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white focus:border-[#102B46] focus:outline-none"
                  required
                >
                  {lookups.sessions.map((ses) => (
                    <option key={ses.id} value={ses.id}>
                      {ses.name} {ses.is_current ? '(Current)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {isCreche && (
              <div className="bg-[#F5F3ED] border border-[#D9B76A]/50 rounded-2xl p-4 text-xs text-[#102B46]">
                <strong>Creche Early Care Notice:</strong> Creche applications are fully supported
                here. Note that Creche pupils are kept separate from Primary/Secondary academic
                result portals.
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#102B46] mb-1.5">
                  Child First Name *
                </label>
                <input
                  type="text"
                  value={form.child_first_name}
                  onChange={(e) => updateField('child_first_name', e.target.value)}
                  placeholder="e.g. Chinedu"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#102B46] focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#102B46] mb-1.5">
                  Middle Name
                </label>
                <input
                  type="text"
                  value={form.child_middle_name}
                  onChange={(e) => updateField('child_middle_name', e.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#102B46] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#102B46] mb-1.5">
                  Child Surname / Last Name *
                </label>
                <input
                  type="text"
                  value={form.child_last_name}
                  onChange={(e) => updateField('child_last_name', e.target.value)}
                  placeholder="e.g. Adeyemi"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#102B46] focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#102B46] mb-1.5">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  value={form.child_date_of_birth}
                  onChange={(e) => updateField('child_date_of_birth', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#102B46] focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#102B46] mb-1.5">
                  Gender *
                </label>
                <select
                  value={form.child_gender}
                  onChange={(e) =>
                    updateField('child_gender', e.target.value as 'male' | 'female')
                  }
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white focus:border-[#102B46] focus:outline-none"
                >
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#102B46] mb-1.5">
                  Nationality
                </label>
                <input
                  type="text"
                  value={form.child_nationality}
                  onChange={(e) => updateField('child_nationality', e.target.value)}
                  placeholder="Nigerian"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#102B46] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#102B46] mb-1.5">
                  State of Origin
                </label>
                <input
                  type="text"
                  value={form.child_state_of_origin}
                  onChange={(e) => updateField('child_state_of_origin', e.target.value)}
                  placeholder="e.g. Lagos / Ogun / Anambra"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#102B46] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#102B46] mb-1.5">
                  Local Government Area (LGA)
                </label>
                <input
                  type="text"
                  value={form.child_lga}
                  onChange={(e) => updateField('child_lga', e.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#102B46] focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Parent / Guardian & Emergency Contact */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-extrabold text-[#102B46] font-['Manrope']">
                Section B — Parent / Guardian & Emergency Contact Information
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                Your verified account details are pre-filled. Please confirm active phone
                numbers and an emergency contact person.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-[#102B46] mb-1.5">
                  Parent / Guardian Full Name *
                </label>
                <input
                  type="text"
                  value={form.parent_full_name}
                  onChange={(e) => updateField('parent_full_name', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#102B46] focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#102B46] mb-1.5">
                  Relationship to Child *
                </label>
                <select
                  value={form.parent_relationship}
                  onChange={(e) => updateField('parent_relationship', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white focus:border-[#102B46] focus:outline-none"
                >
                  <option value="Mother">Mother</option>
                  <option value="Father">Father</option>
                  <option value="Legal Guardian">Legal Guardian</option>
                  <option value="Parent">Parent</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#102B46] mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={form.parent_email}
                  onChange={(e) => updateField('parent_email', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#102B46] focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#102B46] mb-1.5">
                  Primary Phone Number *
                </label>
                <input
                  type="tel"
                  value={form.parent_phone}
                  onChange={(e) => updateField('parent_phone', e.target.value)}
                  placeholder="+234..."
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#102B46] focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#102B46] mb-1.5">
                  Alternate Phone Number
                </label>
                <input
                  type="tel"
                  value={form.parent_alternate_phone}
                  onChange={(e) => updateField('parent_alternate_phone', e.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#102B46] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-[#102B46] mb-1.5">
                  Residential Address *
                </label>
                <input
                  type="text"
                  value={form.residential_address}
                  onChange={(e) => updateField('residential_address', e.target.value)}
                  placeholder="House number, street, area, city"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#102B46] focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#102B46] mb-1.5">
                  Occupation / Profession
                </label>
                <input
                  type="text"
                  value={form.parent_occupation}
                  onChange={(e) => updateField('parent_occupation', e.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#102B46] focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <h4 className="text-sm font-extrabold text-[#102B46] mb-3">
                Emergency Contact Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#102B46] mb-1.5">
                    Emergency Contact Name *
                  </label>
                  <input
                    type="text"
                    value={form.emergency_contact_name}
                    onChange={(e) => updateField('emergency_contact_name', e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#102B46] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#102B46] mb-1.5">
                    Emergency Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={form.emergency_contact_phone}
                    onChange={(e) => updateField('emergency_contact_phone', e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#102B46] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#102B46] mb-1.5">
                    Relationship to Child *
                  </label>
                  <input
                    type="text"
                    value={form.emergency_contact_relationship}
                    onChange={(e) =>
                      updateField('emergency_contact_relationship', e.target.value)
                    }
                    placeholder="e.g. Aunt / Uncle / Family Doctor"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#102B46] focus:outline-none"
                    required
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Previous School Information */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-extrabold text-[#102B46] font-['Manrope']">
                Section C — Previous School / Early Years Background
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                {isCreche
                  ? 'Previous schooling is optional for Creche entrants. Tick the option below if this is your child’s first school experience.'
                  : 'Provide details of the child’s current or most recent school (or indicate first-time schooling).'}
              </p>
            </div>

            <label className="flex items-start gap-3 bg-[#F5F3ED] border border-slate-200 rounded-2xl p-4 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_first_time_schooling}
                onChange={(e) => updateField('is_first_time_schooling', e.target.checked)}
                className="mt-1 rounded border-slate-300 text-[#102B46] focus:ring-[#102B46]"
              />
              <span className="text-xs sm:text-sm text-[#102B46]">
                <strong>First-time school / Creche entrant</strong> — this child has not
                attended a prior formal school.
              </span>
            </label>

            {!form.is_first_time_schooling && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#102B46] mb-1.5">
                      Previous School Name {!isCreche ? '*' : '(Optional)'}
                    </label>
                    <input
                      type="text"
                      value={form.previous_school_name}
                      onChange={(e) => updateField('previous_school_name', e.target.value)}
                      placeholder="Full name of previous school"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#102B46] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#102B46] mb-1.5">
                      Previous / Current Class
                    </label>
                    <input
                      type="text"
                      value={form.previous_class}
                      onChange={(e) => updateField('previous_class', e.target.value)}
                      placeholder="e.g. Nursery 2 / Primary 3 / JSS 1"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#102B46] focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#102B46] mb-1.5">
                    Previous School Address
                  </label>
                  <input
                    type="text"
                    value={form.previous_school_address}
                    onChange={(e) => updateField('previous_school_address', e.target.value)}
                    placeholder="City / address of previous school"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#102B46] focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Additional & Medical Information */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-extrabold text-[#102B46] font-['Manrope']">
                Section D — Health, Allergies & Special Care Information
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                Medical records are stored in a restricted database table accessible only to you,
                the Admissions Office, and authorized school leadership/health personnel.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#102B46] mb-1.5">
                  Blood Group
                </label>
                <select
                  value={form.blood_group}
                  onChange={(e) => updateField('blood_group', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white focus:border-[#102B46] focus:outline-none"
                >
                  <option value="">Not specified</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#102B46] mb-1.5">
                  Genotype
                </label>
                <select
                  value={form.genotype}
                  onChange={(e) => updateField('genotype', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white focus:border-[#102B46] focus:outline-none"
                >
                  <option value="">Not specified</option>
                  <option value="AA">AA</option>
                  <option value="AS">AS</option>
                  <option value="AC">AC</option>
                  <option value="SS">SS</option>
                  <option value="SC">SC</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#102B46] mb-1.5">
                  Known Allergies
                </label>
                <input
                  type="text"
                  value={form.allergies}
                  onChange={(e) => updateField('allergies', e.target.value)}
                  placeholder="Food, drug, environmental (or None)"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#102B46] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#102B46] mb-1.5">
                  Chronic Conditions / Medical Notes
                </label>
                <textarea
                  rows={2}
                  value={form.chronic_conditions}
                  onChange={(e) => updateField('chronic_conditions', e.target.value)}
                  placeholder="e.g. Asthma inhaler instructions, or leave blank"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#102B46] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#102B46] mb-1.5">
                  Dietary / Creche Feeding Requirements
                </label>
                <textarea
                  rows={2}
                  value={form.dietary_requirements}
                  onChange={(e) => updateField('dietary_requirements', e.target.value)}
                  placeholder="Any special feeding instructions"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#102B46] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#102B46] mb-1.5">
                  Special Learning Support Needs
                </label>
                <textarea
                  rows={2}
                  value={form.special_learning_needs}
                  onChange={(e) => updateField('special_learning_needs', e.target.value)}
                  placeholder="Optional support accommodations"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#102B46] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#102B46] mb-1.5">
                  Additional Details for Admissions Office
                </label>
                <textarea
                  rows={2}
                  value={form.additional_details}
                  onChange={(e) => updateField('additional_details', e.target.value)}
                  placeholder="Sibling already enrolled, transport preference, etc."
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#102B46] focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Review & Declaration */}
        {step === 5 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-extrabold text-[#102B46] font-['Manrope']">
                Section E — Review Application & Parent Declaration
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                Confirm all details before submitting. After submission, the official A4 PDF
                form unlocks once application fee payment is verified.
              </p>
            </div>

            <div className="bg-[#F5F3ED] rounded-2xl border border-slate-200 p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div>
                <span className="text-[11px] font-bold uppercase text-slate-500 block">
                  Child Full Name
                </span>
                <strong className="text-[#102B46]">
                  {[form.child_first_name, form.child_middle_name, form.child_last_name]
                    .filter(Boolean)
                    .join(' ') || '—'}
                </strong>
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase text-slate-500 block">
                  Intended Section / Class / Session
                </span>
                <strong className="text-[#102B46]">
                  {selectedSection?.name || '—'} • {selectedClassLevel?.name || '—'} (
                  {selectedSession?.name || '—'})
                </strong>
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase text-slate-500 block">
                  Date of Birth & Gender
                </span>
                <span>
                  {form.child_date_of_birth || '—'} ({form.child_gender})
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase text-slate-500 block">
                  Parent / Guardian Contact
                </span>
                <span>
                  {form.parent_full_name} • {form.parent_phone}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase text-slate-500 block">
                  Previous Schooling
                </span>
                <span>
                  {form.is_first_time_schooling
                    ? 'First-time school entrant'
                    : `${form.previous_school_name || '—'} (${form.previous_class || 'N/A'})`}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase text-slate-500 block">
                  Admission Application Fee
                </span>
                <span className="font-semibold text-[#102B46]">
                  {formattedFee
                    ? `${formattedFee} (Verified via Paystack in Phase 5)`
                    : 'Fee configuration pending General Administrator setup'}
                </span>
              </div>
            </div>

            <div className="border border-slate-300 rounded-2xl p-5 space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.declaration_accepted}
                  onChange={(e) => updateField('declaration_accepted', e.target.checked)}
                  className="mt-1 rounded border-slate-300 text-[#102B46] focus:ring-[#102B46]"
                />
                <span className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  I hereby declare that all details submitted for this admission application are
                  accurate and complete. I understand that after completing application fee
                  payment verification, I must download, print, sign, and physically submit the
                  official A4 application form with supporting documents at Father Abraham Children
                  Academy.
                </span>
              </label>

              <div>
                <label className="block text-xs font-bold text-[#102B46] mb-1.5">
                  Parent / Guardian Full Name (Electronic Declaration Signature) *
                </label>
                <input
                  type="text"
                  value={form.declaration_signer_name}
                  onChange={(e) => updateField('declaration_signer_name', e.target.value)}
                  placeholder="Type your full name"
                  className="w-full sm:max-w-md rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#102B46] focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Action Footer */}
        <div className="pt-5 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                type="button"
                onClick={() => {
                  setValidationError(null);
                  setStep((s) => Math.max(1, s - 1));
                }}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => void handleDraftSave()}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#102B46]/30 bg-[#F5F3ED] hover:bg-[#e8e3d6] text-[#102B46] font-bold text-xs sm:text-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4 text-[#102B46]" />
              )}
              <span>Save Draft</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {step < 5 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#102B46] hover:bg-[#091C30] text-white font-bold text-sm"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4 text-[#D9B76A]" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#15803D] hover:bg-emerald-800 text-white font-bold text-sm shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>
                  {initialApplication?.application_status === 'correction_requested'
                    ? 'Resubmit Corrected Application'
                    : 'Submit Application'}
                </span>
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
