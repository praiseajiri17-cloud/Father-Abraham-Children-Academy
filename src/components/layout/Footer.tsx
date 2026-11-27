import React from 'react';
import { NavLink } from 'react-router-dom';
import { Phone, Mail, MapPin, ArrowRight } from 'lucide-react';
import { Logo } from '../branding/Logo';
import { SCHOOL_INFO } from '../../constants/data';
import { usePublicSchoolSettings } from '../../hooks/usePublicSchoolSettings';

export const Footer: React.FC = () => {
  const { contactInfo } = usePublicSchoolSettings();
  const hasVerifiedContact = Boolean(
    contactInfo?.configured &&
      (contactInfo.address || contactInfo.phone || contactInfo.email || contactInfo.hours)
  );

  return (
    <footer className="bg-[#091C30] text-slate-300 pt-16 pb-8 border-t-4 border-[#D9B76A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 pb-12 border-b border-slate-800">
          {/* Col 1: About / Brand */}
          <div className="flex flex-col gap-4">
            <Logo variant="horizontal" theme="dark" />
            <p className="text-sm text-slate-400 leading-relaxed mt-2">
              {SCHOOL_INFO.tagline}. Providing a world-class educational foundation of knowledge,
              character, and excellence across Creche, Primary, and Secondary levels.
            </p>
          </div>

          {/* Col 2: Quick Links */}
          <div className="flex flex-col gap-3">
            <h4 className="text-white font-bold text-base uppercase tracking-wider mb-2 border-l-2 border-[#D9B76A] pl-3">
              Quick Links
            </h4>
            <NavLink
              to="/about"
              className="text-sm hover:text-[#D9B76A] transition-colors flex items-center gap-2"
            >
              <ArrowRight className="w-3.5 h-3.5 text-[#D9B76A]" /> About Our School
            </NavLink>
            <NavLink
              to="/admissions"
              className="text-sm hover:text-[#D9B76A] transition-colors flex items-center gap-2"
            >
              <ArrowRight className="w-3.5 h-3.5 text-[#D9B76A]" /> Admissions &amp; Requirements
            </NavLink>
            <NavLink
              to="/school-life"
              className="text-sm hover:text-[#D9B76A] transition-colors flex items-center gap-2"
            >
              <ArrowRight className="w-3.5 h-3.5 text-[#D9B76A]" /> School Life &amp; Activities
            </NavLink>
            <NavLink
              to="/news"
              className="text-sm hover:text-[#D9B76A] transition-colors flex items-center gap-2"
            >
              <ArrowRight className="w-3.5 h-3.5 text-[#D9B76A]" /> News &amp; Events
            </NavLink>
            <NavLink
              to="/gallery"
              className="text-sm hover:text-[#D9B76A] transition-colors flex items-center gap-2"
            >
              <ArrowRight className="w-3.5 h-3.5 text-[#D9B76A]" /> Photo Gallery
            </NavLink>
            <NavLink
              to="/contact"
              className="text-sm hover:text-[#D9B76A] transition-colors flex items-center gap-2"
            >
              <ArrowRight className="w-3.5 h-3.5 text-[#D9B76A]" /> Contact Us
            </NavLink>
          </div>

          {/* Col 3: Educational Levels */}
          <div className="flex flex-col gap-3">
            <h4 className="text-white font-bold text-base uppercase tracking-wider mb-2 border-l-2 border-[#D9B76A] pl-3">
              Academic Levels
            </h4>
            <NavLink
              to="/academics/creche"
              className="text-sm hover:text-[#D9B76A] transition-colors flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-[#D9B76A]"></span> Creche (Early Years)
            </NavLink>
            <NavLink
              to="/academics/primary"
              className="text-sm hover:text-[#D9B76A] transition-colors flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-[#D9B76A]"></span> Primary School
            </NavLink>
            <NavLink
              to="/academics/secondary"
              className="text-sm hover:text-[#D9B76A] transition-colors flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-[#D9B76A]"></span> Secondary School
            </NavLink>
            <NavLink
              to="/portal"
              className="mt-4 inline-flex items-center justify-center gap-2 bg-[#102B46] hover:bg-[#1e3a8a] text-white px-4 py-2.5 rounded-xl font-bold text-xs border border-[#D9B76A]/40 transition-colors"
            >
              <span>Access School Portal</span>
            </NavLink>
          </div>

          {/* Col 4: Contact Info (only verified configured details) */}
          <div className="flex flex-col gap-4">
            <h4 className="text-white font-bold text-base uppercase tracking-wider mb-2 border-l-2 border-[#D9B76A] pl-3">
              Contact Us
            </h4>
            {hasVerifiedContact ? (
              <>
                {contactInfo?.address && (
                  <div className="flex items-start gap-3 text-sm text-slate-400">
                    <MapPin className="w-5 h-5 text-[#D9B76A] shrink-0 mt-0.5" />
                    <span>{contactInfo.address}</span>
                  </div>
                )}
                {contactInfo?.phone && (
                  <div className="flex items-center gap-3 text-sm text-slate-400">
                    <Phone className="w-4 h-4 text-[#D9B76A] shrink-0" />
                    <a
                      href={`tel:${contactInfo.phone}`}
                      className="hover:text-white transition-colors"
                    >
                      {contactInfo.phone}
                    </a>
                  </div>
                )}
                {contactInfo?.email && (
                  <div className="flex items-center gap-3 text-sm text-slate-400">
                    <Mail className="w-4 h-4 text-[#D9B76A] shrink-0" />
                    <a
                      href={`mailto:${contactInfo.email}`}
                      className="hover:text-white transition-colors"
                    >
                      {contactInfo.email}
                    </a>
                  </div>
                )}
                {contactInfo?.hours && (
                  <div className="text-xs text-[#D9B76A] font-semibold mt-1">
                    {contactInfo.hours}
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-slate-400 leading-relaxed space-y-3">
                <p>
                  Official campus enquiries and admission questions can be submitted directly
                  through our online contact desk.
                </p>
                <NavLink
                  to="/contact"
                  className="inline-flex items-center gap-2 text-xs font-bold text-[#D9B76A] hover:underline"
                >
                  <span>Open Contact Form</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </NavLink>
              </div>
            )}
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>
            © {new Date().getFullYear()} {SCHOOL_INFO.name}. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <NavLink to="/admissions" className="hover:text-[#D9B76A] transition-colors">
              Admissions
            </NavLink>
            <NavLink to="/contact" className="hover:text-[#D9B76A] transition-colors">
              Contact
            </NavLink>
            <NavLink to="/portal" className="hover:text-[#D9B76A] transition-colors">
              School Portal
            </NavLink>
          </div>
        </div>
      </div>
    </footer>
  );
};
