import React, { useEffect, useMemo, useState } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Camera,
  Edit3,
  ExternalLink,
  FileText,
  HeartPulse,
  Loader2,
  Save,
  School,
  Send,
  Trash2,
  Upload,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  AdmissionApplicationExpanded,
  AdmissionFormInput,
  AdmissionReferenceLookups,
  ParentWorkspaceProfile,
} from '../../types/admissions';
import { AdmissionDocumentType, DbAdmissionDocument } from '../../types/database';
import { AuthenticatedUserProfile } from '../../types/auth';
import {
  checkPotentialDuplicateApplication,
  createAdmissionDocumentSignedUrl,
  deleteAdmissionDocument,
  fetchApplicationDocuments,
  formatNairaFromKobo,
  uploadAdmissionDocument,
} from '../../services/admissionsService';

interface ParentApplicationFormProps {
  user: AuthenticatedUserProfile | null;
  supabase: SupabaseClient | null;
  profileId: string | null;
  parentProfile?: ParentWorkspaceProfile | null;
  lookups: AdmissionReferenceLookups;
  initialApplication?: AdmissionApplicationExpanded | null;
  isSubmitting: boolean;
  onEnsureDraftId: (input: AdmissionFormInput) => Promise<string>;
  onSaveDraft: (input: AdmissionFormInput) => Promise<void>;
  onSubmitApplication: (input: AdmissionFormInput) => Promise<void>;
  onCancel: () => void;
}

const STEPS = [
  { id: 1, title: 'Child Info', icon: UserCheck },
  { id: 2, title: 'Parent & Guardian', icon: Users },
  { id: 3, title: 'Previous School', icon: School },
  { id: 4, title: 'Additional & Medical', icon: HeartPulse },
  { id: 5, title: 'Review & Submit', icon: FileText },
];

const DOCUMENT_TYPE_LABELS: Record<AdmissionDocumentType, string> = {
  passport_photo: 'Passport Photograph',
  birth_certificate: 'Birth Certificate / Age Declaration',
  previous_report_card: 'Previous School Report Card',
  transfer_certificate: 'Transfer Certificate',
  medical_report: 'Immunization / Medical Record',
  other: 'Other Supporting Document',
};

