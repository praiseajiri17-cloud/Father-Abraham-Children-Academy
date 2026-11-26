import React from 'react';
import { NavLink } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { SectionHeading } from '../../components/common/SectionHeading';
import { CheckCircle2, ArrowRight, BookOpen, Award, Users, Cpu } from 'lucide-react';
import { SCHOOL_INFO } from '../../constants/data';

export const Academics: React.FC = () => {
  const levels = [
    {
      title: 'Creche & Early Years',
      ages: 'Ages 3 months - 2 years',
      desc: 'Gentle nurturing, sensory exploration, and cognitive foundation in a warm, secure, homelike environment.',
      path: '/academics/creche',
      image: 'https://images.unsplash.com/photo-1587653969292-0945a0b5f850?auto=format&fit=crop&w=800&q=80',
      highlights: ['Montessori play toys', 'Sensory development', 'Safe sleeping quarters', 'Professional caregivers']
    },
    {
      title: 'Primary School',
      ages: 'Ages 5 - 10 years',
      desc: 'Mastery of literacy, numeracy, elementary science, social studies, and moral uprightness.',
      path: '/academics/primary',
      image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80',
      highlights: ['Strong literacy & numeracy', 'ICT digital literacy', 'Creative arts & music', 'Sports & teamwork']
    },
    {
      title: 'Secondary School',
      ages: 'Ages 11 - 17 years',
      desc: 'Junior & Senior Secondary curriculum preparing students for WAEC, NECO, JAMB, and global excellence.',
      path: '/academics/secondary',
      image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=800&q=80',
      highlights: ['Advanced STEM labs', 'Robotics & Coding', 'Leadership grooming', 'University counseling']
    }
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="Academics Overview"
        subtitle="Explore our comprehensive curriculum and educational programs designed for every stage of your child's journey."
        breadcrumbs={[{ name: 'Academics' }]}
      />

      {/* Overview Intro */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            subtitle="Academic Excellence"
            title="A Structured Path to Lifelong Success"
            description="At Father Abraham Children Academy, we provide a continuous, progressive educational experience from infancy through adolescence."
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            {levels.map((lvl, idx) => (
              <div
                key={idx}
                className="bg-[#F5F3ED] rounded-3xl overflow-hidden shadow-lg border border-slate-200 flex flex-col group"
              >
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={lvl.image}
                    alt={lvl.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <span className="absolute top-4 left-4 bg-[#102B46] text-[#D9B76A] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    {lvl.ages}
                  </span>
                </div>
                <div className="p-6 sm:p-8 flex flex-col flex-1 justify-between gap-6">
                  <div className="flex flex-col gap-3">
                    <h3 className="text-2xl font-bold text-[#102B46] font-['Manrope']">
                      {lvl.title}
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      {lvl.desc}
                    </p>
                    <ul className="flex flex-col gap-2 pt-2">
                      {lvl.highlights.map((h, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                          <CheckCircle2 className="w-4 h-4 text-[#102B46]" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <NavLink
                    to={lvl.path}
                    className="inline-flex items-center justify-between w-full bg-[#102B46] hover:bg-[#091C30] text-white px-5 py-3 rounded-xl font-bold text-sm transition-colors"
                  >
                    <span>View Section Details</span>
                    <ArrowRight className="w-4 h-4 text-[#D9B76A]" />
                  </NavLink>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Curriculum Philosophy */}
      <section className="py-20 bg-[#F5F3ED]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 flex flex-col gap-6">
              <span className="inline-block px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-[#D9B76A]/20 text-[#102B46] w-max">
                Our Methodology
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#102B46] tracking-tight uppercase font-['Manrope']">
                Blending National Standards with Global Best Practices
              </h2>
              <p className="text-slate-600 text-base leading-relaxed">
                Our academic framework integrates the Nigerian Educational Research and Development Council (NERDC) curriculum with enriched British teaching methodologies. This blend ensures our students excel in local examinations while developing critical thinking, problem-solving, and digital literacy required in the global arena.
              </p>
              <div className="flex flex-col gap-3 pt-2">
                <div className="flex items-center gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
                  <BookOpen className="w-5 h-5 text-[#102B46] shrink-0" />
                  <span className="text-sm font-bold text-[#102B46]">Continuous Assessment & Feedback</span>
                </div>
                <div className="flex items-center gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
                  <Cpu className="w-5 h-5 text-[#102B46] shrink-0" />
                  <span className="text-sm font-bold text-[#102B46]">Practical STEM & ICT Integration</span>
                </div>
                <div className="flex items-center gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
                  <Award className="w-5 h-5 text-[#102B46] shrink-0" />
                  <span className="text-sm font-bold text-[#102B46]">Moral & Character Mentorship</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
                <img
                  src="https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1000&q=80"
                  alt="Students in laboratory"
                  className="w-full h-[450px] object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
