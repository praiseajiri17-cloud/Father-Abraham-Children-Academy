import React from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs: { name: string; path?: string }[];
  bgImage?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  bgImage = 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1600&q=80'
}) => {
  return (
    <div className="relative bg-[#102B46] text-white py-16 md:py-24 overflow-hidden">
      {/* Background Image with Navy Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={bgImage}
          alt={title}
          className="w-full h-full object-cover opacity-20 transform scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#091C30] via-[#102B46]/90 to-[#102B46]/80"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-start gap-4">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-xs md:text-sm text-slate-300 font-medium">
          <NavLink to="/" className="flex items-center gap-1 hover:text-[#D9B76A] transition-colors">
            <Home className="w-4 h-4 text-[#D9B76A]" />
            <span>Home</span>
          </NavLink>
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              <ChevronRight className="w-4 h-4 text-slate-500" />
              {crumb.path ? (
                <NavLink to={crumb.path} className="hover:text-[#D9B76A] transition-colors">
                  {crumb.name}
                </NavLink>
              ) : (
                <span className="text-[#D9B76A] font-semibold">{crumb.name}</span>
              )}
            </React.Fragment>
          ))}
        </nav>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white uppercase font-['Manrope']">
          {title}
        </h1>

        {subtitle && (
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {/* Decorative Bottom Gold Accent Line */}
      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#D9B76A] via-[#f3e0aa] to-[#D9B76A]"></div>
    </div>
  );
};
