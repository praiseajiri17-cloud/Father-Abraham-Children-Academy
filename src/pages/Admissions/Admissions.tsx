import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { SectionHeading } from '../../components/common/SectionHeading';
import { CheckCircle2, ChevronDown, ArrowRight, Phone, Mail, FileText } from 'lucide-react';
import { FAQS } from '../../constants/data';
import { usePublicSchoolSettings } from '../../hooks/usePublicSchoolSettings';

export const Admissions: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const { contactInfo } = usePublicSchoolSettings();

  const steps = [
    {
      num: '01',
      title: 'Create Parent Account & Apply',
      desc: 'Register or sign into your family account and complete the online admission form for each child.',
    },
    {
      num: '02',
      title: 'Fee & Form Printout',
      desc: 'Complete admission processing and download the official A4 application form for physical submission.',
    },
    {
      num: '03',
      title: 'Document Check & Assessment',
      desc: 'Submit required supporting documents physically at the school for verification and assessment.',
    },
    {
      num: '04',
      title: 'Admission Decision',
      desc: 'Track application progress directly inside your Parent Portal and receive official updates.',
    },
  ];

  const requirements = [
    'Printed official online application form',
    'Copy of birth certificate or international passport',
    'Last two terms report cards from previous school (if applicable)',
    'Two recent passport photographs',
    'Medical fitness report from a recognized hospital',
    'Transfer certificate (for primary & secondary transfers)',
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="Admissions"
        subtitle="Begin your child’s admission journey for Creche, Primary, and Secondary sections."
        breadcrumbs={[{ name: 'Admissions' }]}
      />

      {/* Admission Process */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            subtitle="Admission Procedure"
            title="4 Simple Steps to Enrolling Your Child"
            description="We have streamlined our admission process to be transparent, welcoming, and straightforward for families."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((s, idx) => (
              <div
                key={idx}
                className="bg-[#F5F3ED] p-8 rounded-3xl border border-slate-200 flex flex-col gap-4 relative group hover:bg-[#102B46] hover:text-white transition-all duration-300"
              >
                <div className="text-3xl font-extrabold text-[#D9B76A] font-['Manrope']">
                  {s.num}
                </div>
                <h3 className="text-xl font-bold text-[#102B46] group-hover:text-white font-['Manrope']">
                  {s.title}
                </h3>
                <p className="text-slate-600 group-hover:text-slate-300 text-sm leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Requirements & Online Portal CTA */}
      <section className="py-20 bg-[#F5F3ED]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Requirements list */}
            <div className="lg:col-span-6 bg-white p-8 sm:p-10 rounded-3xl shadow-lg border border-slate-200 flex flex-col gap-6">
              <span className="px-3 py-1 bg-[#102B46]/10 text-[#102B46] text-xs font-bold uppercase tracking-widest rounded-full w-max">
                Prerequisites
              </span>
              <h3 className="text-2xl font-bold text-[#102B46] font-['Manrope']">
                General Admission Requirements
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Please prepare the following supporting documents for physical verification after
                submitting your online application:
              </p>
              <ul className="flex flex-col gap-3">
                {requirements.map((req, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-slate-700">
                    <CheckCircle2 className="w-5 h-5 text-[#15803D] shrink-0 mt-0.5" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Online Admission CTA */}
            <div className="lg:col-span-6 bg-[#102B46] text-white p-8 sm:p-10 rounded-3xl shadow-lg border-2 border-[#D9B76A]/40 flex flex-col justify-between gap-6">
              <div>
                <span className="px-3 py-1 bg-[#D9B76A] text-[#102B46] text-xs font-bold uppercase tracking-widest rounded-full">
                  Parent Portal Admissions
                </span>
                <h3 className="text-2xl font-bold text-white font-['Manrope'] mt-4 mb-3">
                  Apply Online for Your Children
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed mb-6">
                  Start an online admission application directly through the Parent &amp; Guardian
                  Portal. One family account lets you manage applications for multiple children,
                  save drafts, and track every stage of review.
                </p>

                {contactInfo?.configured && (contactInfo.phone || contactInfo.email) && (
                  <div className="flex flex-col gap-3 text-sm text-slate-300 mb-6">
                    {contactInfo.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-[#D9B76A]" />
                        <span>{contactInfo.phone}</span>
                      </div>
                    )}
                    {contactInfo.email && (
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-[#D9B76A]" />
                        <span>{contactInfo.email}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <NavLink
                  to="/apply"
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-[#D9B76A] hover:bg-[#c9a658] text-[#102B46] px-6 py-3.5 rounded-xl font-extrabold text-sm transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  <span>Apply Now</span>
                  <ArrowRight className="w-4 h-4" />
                </NavLink>
                <NavLink
                  to="/contact"
                  className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-5 py-3.5 rounded-xl font-bold text-sm transition-colors"
                >
                  <span>Contact Admissions</span>
                </NavLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQs Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            subtitle="Got Questions?"
            title="Frequently Asked Questions"
            description="Find clear answers to common questions regarding admissions, schedules, and school operations."
          />

          <div className="flex flex-col gap-4">
            {FAQS.map((faq, idx) => (
              <div
                key={idx}
                className="bg-[#F5F3ED] rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-6 text-left font-bold text-[#102B46] hover:bg-white/60 transition-colors font-['Manrope']"
                >
                  <span className="text-base">{faq.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-[#D9B76A] transition-transform ${
                      openFaq === idx ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-6 text-slate-600 text-sm leading-relaxed border-t border-slate-200/70 pt-4 animate-fadeIn">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