export const ParentApplicationForm: React.FC<ParentApplicationFormProps> = ({
  user,
  supabase,
  profileId,
  parentProfile,
  lookups,
  initialApplication,
  isSubmitting,
  onEnsureDraftId,
  onSaveDraft,
  onSubmitApplication,
  onCancel,
}) => {
  const defaultSection = lookups.sections[0];
  const currentSession =
    lookups.sessions.find((s) => s.is_current) ?? lookups.sessions[0];

  const [step, setStep] = useState(1);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [duplicateConfirmed, setDuplicateConfirmed] = useState(false);

  const [documents, setDocuments] = useState<DbAdmissionDocument[]>(
    initialApplication?.documents ?? []
  );
  const [passportSignedUrl, setPassportSignedUrl] = useState<string | null>(null);
  const [docSignedUrls, setDocSignedUrls] = useState<Record<string, string>>({});
  const [isUploadingPassport, setIsUploadingPassport] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [selectedDocType, setSelectedDocType] =
    useState<AdmissionDocumentType>('birth_certificate');

  const defaultParentName = useMemo(() => {
    if (initialApplication?.parent_full_name) return initialApplication.parent_full_name;
    if (parentProfile) {
      const full = `${parentProfile.first_name} ${parentProfile.last_name}`.trim();
      if (full) return full;
    }
    return user?.fullName || '';
  }, [initialApplication?.parent_full_name, parentProfile, user?.fullName]);

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
      passport_photo_path: initialApplication?.passport_photo_path || '',
      parent_full_name: defaultParentName,
      parent_relationship: initialApplication?.parent_relationship || 'Mother',
      parent_email:
        initialApplication?.parent_email ||
        parentProfile?.email ||
        user?.primaryEmail ||
        '',
      parent_phone: initialApplication?.parent_phone || parentProfile?.phone || '',
      parent_alternate_phone:
        initialApplication?.parent_alternate_phone || parentProfile?.alternate_phone || '',
      residential_address:
        initialApplication?.residential_address || parentProfile?.residential_address || '',
      parent_occupation:
        initialApplication?.parent_occupation || parentProfile?.occupation || '',
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
      reason_for_leaving: initialApplication?.reason_for_leaving || '',
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
        initialApplication?.declaration_signer_name || defaultParentName,
    };
  });

  // Load documents & signed URLs when an existing/draft application ID is available
  useEffect(() => {
    const loadDocs = async () => {
      if (!supabase || !form.id) return;
      try {
        const docs = await fetchApplicationDocuments(supabase, form.id);
        setDocuments(docs);

        const passportDoc = docs.find((d) => d.document_type === 'passport_photo');
        const passportPath = passportDoc?.storage_path || form.passport_photo_path;
        if (passportPath) {
          const url = await createAdmissionDocumentSignedUrl(supabase, passportPath, 600);
          setPassportSignedUrl(url);
        } else {
          setPassportSignedUrl(null);
        }

        const urlMap: Record<string, string> = {};
        await Promise.all(
          docs.map(async (doc) => {
            const url = await createAdmissionDocumentSignedUrl(supabase, doc.storage_path, 600);
            if (url) urlMap[doc.id] = url;
          })
        );
        setDocSignedUrls(urlMap);
      } catch {
        // Non-blocking if documents haven't been uploaded yet
      }
    };
    void loadDocs();
  }, [supabase, form.id, form.passport_photo_path]);

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
    setDuplicateWarning(null);
    setDuplicateConfirmed(false);
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
      if (
        !form.intended_section_id ||
        !form.intended_class_level_id ||
        !form.intended_session_id
      ) {
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
        return 'Please review and confirm that all submitted information is accurate.';
      }
      if (!form.declaration_signer_name.trim()) {
        return 'Please enter your full name in the electronic signature box.';
      }
    }

    return null;
  };

  const handlePassportUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !supabase || !profileId) return;

    const step1Err = validateStep(1);
    if (step1Err) {
      setValidationError(
        `Before uploading a passport photograph, complete Step 1 details: ${step1Err}`
      );
      return;
    }

    setIsUploadingPassport(true);
    setValidationError(null);
    try {
      const appId = form.id || (await onEnsureDraftId(form));
      if (!form.id) {
        setForm((prev) => ({ ...prev, id: appId }));
      }

      // Remove existing passport document if replacing
      const existingPassports = documents.filter(
        (d) => d.document_type === 'passport_photo'
      );
      for (const oldDoc of existingPassports) {
        await deleteAdmissionDocument(supabase, oldDoc).catch(() => undefined);
      }

      const uploaded = await uploadAdmissionDocument(supabase, {
        applicationId: appId,
        profileId,
        documentType: 'passport_photo',
        file,
      });

      const signed = await createAdmissionDocumentSignedUrl(
        supabase,
        uploaded.storage_path,
        600
      );

      setDocuments((prev) => [
        uploaded,
        ...prev.filter((d) => d.document_type !== 'passport_photo'),
      ]);
      setForm((prev) => ({ ...prev, passport_photo_path: uploaded.storage_path }));
      setPassportSignedUrl(signed);
      if (signed) {
        setDocSignedUrls((prev) => ({ ...prev, [uploaded.id]: signed }));
      }
    } catch (err) {
      setValidationError(
        err instanceof Error ? err.message : 'Unable to upload passport photograph.'
      );
    } finally {
      setIsUploadingPassport(false);
    }
  };

  const handleSupportingDocUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !supabase || !profileId) return;

    const step1Err = validateStep(1);
    if (step1Err) {
      setValidationError(
        `Complete Child Information (Step 1) before uploading documents: ${step1Err}`
      );
      setStep(1);
      return;
    }

    setIsUploadingDoc(true);
    setValidationError(null);
    try {
      const appId = form.id || (await onEnsureDraftId(form));
      if (!form.id) {
        setForm((prev) => ({ ...prev, id: appId }));
      }

      const uploaded = await uploadAdmissionDocument(supabase, {
        applicationId: appId,
        profileId,
        documentType: selectedDocType,
        file,
      });
      const signed = await createAdmissionDocumentSignedUrl(
        supabase,
        uploaded.storage_path,
        600
      );

      setDocuments((prev) => [uploaded, ...prev]);
      if (signed) {
        setDocSignedUrls((prev) => ({ ...prev, [uploaded.id]: signed }));
      }
    } catch (err) {
      setValidationError(
        err instanceof Error ? err.message : 'Unable to upload supporting document.'
      );
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (doc: DbAdmissionDocument) => {
    if (!supabase) return;
    setValidationError(null);
    try {
      await deleteAdmissionDocument(supabase, doc);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      if (doc.document_type === 'passport_photo') {
        setPassportSignedUrl(null);
        setForm((prev) => ({ ...prev, passport_photo_path: '' }));
      }
    } catch (err) {
      setValidationError(
        err instanceof Error ? err.message : 'Unable to remove uploaded file.'
      );
    }
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

    // Check for potential duplicate application for the same child & academic session
    if (supabase && profileId && !duplicateConfirmed) {
      const dup = await checkPotentialDuplicateApplication(supabase, {
        profileId,
        firstName: form.child_first_name,
        lastName: form.child_last_name,
        dateOfBirth: form.child_date_of_birth,
        sessionId: form.intended_session_id,
        excludeApplicationId: form.id,
      });
      if (dup.isDuplicate) {
        setDuplicateWarning(
          `An active application (${dup.existingReference}) already exists for ${form.child_first_name} ${form.child_last_name} in this academic session. Tick the confirmation box below if you intentionally want to submit another record.`
        );
        return;
      }
    }

    setValidationError(null);
    await onSubmitApplication(form);
  };

  const formattedFee = formatNairaFromKobo(
    lookups.admissionSettings?.application_fee_kobo
  );

  const passportDoc = documents.find((d) => d.document_type === 'passport_photo');
  const supportingDocs = documents.filter((d) => d.document_type !== 'passport_photo');

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden max-w-full">
      {/* Form Top Bar */}
      <div className="bg-[#102B46] text-white p-5 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#D9B76A]">
            Step {step} of 5 • Online Admission Application
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold font-['Manrope'] mt-0.5 truncate">
            {initialApplication
              ? `Continue Application (${initialApplication.application_reference})`
              : 'New Child Admission Application'}
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
          className="self-start sm:self-center inline-flex items-center gap-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 px-4 min-h-[44px] rounded-xl transition-colors shrink-0"
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
                className={`inline-flex items-center gap-2 px-3.5 min-h-[44px] rounded-xl text-xs font-bold transition-colors ${
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

        {/* STEP 1: Child Information + Passport Upload */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-extrabold text-[#102B46] font-['Manrope']">
                Step 1 — Child Information & Intended Placement
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
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white focus:border-[#102B46] focus:outline-none"
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
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white focus:border-[#102B46] focus:outline-none"
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
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white focus:border-[#102B46] focus:outline-none"
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
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#102B46] focus:outline-none"
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
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#102B46] focus:outline-none"
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
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#102B46] focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#102B46] mb-1.5">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  value={form.child_date_of_birth}
                  onChange={(e) => updateField('child_date_of_birth', e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#102B46] focus:outline-none"
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
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white focus:border-[#102B46] focus:outline-none"
                >
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
              </div>
            </div>

            {/* Optional Passport Photograph Upload */}
            <div className="bg-[#F5F3ED] border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-24 h-28 rounded-xl border-2 border-[#102B46]/30 bg-white flex items-center justify-center overflow-hidden shrink-0">
                {passportSignedUrl ? (
                  <img
                    src={passportSignedUrl}
                    alt="Applicant passport preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center text-[10px] font-bold text-slate-400 px-2">
                    <Camera className="w-5 h-5 mx-auto mb-1 text-slate-400" />
                    <span>Passport (Optional)</span>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <div className="text-sm font-extrabold text-[#102B46] font-['Manrope']">
                  Child Passport Photograph (Optional)
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Upload a clear recent passport photograph (JPG, PNG, or WebP, max 5 MB). It is
                  stored securely in private admissions storage and placed onto your official A4
                  application form. You may also affix physical photos after printing.
                </p>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <label className="inline-flex items-center gap-2 px-4 min-h-[44px] rounded-xl bg-[#102B46] hover:bg-[#091C30] text-white text-xs font-bold cursor-pointer transition-colors">
                    {isUploadingPassport ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#D9B76A]" />
                    ) : (
                      <Upload className="w-4 h-4 text-[#D9B76A]" />
                    )}
                    <span>
                      {isUploadingPassport
                        ? 'Uploading...'
                        : passportSignedUrl
                          ? 'Replace Photo'
                          : 'Upload Passport Photo'}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={isUploadingPassport || isSubmitting}
                      onChange={(e) => void handlePassportUpload(e)}
                      className="sr-only"
                    />
                  </label>

                  {passportDoc && (
                    <button
                      type="button"
                      onClick={() => void handleDeleteDocument(passportDoc)}
                      className="inline-flex items-center gap-1.5 px-3.5 min-h-[44px] rounded-xl border border-red-200 bg-white text-red-700 hover:bg-red-50 text-xs font-bold"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Parent / Guardian Information */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-extrabold text-[#102B46] font-['Manrope']">
                Step 2 — Parent / Guardian & Emergency Contact Information
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                Confirm your family contact details and provide a reachable emergency contact
                person.
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
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#102B46] focus:outline-none"
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
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white focus:border-[#102B46] focus:outline-none"
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
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#102B46] focus:outline-none"
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
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#102B46] focus:outline-none"
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
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#102B46] focus:outline-none"
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
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#102B46] focus:outline-none"
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
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#102B46] focus:outline-none"
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
                    className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#102B46] focus:outline-none"
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
                    className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#102B46] focus:outline-none"
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
                    className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#102B46] focus:outline-none"
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
                Step 3 — Previous School Information
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                {isCreche
                  ? 'Previous schooling is optional for Creche entrants. Tick the option below if this is your child’s first school experience.'
                  : 'Provide details of the child’s current or most recent school (or indicate first-time schooling).'}
              </p>
            </div>

            <label className="flex items-start gap-3 bg-[#F5F3ED] border border-slate-200 rounded-2xl p-4 cursor-pointer min-h-[44px]">
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
                      className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#102B46] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#102B46] mb-1.5">
                      Last Class Attended
                    </label>
                    <input
                      type="text"
                      value={form.previous_class}
                      onChange={(e) => updateField('previous_class', e.target.value)}
                      placeholder="e.g. Nursery 2 / Primary 3 / JSS 1"
                      className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#102B46] focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#102B46] mb-1.5">
                      Previous School Address
                    </label>
                    <input
                      type="text"
                      value={form.previous_school_address}
                      onChange={(e) => updateField('previous_school_address', e.target.value)}
                      placeholder="City / address of previous school"
                      className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#102B46] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#102B46] mb-1.5">
                      Reason for Leaving (Optional)
                    </label>
                    <input
                      type="text"
                      value={form.reason_for_leaving}
                      onChange={(e) => updateField('reason_for_leaving', e.target.value)}
                      placeholder="e.g. Relocation / Progression to Secondary"
                      className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#102B46] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Additional & Medical Information + Optional Supporting Documents */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-extrabold text-[#102B46] font-['Manrope']">
                Step 4 — Additional Origin, Health & Supporting Documents
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                Medical records are stored in a restricted database table accessible only to you,
                the Admissions Office, and authorized school leadership/health personnel.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#102B46] mb-1.5">
                  Nationality
                </label>
                <input
                  type="text"
                  value={form.child_nationality}
                  onChange={(e) => updateField('child_nationality', e.target.value)}
                  placeholder="Nigerian"
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#102B46] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#102B46] mb-1.5">
                  State of Origin
                </label>
                <input
                  type="text"
                  value={form.child_state_of_origin}
                  onChange={(e) => updateField('child_state_of_origin', e.target.value)}
                  placeholder="e.g. Lagos / Ogun / Anambra"
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#102B46] focus:outline-none"
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
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#102B46] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#102B46] mb-1.5">
                  Blood Group
                </label>
                <select
                  value={form.blood_group}
                  onChange={(e) => updateField('blood_group', e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white focus:border-[#102B46] focus:outline-none"
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
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white focus:border-[#102B46] focus:outline-none"
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
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#102B46] focus:outline-none"
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

            {/* Optional Digital Supporting Document Uploads */}
            <div className="bg-[#F5F3ED] border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
              <div>
                <h4 className="text-sm font-extrabold text-[#102B46] font-['Manrope']">
                  Supporting Documents (Optional Digital Pre-Upload)
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Optionally attach scans/photos of your child&apos;s Birth Certificate, Report Card,
                  or Immunization Card (PDF, JPG, PNG, WebP, max 10 MB each). Original hardcopies are
                  still verified at the Admissions Office.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <select
                  value={selectedDocType}
                  onChange={(e) =>
                    setSelectedDocType(e.target.value as AdmissionDocumentType)
                  }
                  className="w-full sm:w-auto min-h-[44px] rounded-xl border border-slate-300 px-3.5 py-2 text-xs sm:text-sm bg-white"
                >
                  <option value="birth_certificate">Birth Certificate / Age Declaration</option>
                  <option value="previous_report_card">Previous School Report Card</option>
                  <option value="transfer_certificate">Transfer Certificate</option>
                  <option value="medical_report">Immunization / Medical Record</option>
                  <option value="other">Other Supporting Document</option>
                </select>

                <label className="inline-flex items-center justify-center gap-2 px-4 min-h-[44px] rounded-xl bg-[#102B46] hover:bg-[#091C30] text-white text-xs font-bold cursor-pointer transition-colors shrink-0">
                  {isUploadingDoc ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#D9B76A]" />
                  ) : (
                    <Upload className="w-4 h-4 text-[#D9B76A]" />
                  )}
                  <span>{isUploadingDoc ? 'Uploading...' : 'Attach Document'}</span>
                  <input
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    disabled={isUploadingDoc || isSubmitting}
                    onChange={(e) => void handleSupportingDocUpload(e)}
                    className="sr-only"
                  />
                </label>
              </div>

              {supportingDocs.length > 0 && (
                <div className="space-y-2">
                  {supportingDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-[#102B46] truncate">
                          {DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {doc.file_name}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {docSignedUrls[doc.id] && (
                          <a
                            href={docSignedUrls[doc.id]}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#F5F3ED] text-[#102B46] font-bold hover:bg-slate-200"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>View</span>
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => void handleDeleteDocument(doc)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 font-bold hover:bg-red-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 5: Review & Submit */}
        {step === 5 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-extrabold text-[#102B46] font-['Manrope']">
                Step 5 — Review Application & Submit
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                Confirm all details before submitting. Use any section&apos;s Edit button to make
                updates before submission.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
              {/* Step 1 Summary */}
              <div className="bg-[#F5F3ED] rounded-2xl border border-slate-200 p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-extrabold text-[#102B46]">1. Child Information</span>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#102B46] hover:text-[#D9B76A]"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                </div>
                <p>
                  <strong>Name:</strong>{' '}
                  {[form.child_first_name, form.child_middle_name, form.child_last_name]
                    .filter(Boolean)
                    .join(' ') || '—'}
                </p>
                <p>
                  <strong>DOB &amp; Gender:</strong> {form.child_date_of_birth || '—'} (
                  {form.child_gender})
                </p>
                <p>
                  <strong>Placement:</strong> {selectedSection?.name || '—'} •{' '}
                  {selectedClassLevel?.name || '—'} ({selectedSession?.name || '—'})
                </p>
                <p>
                  <strong>Passport Photo:</strong>{' '}
                  {passportSignedUrl ? 'Uploaded to private storage' : 'Not uploaded (can affix on printed form)'}
                </p>
              </div>

              {/* Step 2 Summary */}
              <div className="bg-[#F5F3ED] rounded-2xl border border-slate-200 p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-extrabold text-[#102B46]">
                    2. Parent &amp; Emergency Contact
                  </span>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#102B46] hover:text-[#D9B76A]"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                </div>
                <p>
                  <strong>Parent / Guardian:</strong> {form.parent_full_name} (
                  {form.parent_relationship})
                </p>
                <p>
                  <strong>Contact:</strong> {form.parent_phone} • {form.parent_email}
                </p>
                <p>
                  <strong>Address:</strong> {form.residential_address}
                </p>
                <p>
                  <strong>Emergency:</strong> {form.emergency_contact_name} (
                  {form.emergency_contact_phone})
                </p>
              </div>

              {/* Step 3 Summary */}
              <div className="bg-[#F5F3ED] rounded-2xl border border-slate-200 p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-extrabold text-[#102B46]">3. Previous School</span>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#102B46] hover:text-[#D9B76A]"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                </div>
                {form.is_first_time_schooling ? (
                  <p>First-time school / Creche entrant</p>
                ) : (
                  <>
                    <p>
                      <strong>School:</strong> {form.previous_school_name || '—'} (
                      {form.previous_class || 'N/A'})
                    </p>
                    {form.previous_school_address && (
                      <p>
                        <strong>Address:</strong> {form.previous_school_address}
                      </p>
                    )}
                    {form.reason_for_leaving && (
                      <p>
                        <strong>Reason for Leaving:</strong> {form.reason_for_leaving}
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Step 4 Summary */}
              <div className="bg-[#F5F3ED] rounded-2xl border border-slate-200 p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-extrabold text-[#102B46]">
                    4. Medical, Origin &amp; Fee
                  </span>
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#102B46] hover:text-[#D9B76A]"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                </div>
                <p>
                  <strong>Origin:</strong>{' '}
                  {[form.child_nationality, form.child_state_of_origin, form.child_lga]
                    .filter(Boolean)
                    .join(' / ') || 'Nigerian'}
                </p>
                <p>
                  <strong>Health:</strong>{' '}
                  {[form.blood_group, form.genotype, form.allergies]
                    .filter(Boolean)
                    .join(' • ') || 'No allergies or conditions stated'}
                </p>
                <p>
                  <strong>Uploaded Supporting Docs:</strong> {supportingDocs.length} attached
                </p>
                <p>
                  <strong>Application Fee:</strong>{' '}
                  {formattedFee
                    ? `${formattedFee} (Paystack verification in Phase 5)`
                    : 'Fee configuration pending General Administrator setup'}
                </p>
              </div>
            </div>

            {duplicateWarning && (
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 space-y-3 text-xs sm:text-sm text-amber-950">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <span>{duplicateWarning}</span>
                </div>
                <label className="flex items-center gap-2.5 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={duplicateConfirmed}
                    onChange={(e) => setDuplicateConfirmed(e.target.checked)}
                    className="rounded border-amber-400 text-[#102B46]"
                  />
                  <span>Yes, submit this additional application intentionally</span>
                </label>
              </div>
            )}

            <div className="border border-slate-300 rounded-2xl p-5 space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.declaration_accepted}
                  onChange={(e) => updateField('declaration_accepted', e.target.checked)}
                  className="mt-1 rounded border-slate-300 text-[#102B46] focus:ring-[#102B46]"
                />
                <span className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  I confirm that all information supplied in this admission application is accurate
                  and complete. I understand that after completing application fee payment
                  verification, I must print, sign, and physically submit the official A4 form with
                  original supporting documents at Father Abraham Children Academy.
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
                  className="w-full min-h-[44px] sm:max-w-md rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#102B46] focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Action Footer */}
        <div className="pt-5 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {step > 1 && (
              <button
                type="button"
                onClick={() => {
                  setValidationError(null);
                  setStep((s) => Math.max(1, s - 1));
                }}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-4 min-h-[44px] rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => void handleDraftSave()}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 min-h-[44px] rounded-xl border border-[#102B46]/30 bg-[#F5F3ED] hover:bg-[#e8e3d6] text-[#102B46] font-bold text-xs sm:text-sm disabled:opacity-50"
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
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 min-h-[44px] rounded-xl bg-[#102B46] hover:bg-[#091C30] text-white font-bold text-sm"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4 text-[#D9B76A]" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 min-h-[44px] rounded-xl bg-[#15803D] hover:bg-emerald-800 text-white font-bold text-sm shadow-sm disabled:opacity-50"
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
