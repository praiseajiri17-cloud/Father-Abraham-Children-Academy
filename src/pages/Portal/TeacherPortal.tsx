import React from 'react';
import { NavLink } from 'react-router-dom';
import { GraduationCap, ArrowLeft } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';

export const TeacherPortal: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="Teacher & Caregiver Portal"
        subtitle="Classroom attendance, continuous assessment, and lesson management."
        breadcrumbs={[{ name: 'Portal', path: '/portal' }, { name: 'Teacher Portal' }]}
      />
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-[#F5F3ED] flex-1">
        <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-200 p-8 text-center flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#102B46] text-[#D9B76A] flex items-center justify-center">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-[#102B46] font-['Manrope']">
            Teacher &amp; Caregiver Workspace
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Assigned class rosters, daily attendance registers, and continuous assessment score
            entry will appear here once class allocations and active academic terms are published.
          </p>
          <NavLink
            to="/"
            className="inline-flex items-center gap-2 bg-[#102B46] text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-[#091C30]"
          >
            <ArrowLeft className="w-4 h-4 text-[#D9B76A]" />
            <span>Back to School Website</span>
          </NavLink>
        </div>
      </section>
    </div>
  );
};
