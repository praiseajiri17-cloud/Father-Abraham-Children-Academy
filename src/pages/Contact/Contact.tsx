import React, { useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { SectionHeading } from '../../components/common/SectionHeading';
import { SCHOOL_INFO } from '../../constants/data';
import { ContactFormValues } from '../../types';
import { Phone, Mail, MapPin, Clock, Send, CheckCircle2, AlertCircle } from 'lucide-react';

export const Contact: React.FC = () => {
  const [formData, setFormData] = useState<ContactFormValues>({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      setError('Please fill in all required fields.');
      return;
    }
    setError('');
    setSubmitted(true);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="Contact Us"
        subtitle="Get in touch with our administrative office for inquiries, campus visits, or admissions assistance."
        breadcrumbs={[{ name: 'Contact' }]}
      />

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            {/* Contact Information & Map placeholder */}
            <div className="lg:col-span-5 flex flex-col gap-8">
              <div>
                <span className="px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-[#102B46]/10 text-[#102B46] mb-3 inline-block">
                  Get In Touch
                </span>
                <h2 className="text-3xl font-extrabold text-[#102B46] tracking-tight uppercase font-['Manrope'] mb-4">
                  We Would Love to Hear From You
                </h2>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Whether you have questions about our curriculum, admission requirements, or wish to schedule a campus tour, our friendly team is ready to assist you.
                </p>
              </div>

              <div className="flex flex-col gap-6">
                <div className="flex items-start gap-4 bg-[#F5F3ED] p-5 rounded-2xl border border-slate-200">
                  <div className="w-12 h-12 rounded-xl bg-[#102B46] text-[#D9B76A] flex items-center justify-center shrink-0">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#102B46] uppercase font-['Manrope'] mb-1">Physical Address</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{SCHOOL_INFO.address}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 bg-[#F5F3ED] p-5 rounded-2xl border border-slate-200">
                  <div className="w-12 h-12 rounded-xl bg-[#102B46] text-[#D9B76A] flex items-center justify-center shrink-0">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#102B46] uppercase font-['Manrope'] mb-1">Phone Number</h4>
                    <a href={`tel:${SCHOOL_INFO.phone}`} className="text-xs text-slate-600 hover:text-[#102B46] font-medium">{SCHOOL_INFO.phone}</a>
                  </div>
                </div>

                <div className="flex items-start gap-4 bg-[#F5F3ED] p-5 rounded-2xl border border-slate-200">
                  <div className="w-12 h-12 rounded-xl bg-[#102B46] text-[#D9B76A] flex items-center justify-center shrink-0">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#102B46] uppercase font-['Manrope'] mb-1">Email Address</h4>
                    <a href={`mailto:${SCHOOL_INFO.email}`} className="text-xs text-slate-600 hover:text-[#102B46] font-medium">{SCHOOL_INFO.email}</a>
                  </div>
                </div>

                <div className="flex items-start gap-4 bg-[#F5F3ED] p-5 rounded-2xl border border-slate-200">
                  <div className="w-12 h-12 rounded-xl bg-[#102B46] text-[#D9B76A] flex items-center justify-center shrink-0">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#102B46] uppercase font-['Manrope'] mb-1">Opening Hours</h4>
                    <p className="text-xs text-slate-600">{SCHOOL_INFO.hours}</p>
                  </div>
                </div>
              </div>

            </div>

            {/* Contact Form */}
            <div className="lg:col-span-7 bg-[#F5F3ED] p-8 sm:p-12 rounded-3xl shadow-xl border border-slate-200">
              <h3 className="text-2xl font-bold text-[#102B46] font-['Manrope'] mb-6">
                Send Us a Message
              </h3>

              {submitted ? (
                <div className="bg-emerald-50 border border-emerald-200 p-8 rounded-2xl text-center flex flex-col items-center gap-4 animate-fadeIn">
                  <CheckCircle2 className="w-16 h-16 text-[#15803D]" />
                  <h4 className="text-2xl font-bold text-[#102B46] font-['Manrope']">Message Sent Successfully!</h4>
                  <p className="text-slate-600 text-sm max-w-md leading-relaxed">
                    Thank you, <strong>{formData.name}</strong>. Your message has been received by our administrative office.
                  </p>
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs text-amber-800 flex items-center gap-2 mt-2">
                    <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
                    <span>Phase 1 Notice: Message routing via backend API will be enabled in Phase 2.</span>
                  </div>
                  <button
                    onClick={() => { setSubmitted(false); setFormData({ name: '', email: '', phone: '', subject: '', message: '' }); }}
                    className="mt-4 bg-[#102B46] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-[#091C30]"
                  >
                    Send Another Message
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
                        Your Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. John Doe"
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
                        placeholder="e.g. john@example.com"
                        className="px-4 py-3 rounded-xl bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#102B46] text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#102B46]">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="e.g. +234 800 000 0000"
                        className="px-4 py-3 rounded-xl bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#102B46] text-sm"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#102B46]">
                        Subject
                      </label>
                      <input
                        type="text"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        placeholder="e.g. Campus Tour Booking"
                        className="px-4 py-3 rounded-xl bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#102B46] text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#102B46]">
                      Message *
                    </label>
                    <textarea
                      rows={5}
                      required
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Write your message or inquiry here..."
                      className="px-4 py-3 rounded-xl bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#102B46] text-sm"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#102B46] hover:bg-[#091C30] text-white py-4 rounded-xl font-extrabold text-base shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <span>Send Message</span>
                    <Send className="w-5 h-5 text-[#D9B76A]" />
                  </button>
                </form>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* Map Placeholder */}
      <section className="bg-slate-200 h-96 relative flex items-center justify-center">
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#102B46_1px,transparent_1px)] [background-size:20px_20px]"></div>
        <div className="relative z-10 bg-white/90 backdrop-blur-md p-8 rounded-3xl shadow-xl text-center max-w-md mx-4 border border-slate-300">
          <MapPin className="w-10 h-10 text-[#102B46] mx-auto mb-3 animate-bounce" />
          <h4 className="text-lg font-bold text-[#102B46] font-['Manrope'] mb-1">Father Abraham Children Academy</h4>
          <p className="text-xs text-slate-600 mb-4">{SCHOOL_INFO.address}</p>
          <span className="inline-block bg-[#D9B76A] text-[#102B46] text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider">
            Interactive Campus Map Placeholder
          </span>
        </div>
      </section>

    </div>
  );
};
