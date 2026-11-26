import React from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { SectionHeading } from '../../components/common/SectionHeading';
import { CheckCircle2, Award, BookOpen, ShieldCheck, Users, Target, Compass, Heart } from 'lucide-react';
import { SCHOOL_INFO } from '../../constants/data';

export const About: React.FC = () => {
  const coreValues = [
    { title: 'Excellence', desc: 'Striving for the highest standards in academics, character, and extracurricular pursuits.' },
    { title: 'Integrity', desc: 'Upholding honesty, transparency, and high moral standards in all actions and relationships.' },
    { title: 'Discipline', desc: 'Cultivating self-control, respect for authority, and dedication to responsibilities.' },
    { title: 'Innovation', desc: 'Embracing creative problem-solving and modern technological tools for effective learning.' },
    { title: 'Compassion', desc: 'Fostering empathy, kindness, and community spirit among pupils, staff, and parents.' }
  ];

  const leadershipTeam = [
    {
      name: 'Mrs. Abigail Abraham',
      role: 'Founder & Proprietress',
      bio: 'An astute educationist with over 25 years of visionary leadership in child development and institutional governance.',
      image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80'
    },
    {
      name: 'Dr. Emmanuel Okafor',
      role: 'Principal, Secondary Section',
      bio: 'Dedicated academic administrator with a Ph.D. in Curriculum Studies and a passion for STEM advancement.',
      image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=600&q=80'
    },
    {
      name: 'Mrs. Folashade Adebayo',
      role: 'Headmistress, Primary & Creche',
      bio: 'Specialist in early childhood Montessori education and foundational literacy development.',
      image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=600&q=80'
    }
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="About Our Academy"
        subtitle={`Discover the history, mission, and leadership driving excellence at ${SCHOOL_INFO.name}.`}
        breadcrumbs={[{ name: 'About Us' }]}
      />

      {/* Introduction & History */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 flex flex-col gap-6">
              <span className="inline-block px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-[#102B46]/10 text-[#102B46] w-max">
                Our Heritage & History
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#102B46] tracking-tight uppercase font-['Manrope']">
                A Legacy of Raising Leaders of Character and Distinction
              </h2>
              <p className="text-slate-600 text-base leading-relaxed">
                Founded with a profound vision to bridge the gap between traditional moral discipline and 21st-century academic excellence, <strong className="text-[#102B46]">{SCHOOL_INFO.name}</strong> has grown from a humble early learning center into a premier comprehensive educational institution spanning Creche, Primary, and Secondary levels.
              </p>
              <p className="text-slate-600 text-base leading-relaxed">
                Our campus provides a serene, secure, and stimulating atmosphere where young minds are nurtured to discover their innate talents, acquire critical problem-solving skills, and develop unshakeable moral integrity.
              </p>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="bg-[#F5F3ED] p-4 rounded-2xl border border-slate-200">
                  <div className="text-2xl font-extrabold text-[#102B46] font-['Manrope'] mb-1">100%</div>
                  <div className="text-xs text-slate-600 font-medium uppercase">Committed Faculty</div>
                </div>
                <div className="bg-[#F5F3ED] p-4 rounded-2xl border border-slate-200">
                  <div className="text-2xl font-extrabold text-[#102B46] font-['Manrope'] mb-1">3 Levels</div>
                  <div className="text-xs text-slate-600 font-medium uppercase">Creche to Senior Sec</div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <img
                  src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=600&q=80"
                  alt="School building"
                  className="rounded-3xl shadow-lg w-full h-64 object-cover"
                />
                <img
                  src="https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=600&q=80"
                  alt="Classroom"
                  className="rounded-3xl shadow-lg w-full h-48 object-cover"
                />
              </div>
              <div className="space-y-4 pt-8">
                <img
                  src="https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=600&q=80"
                  alt="Library"
                  className="rounded-3xl shadow-lg w-full h-48 object-cover"
                />
                <img
                  src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=600&q=80"
                  alt="Sports field"
                  className="rounded-3xl shadow-lg w-full h-64 object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 bg-[#F5F3ED]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-xl border border-slate-200 flex flex-col gap-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#102B46]/5 rounded-bl-full pointer-events-none"></div>
              <div className="w-14 h-14 rounded-2xl bg-[#102B46] text-[#D9B76A] flex items-center justify-center shadow-md">
                <Target className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-[#102B46] font-['Manrope']">Our Mission</h3>
              <p className="text-slate-600 text-base leading-relaxed">
                To provide accessible, high-quality education that empowers every child with intellectual capability, moral fortitude, emotional intelligence, and technological literacy to excel in a dynamic global society.
              </p>
              <ul className="flex flex-col gap-3 pt-2">
                <li className="flex items-center gap-3 text-sm text-slate-700">
                  <CheckCircle2 className="w-5 h-5 text-[#102B46] shrink-0" />
                  <span>Rigorous curriculum and personalized instruction</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-slate-700">
                  <CheckCircle2 className="w-5 h-5 text-[#102B46] shrink-0" />
                  <span>Uncompromising moral and ethical guidance</span>
                </li>
              </ul>
            </div>

            <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-xl border border-slate-200 flex flex-col gap-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#D9B76A]/10 rounded-bl-full pointer-events-none"></div>
              <div className="w-14 h-14 rounded-2xl bg-[#D9B76A] text-[#102B46] flex items-center justify-center shadow-md">
                <Compass className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-[#102B46] font-['Manrope']">Our Vision</h3>
              <p className="text-slate-600 text-base leading-relaxed">
                To be the leading citadel of holistic learning recognized internationally for producing disciplined, innovative, and accomplished future leaders who transform their communities and the world.
              </p>
              <ul className="flex flex-col gap-3 pt-2">
                <li className="flex items-center gap-3 text-sm text-slate-700">
                  <CheckCircle2 className="w-5 h-5 text-[#102B46] shrink-0" />
                  <span>World-class campus infrastructure & technology</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-slate-700">
                  <CheckCircle2 className="w-5 h-5 text-[#102B46] shrink-0" />
                  <span>Global standard in competitive examinations</span>
                </li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            subtitle="What We Stand For"
            title="Our Core Values"
            description="The guiding principles that shape our institutional culture, staff dedication, and student character."
          />

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {coreValues.map((val, idx) => (
              <div
                key={idx}
                className="bg-[#F5F3ED]/50 p-6 rounded-3xl border border-slate-200 flex flex-col gap-3 text-center items-center hover:bg-[#102B46] hover:text-white transition-all duration-300 group"
              >
                <div className="w-12 h-12 rounded-full bg-[#102B46] group-hover:bg-[#D9B76A] group-hover:text-[#102B46] text-[#D9B76A] flex items-center justify-center font-bold text-lg shadow">
                  {idx + 1}
                </div>
                <h4 className="text-lg font-bold text-[#102B46] group-hover:text-white font-['Manrope']">
                  {val.title}
                </h4>
                <p className="text-xs text-slate-600 group-hover:text-slate-300 leading-relaxed">
                  {val.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Leadership Team */}
      <section className="py-20 bg-[#F5F3ED]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            subtitle="Experienced Leadership"
            title="Meet Our Management Team"
            description="Dedicated educationists and administrators guiding the academic vision of Father Abraham Children Academy."
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {leadershipTeam.map((leader, idx) => (
              <div
                key={idx}
                className="bg-white rounded-3xl overflow-hidden shadow-lg border border-slate-200 flex flex-col group"
              >
                <div className="relative h-72 overflow-hidden">
                  <img
                    src={leader.image}
                    alt={leader.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#102B46]/80 via-transparent to-transparent"></div>
                  <span className="absolute bottom-4 left-4 text-xs font-bold text-[#D9B76A] uppercase tracking-wider bg-[#102B46]/90 px-3 py-1 rounded-full">
                    {leader.role}
                  </span>
                </div>
                <div className="p-6 flex flex-col gap-3">
                  <h3 className="text-xl font-bold text-[#102B46] font-['Manrope']">
                    {leader.name}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {leader.bio}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
};
