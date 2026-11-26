import React, { useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { SectionHeading } from '../../components/common/SectionHeading';
import { CheckCircle2, ChevronDown, FileText, Send, AlertCircle, Phone, Mail } from 'lucide-react';
import { FAQS, SCHOOL_INFO } from '../../constants/data';
import { AdmissionFormValues } from '../../types';

export const Admissions: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState<AdmissionFormValues>({
    parentName: '',
    email: '',
    phone: '',
    childName: '',
    childDob: '',
    level: 'primary',
    previousSchool: '',
    message: ''
  });
  const [error, setError] = useState('');

  const steps = [
    { num: '01', title: 'Submit Enquiry or Form', desc: 'Fill out our online application enquiry form or visit our campus to collect physical registration forms.' },
    { num: '02', title: 'Entrance Assessment', desc: 'The candidate undergoes a friendly, age-appropriate aptitude assessment and interview session.' },
    { num: '03', title: 'Admission Offer', desc: 'Successful candidates receive an official admission letter and fee schedule package.' },
    { num: '04', title: 'Enrollment & Uniform', desc: 'Complete registration formalities, purchase books/uniforms, and welcome your child to the academy.' }
  ];

  const requirements = [
    'Completed application form',
    'Copy of birth certificate or international passport',
    'Last two terms report cards from previous school (if applicable)',
    'Two recent passport photographs',
    'Medical fitness report from a recognized hospital',
    'Transfer certificate (for primary & secondary transfers)'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.parentName || !formData.email || !formData.phone || !formData.childName) {
      setError('Please fill in all required fields.');
      return;
    }
    setError('');
    setFormSubmitted(true);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="Admissions 2026/2027"
        subtitle="Join our community of academic excellence. Applications are now open for Creche, Primary, and Secondary sections."
        breadcrumbs={[{ name: 'Admissions' }]}
      />

      {/* Admission Process */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            subtitle="Admission Procedure"
            title="4 Simple Steps to Enrolling Your Child"
            description="We have streamlined our admission process to be transparent, welcoming, and straightforward for parents."
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

      {/* Requirements & Info */}
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
                To complete your child’s enrollment for the upcoming academic session, please ensure the following documents and criteria are prepared:
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

            {/* Physical Registration Note */}
            <div className="lg:col-span-6 bg-[#102B46] text-white p-8 sm:p-10 rounded-3xl shadow-lg border-2 border-[#D9B76A]/40 flex flex-col justify-between gap-6">
              <div>
                <span className="px-3 py-1 bg-[#D9B76A] text-[#102B46] text-xs font-bold uppercase tracking-widest rounded-full">
                  Campus Visit
                </span>
                <h3 className="text-2xl font-bold text-white font-['Manrope'] mt-4 mb-3">
                  Physical Registration & Campus Tours
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed mb-6">
                  Parents and guardians are warmly invited to tour our state-of-the-art facilities. Our admissions officers are available on weekdays to conduct guided tours and assist with physical registration forms.
                </p>
                <div className="flex flex-col gap-3 text-sm text-slate-300">
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-[#D9B76A]" />
                    <span>{SCHOOL_INFO.phone}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-[#D9B76A]" />
                    <span>{SCHOOL_INFO.email}</span>
                  </div>
                </div>
              </div>
              <div className="bg-white/10 p-4 rounded-2xl border border-white/10 text-xs text-slate-300">
                <strong>Note:</strong> School prospectus and fee schedules are handed out during campus visits.
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Online Application Enquiry Form */}
      <section className="py-20 bg-white" id="apply">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            subtitle="Online Application"
            title="Admission Enquiry & Application Form"
            description="Fill out the preliminary form below. Our admissions office will contact you within 24 hours."
          />

          <div className="bg-[#F5F3ED] p-8 sm:p-12 rounded-3xl shadow-xl border border-slate-200">
            {formSubmitted ? (
              <div className="bg-emerald-50 border border-emerald-200 p-8 rounded-2xl text-center flex flex-col items-center gap-4 animate-fadeIn">
                <CheckCircle2 className="w-16 h-16 text-[#15803D]" />
                <h3 className="text-2xl font-bold text-[#102B46] font-['Manrope']">Enquiry Received Successfully!</h3>
                <p className="text-slate-600 text-sm max-w-md leading-relaxed">
                  Thank you, <strong>{formData.parentName}</strong>. Your application enquiry for <strong>{formData.childName}</strong> has been recorded.
                </p>
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs text-amber-800 flex items-center gap-2 mt-2">
                  <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
                  <span>Phase 1 Notice: Backend database storage will be fully activated in Phase 2 via Supabase integration. Our team has noted your submission preview.</span>
                </div>
                <button
                  onClick={() => { setFormSubmitted(false); setFormData({ parentName: '', email: '', phone: '', childName: '', childDob: '', level: 'primary', previousSchool: '', message: '' }); }}
                  className="mt-4 bg-[#102B46] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-[#091C30]"
                >
                  Submit Another Enquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#102B46]">
                      Parent / Guardian Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.parentName}
                      onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                      placeholder="e.g. Mr. & Mrs. Johnson"
                      className="px-4 py-3 rounded-xl bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#102B46] text-sm"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#102B46]">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. parent@example.com"
                      className="px-4 py-3 rounded-xl bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#102B46] text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#102B46]">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="e.g. +234 800 000 0000"
                      className="px-4 py-3 rounded-xl bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#102B46] text-sm"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#102B46]">
                      Child's Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.childName}
                      onChange={(e) => setFormData({ ...formData, childName: e.target.value })}
                      placeholder="e.g. David Johnson"
                      className="px-4 py-3 rounded-xl bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#102B46] text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#102B46]">
                      Child's Date of Birth *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.childDob}
                      onChange={(e) => setFormData({ ...formData, childDob: e.target.value })}
                      className="px-4 py-3 rounded-xl bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#102B46] text-sm"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#102B46]">
                      Requested Educational Level *
                    </label>
                    <select
                      value={formData.level}
                      onChange={(e) => setFormData({ ...formData, level: e.target.value as any })}
                      className="px-4 py-3 rounded-xl bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#102B46] text-sm font-medium text-[#102B46]"
                    >
                      <option value="creche">Creche (Ages 3m - 2 yrs)</option>
                      <option value="primary">Primary School (Ages 5 - 10 yrs)</option>
                      <option value="secondary">Secondary School (Ages 11 - 17 yrs)</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#102B46]">
                    Previous School Attended (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.previousSchool}
                    onChange={(e) => setFormData({ ...formData, previousSchool: e.target.value })}
                    placeholder="e.g. Previous Academy Name"
                    className="px-4 py-3 rounded-xl bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#102B46] text-sm"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#102B46]">
                    Additional Message or Inquiries
                  </label>
                  <textarea
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Mention any specific questions regarding transport, boarding, or admission assessments..."
                    className="px-4 py-3 rounded-xl bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#102B46] text-sm"
                  ></textarea>
                </div>

                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
                  <span>Phase 1 Notice: Frontend validation is active. Database storage & email notifications will connect via Supabase in Phase 2.</span>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#102B46] hover:bg-[#091C30] text-white py-4 rounded-xl font-extrabold text-base shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <span>Submit Admission Enquiry</span>
                  <Send className="w-5 h-5 text-[#D9B76A]" />
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* FAQs Section */}
      <section className="py-20 bg-[#F5F3ED]">
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
                className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-6 text-left font-bold text-[#102B46] hover:bg-slate-50 transition-colors font-['Manrope']"
                >
                  <span className="text-base">{faq.question}</span>
                  <ChevronDown className={`w-5 h-5 text-[#D9B76A] transition-transform ${openFaq === idx ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-6 text-slate-600 text-sm leading-relaxed border-t border-slate-100 pt-4 animate-fadeIn">
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
