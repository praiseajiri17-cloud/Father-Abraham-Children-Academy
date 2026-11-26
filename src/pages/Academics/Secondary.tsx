import React from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { SectionHeading } from '../../components/common/SectionHeading';
import { CheckCircle2, Cpu, Award, BookOpen, ShieldCheck } from 'lucide-react';
import { SCHOOL_INFO } from '../../constants/data';

export const Secondary: React.FC = () => {
  const departments = [
    {
      title: 'Sciences',
      desc: 'Physics, Chemistry, Biology, Further Mathematics, and Agricultural Science with fully equipped laboratories.'
    },
    {
      title: 'Arts & Humanities',
      desc: 'Literature-in-English, Government, History, Christian Religious Studies, Geography, and Fine Arts.'
    },
    {
      title: 'Commercial & Business',
      desc: 'Financial Accounting, Commerce, Economics, Marketing, and Data Processing.'
    },
    {
      title: 'Technology & ICT',
      desc: 'Computer Studies, Robotics, Python Programming, Technical Drawing, and Basic Electronics.'
    }
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="Secondary School"
        subtitle="Advanced academic rigor, critical thinking, leadership grooming, and university entrance preparation (Ages 11 - 17 years)."
        breadcrumbs={[{ name: 'Academics', path: '/academics' }, { name: 'Secondary School' }]}
        bgImage="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1600&q=80"
      />

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 flex flex-col gap-6">
              <span className="inline-block px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-[#D9B76A]/20 text-[#102B46] w-max">
                Secondary Education
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#102B46] tracking-tight uppercase font-['Manrope']">
                Preparing Future Global Leaders & Innovators
              </h2>
              <p className="text-slate-600 text-base leading-relaxed">
                Our Secondary Section comprises Junior Secondary (JSS 1-3) and Senior Secondary (SSS 1-3). We maintain an uncompromising commitment to academic rigor, discipline, and outstanding performance in WAEC, NECO, JAMB, and international entrance examinations.
              </p>
              <p className="text-slate-600 text-base leading-relaxed">
                Through specialized science laboratories, coding bootcamps, debate societies, and mentorship programs, students are equipped to excel in tertiary education and future professional endeavors.
              </p>

              <div className="flex flex-col gap-3 pt-2">
                <div className="flex items-center gap-3 bg-[#F5F3ED] p-3.5 rounded-xl border border-slate-200">
                  <CheckCircle2 className="w-5 h-5 text-[#102B46] shrink-0" />
                  <span className="text-sm font-bold text-[#102B46]">100% Success in External Examinations</span>
                </div>
                <div className="flex items-center gap-3 bg-[#F5F3ED] p-3.5 rounded-xl border border-slate-200">
                  <CheckCircle2 className="w-5 h-5 text-[#102B46] shrink-0" />
                  <span className="text-sm font-bold text-[#102B46]">Dedicated University & Career Counseling</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-3xl overflow-hidden shadow-2xl border-4 border-[#F5F3ED]">
                <img
                  src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1000&q=80"
                  alt="Secondary students"
                  className="w-full h-[400px] object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Departments */}
      <section className="py-20 bg-[#F5F3ED]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            subtitle="Academic Pathways"
            title="Senior Secondary Departments"
            description="Specialized academic divisions tailored to each student's career aspirations and university major."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {departments.map((dept, idx) => (
              <div
                key={idx}
                className="bg-white p-8 rounded-3xl shadow-md border border-slate-200 flex flex-col gap-4 hover:shadow-xl transition-shadow"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#102B46] text-[#D9B76A] flex items-center justify-center font-extrabold text-xl shadow">
                  0{idx + 1}
                </div>
                <h3 className="text-2xl font-bold text-[#102B46] font-['Manrope']">
                  {dept.title}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {dept.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
};
