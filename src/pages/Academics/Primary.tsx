import React from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { SectionHeading } from '../../components/common/SectionHeading';
import { CheckCircle2, BookOpen, Award, Users, Cpu } from 'lucide-react';
import { SCHOOL_INFO } from '../../constants/data';

export const Primary: React.FC = () => {
  const subjects = [
    'English Language & Phonics',
    'Mathematics & Quantitative Reasoning',
    'Basic Science & Technology',
    'Information & Communications Technology (ICT)',
    'Social Studies & Civic Education',
    'Creative Arts & Music',
    'Moral Instruction & Religious Studies',
    'French & Nigerian Languages'
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="Primary School"
        subtitle="Laying a formidable foundation in literacy, numeracy, critical inquiry, and moral discipline (Ages 5 - 10 years)."
        breadcrumbs={[{ name: 'Academics', path: '/academics' }, { name: 'Primary School' }]}
        bgImage="https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1600&q=80"
      />

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 flex flex-col gap-6">
              <span className="inline-block px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-blue-500/10 text-blue-800 w-max">
                Primary Education
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#102B46] tracking-tight uppercase font-['Manrope']">
                Inquiring Minds, Exceptional Scholars
              </h2>
              <p className="text-slate-600 text-base leading-relaxed">
                The Primary Section at <strong className="text-[#102B46]">{SCHOOL_INFO.name}</strong> focuses on transitioning young children into independent, confident thinkers. We foster a love for reading, mathematical dexterity, scientific curiosity, and teamwork.
              </p>
              <p className="text-slate-600 text-base leading-relaxed">
                With interactive multimedia classrooms, dedicated subject teachers, and continuous formative assessment, every pupil is guided to discover their unique strengths and excel academically.
              </p>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="bg-[#F5F3ED] p-4 rounded-2xl border border-slate-200">
                  <div className="text-2xl font-extrabold text-[#102B46] font-['Manrope'] mb-1">1:18</div>
                  <div className="text-xs text-slate-600 font-medium uppercase">Teacher-Student Ratio</div>
                </div>
                <div className="bg-[#F5F3ED] p-4 rounded-2xl border border-slate-200">
                  <div className="text-2xl font-extrabold text-[#102B46] font-['Manrope'] mb-1">100%</div>
                  <div className="text-xs text-slate-600 font-medium uppercase">Secondary School Prep</div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-3xl overflow-hidden shadow-2xl border-4 border-[#F5F3ED]">
                <img
                  src="https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1000&q=80"
                  alt="Primary pupils"
                  className="w-full h-[400px] object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Subjects Grid */}
      <section className="py-20 bg-[#F5F3ED]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            subtitle="Curriculum Scope"
            title="Core Primary Subjects"
            description="Our broad curriculum is designed to ignite passion across sciences, humanities, and arts."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {subjects.map((sub, idx) => (
              <div
                key={idx}
                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 hover:border-[#102B46] transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-[#102B46] text-[#D9B76A] flex items-center justify-center font-bold shrink-0">
                  {idx + 1}
                </div>
                <span className="text-sm font-bold text-[#102B46] font-['Manrope']">
                  {sub}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
};
