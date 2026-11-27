import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Sparkles, X } from 'lucide-react';
import { usePublicSchoolSettings } from '../../hooks/usePublicSchoolSettings';

export const AnnouncementBar: React.FC = () => {
  const { announcement } = usePublicSchoolSettings();
  const [dismissed, setDismissed] = useState(false);

  // Hide cleanly unless an active, configured announcement exists in Supabase school_settings
  if (dismissed || !announcement || !announcement.is_active || !announcement.message.trim()) {
    return null;
  }

  return (
    <div className="bg-[#102B46] text-white px-4 py-2.5 text-xs sm:text-sm font-medium relative z-50 border-b border-[#D9B76A]/30">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 mx-auto sm:mx-0">
          <Sparkles className="w-4 h-4 text-[#D9B76A] shrink-0" />
          <span className="text-center sm:text-left">
            <strong className="text-[#D9B76A] mr-1.5 uppercase tracking-wide">
              {announcement.badge || 'Notice'}:
            </strong>
            {announcement.message}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <NavLink
            to={announcement.cta_path || '/apply'}
            className="hidden md:inline-flex items-center gap-1 bg-[#D9B76A] text-[#102B46] px-3 py-1 rounded-full text-xs font-bold hover:bg-[#c9a658] transition-colors"
          >
            {announcement.cta_label || 'Apply Now'}
          </NavLink>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-slate-300 hover:text-white p-1 transition-colors"
            aria-label="Close announcement"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
