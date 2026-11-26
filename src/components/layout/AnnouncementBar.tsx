import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Sparkles, X } from 'lucide-react';

export const AnnouncementBar: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="bg-[#102B46] text-white px-4 py-2.5 text-xs sm:text-sm font-medium relative z-50 border-b border-[#D9B76A]/30">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 mx-auto sm:mx-0">
          <Sparkles className="w-4 h-4 text-[#D9B76A] shrink-0 animate-pulse" />
          <span className="text-center sm:text-left">
            <strong className="text-[#D9B76A] mr-1 uppercase tracking-wide">Notice:</strong> 
            Admissions for the 2026/2027 Academic Session are now ongoing for Creche, Primary & Secondary sections.
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <NavLink
            to="/portal"
            className="hidden md:inline-flex items-center gap-1 bg-[#D9B76A] text-[#102B46] px-3 py-1 rounded-full text-xs font-bold hover:bg-[#c9a658] transition-colors"
          >
            Apply Now
          </NavLink>
          <button
            onClick={() => setIsVisible(false)}
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
