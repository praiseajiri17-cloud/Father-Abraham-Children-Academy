import React from 'react';
import { Shield, BookOpen, Flame, Award } from 'lucide-react';

interface LogoProps {
  variant?: 'full' | 'crest' | 'horizontal';
  className?: string;
  theme?: 'dark' | 'light';
}

export const Logo: React.FC<LogoProps> = ({ variant = 'horizontal', className = '', theme = 'light' }) => {
  const textColor = theme === 'dark' ? 'text-white' : 'text-[#102B46]';
  const subTextColor = theme === 'dark' ? 'text-[#D9B76A]' : 'text-slate-600';

  if (variant === 'crest') {
    return (
      <div className={`relative flex items-center justify-center w-12 h-14 bg-[#102B46] rounded-b-xl border-2 border-[#D9B76A] shadow-md ${className}`}>
        <Shield className="w-6 h-6 text-[#D9B76A]" />
        <div className="absolute -bottom-1 w-3 h-3 bg-[#D9B76A] rotate-45"></div>
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div className={`flex flex-col items-center text-center ${className}`}>
        <div className="relative flex items-center justify-center w-16 h-20 bg-gradient-to-b from-[#102B46] to-[#091C30] rounded-b-2xl border-2 border-[#D9B76A] shadow-lg mb-2">
          <div className="flex flex-col items-center">
            <Flame className="w-5 h-5 text-[#D9B76A] animate-pulse" />
            <BookOpen className="w-6 h-6 text-white my-0.5" />
            <Award className="w-4 h-4 text-[#D9B76A]" />
          </div>
          <div className="absolute -bottom-1.5 w-4 h-4 bg-[#D9B76A] rotate-45 border-b border-r border-[#102B46]"></div>
        </div>
        <span className={`font-extrabold tracking-wide text-lg uppercase ${textColor}`}>
          Father Abraham
        </span>
        <span className={`font-bold tracking-widest text-xs uppercase ${textColor}`}>
          Children Academy
        </span>
        <span className="text-[10px] tracking-widest font-semibold text-[#D9B76A] mt-0.5">
          CRECHE | PRIMARY | SECONDARY
        </span>
      </div>
    );
  }

  // Horizontal variant (default for navbar/header)
  return (
    <a href="/" className={`flex items-center gap-3 group ${className}`}>
      <div className="relative flex items-center justify-center w-11 h-13 bg-gradient-to-b from-[#102B46] to-[#091C30] rounded-b-lg border-2 border-[#D9B76A] shadow-md transition-transform group-hover:scale-105">
        <Flame className="absolute top-1 w-3.5 h-3.5 text-[#D9B76A]" />
        <BookOpen className="w-5 h-5 text-white" />
        <div className="absolute -bottom-1 w-2.5 h-2.5 bg-[#D9B76A] rotate-45"></div>
      </div>
      <div className="flex flex-col">
        <div className={`font-extrabold text-base md:text-lg tracking-tight uppercase leading-tight ${textColor}`}>
          Father Abraham
        </div>
        <div className={`font-bold text-xs md:text-sm tracking-wider uppercase leading-none ${textColor}`}>
          Children Academy
        </div>
        <span className={`text-[9px] md:text-[10px] tracking-widest font-bold uppercase mt-1 ${subTextColor}`}>
          Creche • Primary • Secondary
        </span>
      </div>
    </a>
  );
};
