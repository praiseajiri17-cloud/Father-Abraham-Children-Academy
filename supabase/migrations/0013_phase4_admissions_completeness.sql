-- ============================================================================
-- 0013_phase4_admissions_completeness.sql
-- Phase 4 Completeness:
-- 1. Optional `reason_for_leaving` column on admission_applications
-- 2. Controlled deletion RLS for editable application documents & storage
-- 3. Parent update access for editable uploaded document records
-- ============================================================================

-- 1. Optional reason for leaving previous school (Step 3)
ALTER TABLE public.admission_applications
  ADD COLUMN IF NOT EXISTS reason_for_leaving TEXT;

-- 2. Allow applicants to delete their own uploaded documents while editable
DROP POLICY IF EXISTS admission_docs_delete_own_editable_or_officer ON public.admission_documents;
CREATE POLICY admission_docs_delete_own_editable_or_officer ON public.admission_documents
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admission_applications aa
      WHERE aa.id = admission_documents.application_id
        AND aa.applicant_profile_id = public.current_profile_id()
        AND aa.application_status IN ('draft', 'submitted', 'pending', 'correction_requested')
    )
    OR public.has_permission('admissions.review')
    OR public.is_general_admin()
  );

GRANT DELETE ON public.admission_documents TO authenticated;

-- 3. Allow authenticated parents (for editable applications) and admissions staff
--    to remove replaced objects in private `admission-documents` storage bucket
DROP POLICY IF EXISTS storage_admission_docs_delete ON storage.objects;
CREATE POLICY storage_admission_docs_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'admission-documents'
    AND (
      public.is_general_admin()
      OR public.has_permission('admissions.review')
      OR EXISTS (
        SELECT 1
        FROM public.admission_applications aa
        WHERE aa.id = public.storage_object_folder_uuid(name)
          AND aa.applicant_profile_id = public.current_profile_id()
          AND aa.application_status IN ('draft', 'submitted', 'pending', 'correction_requested')
      )
    )
  );
