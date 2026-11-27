import { jsPDF } from 'jspdf';
import { SCHOOL_INFO } from '../constants/data';
import {
  AdmissionApplicationExpanded,
  PHYSICAL_DOCUMENT_CHECKLIST_ITEMS,
} from '../types/admissions';
import { formatNairaFromKobo } from '../services/admissionsService';

async function loadImageAsJpegDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.crossOrigin = 'anonymous';
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('Image load failed'));
        el.src = objectUrl;
      });
      const canvas = document.createElement('canvas');
      const targetW = 350;
      const targetH = 420;
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetW, targetH);

      const scale = Math.max(targetW / img.width, targetH / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const offsetX = (targetW - drawW) / 2;
      const offsetY = (targetH - drawH) / 2;
      ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

      return canvas.toDataURL('image/jpeg', 0.9);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return null;
  }
}

/**
 * Generates and downloads an official A4 Admission Application Form PDF
 * for Father Abraham Children Academy.
 *
 * SECURITY / PAYMENT ENFORCEMENT:
 * Strictly refuses to generate an official paid form unless `application.payment_status === 'paid'`.
 */
export async function downloadOfficialAdmissionPdf(
  application: AdmissionApplicationExpanded,
  contactInfo?: { address?: string | null; phone?: string | null; email?: string | null } | null,
  options?: { passportImageUrl?: string | null }
): Promise<void> {
  if (application.payment_status !== 'paid') {
    throw new Error(
      'Official Admission Form PDF cannot be downloaded until application fee payment is verified by the backend.'
    );
  }

  const passportDataUrl = options?.passportImageUrl
    ? await loadImageAsJpegDataUrl(options.passportImageUrl)
    : null;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;

  const NAVY: [number, number, number] = [16, 43, 70];
  const GOLD: [number, number, number] = [217, 183, 106];
  const DARK: [number, number, number] = [15, 23, 42];
  const MUTED: [number, number, number] = [100, 116, 139];
  const CREAM: [number, number, number] = [245, 243, 237];
  const GREEN: [number, number, number] = [21, 128, 61];

  let y = 14;

  const drawSchoolCrestVector = (cx: number, topY: number) => {
    // Shield outline matching Logo.tsx (#102B46 shield + #D9B76A gold border)
    doc.setFillColor(...NAVY);
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.7);
    doc.roundedRect(cx - 9, topY, 18, 19, 2, 2, 'FD');

    // Bottom gold diamond point
    doc.setFillColor(...GOLD);
    doc.triangle(cx - 2.6, topY + 19, cx + 2.6, topY + 19, cx, topY + 21.8, 'F');

    // Flame emblem at top center
    doc.setFillColor(...GOLD);
    doc.circle(cx, topY + 4.3, 1.7, 'F');

    // Open book lines
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.6);
    doc.rect(cx - 5, topY + 8, 10, 6.2);
    doc.setDrawColor(...GOLD);
    doc.line(cx, topY + 8, cx, topY + 14.2);

    // Award dot
    doc.setFillColor(...GOLD);
    doc.circle(cx, topY + 16.5, 1.1, 'F');
    doc.setLineWidth(0.2);
  };

  const drawHeader = () => {
    doc.setFillColor(...NAVY);
    doc.rect(marginX, 12, contentWidth, 30, 'F');
    doc.setFillColor(...GOLD);
    doc.rect(marginX, 41, contentWidth, 1.5, 'F');

    drawSchoolCrestVector(marginX + 14, 15.2);

    // School Details
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13.5);
    doc.text(SCHOOL_INFO.name.toUpperCase(), marginX + 29, 20.5);

    doc.setTextColor(...GOLD);
    doc.setFontSize(7.5);
    doc.text(SCHOOL_INFO.levels, marginX + 29, 25);

    doc.setTextColor(226, 232, 240);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    if (contactInfo?.address) {
      doc.text(contactInfo.address, marginX + 29, 30.5);
    }
    const contactLine = [
      contactInfo?.phone ? `Tel: ${contactInfo.phone}` : '',
      contactInfo?.email ? `Email: ${contactInfo.email}` : '',
    ]
      .filter(Boolean)
      .join('  |  ');
    if (contactLine) {
      doc.text(contactLine, marginX + 29, 35);
    }
    doc.text(
      `Portal: ${typeof window !== 'undefined' ? window.location.origin : 'Online Admissions Portal'}`,
      marginX + 29,
      39
    );

    y = 48;
  };

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageHeight - 18) {
      doc.addPage();
      y = 16;
    }
  };

  const drawSectionBanner = (title: string) => {
    ensureSpace(12);
    doc.setFillColor(...CREAM);
    doc.setDrawColor(...NAVY);
    doc.rect(marginX, y, contentWidth, 7, 'FD');
    doc.setTextColor(...NAVY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(title.toUpperCase(), marginX + 4, y + 4.8);
    y += 10;
  };

  const drawFieldRow = (
    items: Array<{ label: string; value: string; widthFraction: number }>
  ) => {
    ensureSpace(12);
    let cursorX = marginX;
    let maxRowHeight = 9;

    const prepared = items.map((item) => {
      const boxW = contentWidth * item.widthFraction - 2;
      const lines = doc.splitTextToSize(item.value || '—', boxW - 3) as string[];
      const neededH = Math.max(9, 4.5 + lines.length * 4);
      if (neededH > maxRowHeight) maxRowHeight = neededH;
      return { ...item, boxW, lines };
    });

    prepared.forEach((item, idx) => {
      const gap = idx < prepared.length - 1 ? 2 : 0;
      const w = item.boxW + (idx === prepared.length - 1 ? 2 : 0);
      doc.setDrawColor(203, 213, 225);
      doc.rect(cursorX, y, w, maxRowHeight);
      doc.setTextColor(...MUTED);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.text(item.label.toUpperCase(), cursorX + 2, y + 3.4);

      doc.setTextColor(...DARK);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(item.lines, cursorX + 2, y + 7.2);

      cursorX += w + gap;
    });

    y += maxRowHeight + 2;
  };

  // Page 1
  drawHeader();

  // Form Title + Verified Payment Badge + Passport Box
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('OFFICIAL ADMISSION APPLICATION FORM', marginX, y + 4);

  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(...GREEN);
  doc.roundedRect(marginX, y + 7, 138, 12, 1.5, 1.5, 'FD');
  doc.setTextColor(...GREEN);
  doc.setFontSize(8);
  doc.text('APPLICATION FEE PAYMENT VERIFIED', marginX + 3, y + 12);
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const feeDisplay = formatNairaFromKobo(application.application_fee_kobo) ?? 'Verified Amount';
  doc.text(
    `Ref: ${application.payment_reference || 'Verified'}  |  Amount: ${feeDisplay}  |  Paid: ${
      application.paid_at ? new Date(application.paid_at).toLocaleDateString('en-NG') : 'Confirmed'
    }`,
    marginX + 3,
    y + 16.5
  );

  // Passport Photo Box (Right side)
  const photoX = pageWidth - marginX - 35;
  const photoY = y - 1;
  doc.setDrawColor(...NAVY);
  doc.setFillColor(248, 250, 252);
  doc.rect(photoX, photoY, 35, 41, 'FD');
  if (passportDataUrl) {
    doc.addImage(passportDataUrl, 'JPEG', photoX + 0.6, photoY + 0.6, 33.8, 39.8);
  } else {
    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('AFFIX RECENT', pageWidth - marginX - 17.5, y + 16, { align: 'center' });
    doc.text('PASSPORT', pageWidth - marginX - 17.5, y + 20, { align: 'center' });
    doc.text('PHOTOGRAPH', pageWidth - marginX - 17.5, y + 24, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.text('(35mm x 45mm)', pageWidth - marginX - 17.5, y + 29, { align: 'center' });
  }

  // Reference summary next to passport box
  y += 22;
  doc.setDrawColor(203, 213, 225);
  doc.rect(marginX, y, 138, 18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...NAVY);
  doc.text(`APPLICATION REFERENCE: ${application.application_reference}`, marginX + 3, y + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...DARK);
  doc.text(
    `Academic Session: ${application.academic_sessions?.name || '2026/2027'}   |   Status: ${application.application_status.toUpperCase()}`,
    marginX + 3,
    y + 10.5
  );
  doc.text(
    `Intended Section: ${application.school_sections?.name || '—'}   |   Intended Class: ${application.class_levels?.name || '—'}`,
    marginX + 3,
    y + 15
  );

  y += 22;

  // Section A: Child Info
  drawSectionBanner('Section A — Child / Applicant Information');
  drawFieldRow([
    { label: 'First Name', value: application.child_first_name, widthFraction: 0.33 },
    { label: 'Middle Name', value: application.child_middle_name || '—', widthFraction: 0.33 },
    { label: 'Surname / Last Name', value: application.child_last_name, widthFraction: 0.34 },
  ]);
  drawFieldRow([
    { label: 'Date of Birth', value: application.child_date_of_birth, widthFraction: 0.25 },
    { label: 'Gender', value: application.child_gender.toUpperCase(), widthFraction: 0.2 },
    { label: 'Nationality', value: application.child_nationality || 'Nigerian', widthFraction: 0.25 },
    {
      label: 'State / LGA of Origin',
      value: [application.child_state_of_origin, application.child_lga].filter(Boolean).join(' / ') || '—',
      widthFraction: 0.3,
    },
  ]);

  // Section B: Parent & Emergency Info
  drawSectionBanner('Section B — Parent / Guardian & Emergency Contact Information');
  drawFieldRow([
    { label: 'Parent / Guardian Full Name', value: application.parent_full_name || '—', widthFraction: 0.45 },
    { label: 'Relationship', value: application.parent_relationship || '—', widthFraction: 0.25 },
    { label: 'Occupation', value: application.parent_occupation || '—', widthFraction: 0.3 },
  ]);
  drawFieldRow([
    { label: 'Email Address', value: application.parent_email || '—', widthFraction: 0.45 },
    { label: 'Primary Phone', value: application.parent_phone || '—', widthFraction: 0.275 },
    { label: 'Alternate Phone', value: application.parent_alternate_phone || '—', widthFraction: 0.275 },
  ]);
  drawFieldRow([
    { label: 'Residential Address', value: application.residential_address || '—', widthFraction: 1 },
  ]);
  drawFieldRow([
    { label: 'Emergency Contact Name', value: application.emergency_contact_name || '—', widthFraction: 0.42 },
    { label: 'Emergency Phone', value: application.emergency_contact_phone || '—', widthFraction: 0.3 },
    { label: 'Relationship', value: application.emergency_contact_relationship || '—', widthFraction: 0.28 },
  ]);

  // Section C: Previous School Info
  drawSectionBanner('Section C — Previous School / Early Childhood Background');
  if (application.is_first_time_schooling) {
    drawFieldRow([
      {
        label: 'Prior Schooling Status',
        value: 'First-time school / Creche entrant (no prior formal school recorded).',
        widthFraction: 1,
      },
    ]);
  } else {
    drawFieldRow([
      { label: 'Previous School Name', value: application.previous_school_name || application.previous_school || '—', widthFraction: 0.65 },
      { label: 'Last Class Attended', value: application.previous_class || '—', widthFraction: 0.35 },
    ]);
    drawFieldRow([
      { label: 'Previous School Address', value: application.previous_school_address || '—', widthFraction: application.reason_for_leaving ? 0.55 : 1 },
      ...(application.reason_for_leaving
        ? [{ label: 'Reason for Leaving', value: application.reason_for_leaving, widthFraction: 0.45 }]
        : []),
    ]);
  }

  // Section D: Medical & Additional Information
  drawSectionBanner('Section D — Health, Allergies & Additional Care Notes');
  const med = application.medical_details;
  drawFieldRow([
    { label: 'Blood Group', value: med?.blood_group || '—', widthFraction: 0.2 },
    { label: 'Genotype', value: med?.genotype || '—', widthFraction: 0.2 },
    { label: 'Known Allergies', value: med?.allergies || 'None stated', widthFraction: 0.6 },
  ]);
  drawFieldRow([
    { label: 'Medical / Dietary / Learning Notes', value: [med?.chronic_conditions, med?.dietary_requirements, med?.special_learning_needs, med?.emergency_medical_notes].filter(Boolean).join(' | ') || 'None stated', widthFraction: 1 },
  ]);
  if (application.additional_details) {
    drawFieldRow([
      { label: 'Additional Information Provided by Parent', value: application.additional_details, widthFraction: 1 },
    ]);
  }

  // Section E: Parent Declaration
  drawSectionBanner('Section E — Parent / Guardian Declaration & Physical Submission Sign-Off');
  ensureSpace(34);
  doc.setDrawColor(203, 213, 225);
  doc.rect(marginX, y, contentWidth, 30);
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const declarationText = doc.splitTextToSize(
    'I solemnly declare that all information provided in this application form is accurate, complete, and true to the best of my knowledge. I agree to abide by the admission policies, code of conduct, and verification requirements of Father Abraham Children Academy, and I understand that submitting this signed printed form with original supporting documents is required for physical verification.',
    contentWidth - 6
  ) as string[];
  doc.text(declarationText, marginX + 3, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(
    `Electronic Signer: ${application.declaration_signer_name || application.parent_full_name || 'Parent / Guardian'}`,
    marginX + 3,
    y + 18
  );
  doc.text(
    `Submitted Online: ${application.submitted_at ? new Date(application.submitted_at).toLocaleString('en-NG') : '—'}`,
    marginX + 105,
    y + 18
  );
  doc.setFont('helvetica', 'normal');
  doc.text('Handwritten Signature: ____________________________________', marginX + 3, y + 26.5);
  doc.text('Date: ________________________', marginX + 125, y + 26.5);
  y += 35;

  // Section F: Official School Use Only
  ensureSpace(78);
  drawSectionBanner('Section F — For Official School Use Only (Admissions Office)');
  doc.setDrawColor(...NAVY);
  doc.rect(marginX, y, contentWidth, 68);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...NAVY);
  doc.text('PHYSICAL DOCUMENT VERIFICATION CHECKLIST (TICK UPON SUBMISSION AT SCHOOL):', marginX + 3, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(...DARK);
  PHYSICAL_DOCUMENT_CHECKLIST_ITEMS.forEach((item, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const xPos = marginX + 4 + col * 90;
    const yPos = y + 11 + row * 6;
    doc.rect(xPos, yPos - 3, 3.2, 3.2);
    doc.text(item, xPos + 5, yPos - 0.3);
  });

  doc.line(marginX + 3, y + 30, marginX + contentWidth - 3, y + 30);
  doc.setFont('helvetica', 'bold');
  doc.text('Received By (Staff Name & Signature): _______________________________________', marginX + 3, y + 36);
  doc.text('Date Received: _____________________', marginX + 125, y + 36);

  doc.text('Admission Officer Assessment / Remarks:', marginX + 3, y + 43);
  doc.line(marginX + 3, y + 49, marginX + contentWidth - 3, y + 49);
  doc.line(marginX + 3, y + 55, marginX + contentWidth - 3, y + 55);

  doc.text(
    'FINAL DECISION:   [  ] APPROVED     [  ] CORRECTION REQUESTED     [  ] NOT APPROVED     |     Official Stamp & Signature',
    marginX + 3,
    y + 63.5
  );

  // Add Page Numbers & Footer to all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, pageHeight - 13, pageWidth - marginX, pageHeight - 13);
    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(
      `${SCHOOL_INFO.name}  •  Official Admission Application Form (${application.application_reference})`,
      marginX,
      pageHeight - 8.5
    );
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - marginX, pageHeight - 8.5, { align: 'right' });
  }

  doc.save(`${application.application_reference}_Admission_Form.pdf`);
}
