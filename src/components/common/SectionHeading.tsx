import React from 'react';

interface SectionHeadingProps {
  subtitle?: string;
  title: string;
  description?: string;
  centered?: boolean;
  light?: boolean;
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({
  subtitle,
  title,
  description,
  centered = true,
  light = false
}) => {
  return (
    <div className={`flex flex-col gap-3 mb-12 ${centered ? 'items-center text-center mx-auto max-w-3xl' : 'items-start text-left'}`}>
      {subtitle && (
        <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-[#D9B76A]/20 text-[#102B46] border border-[#D9B76A]/40">
          {subtitle}
        </span>
      )}
      <h2 className={`text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight uppercase font-['Manrope'] ${light ? 'text-white' : 'text-[#102B46]'}`}>
        {title}
      </h2>
      {description && (
        <p className={`text-base sm:text-lg leading-relaxed ${light ? 'text-slate-300' : 'text-slate-600'}`}>
          {description}
        </p>
      )}
      <div className={`w-20 h-1 bg-[#D9B76A] rounded-full mt-1 ${centered ? 'mx-auto' : ''}`}></div>
    </div>
  );
};
