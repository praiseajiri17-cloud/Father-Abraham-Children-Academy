import React from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { SectionHeading } from '../../components/common/SectionHeading';
import { Trophy, Music, Palette, Users, Globe, Smile } from 'lucide-react';
import { SCHOOL_INFO } from '../../constants/data';

export const SchoolLife: React.FC = () => {
  const activities = [
    {
      icon: <Trophy className="w-6 h-6 text-[#D9B76A]" />,
      title: 'Sports & Athletics',
      desc: 'Football, basketball, athletics, track and field, and annual inter-house sports competitions promoting teamwork and physical fitness.'
    },
    {
      icon: <Music className="w-6 h-6 text-[#D9B76A]" />,
      title: 'Music & Instrumental Band',
      desc: 'Training in piano, violin, brass band, choir, and traditional African percussion instruments.'
    },
    {
      icon: <Palette className="w-6 h-6 text-[#D9B76A]" />,
      title: 'Arts & Cultural Troupe',
      desc: 'Painting, sculpture, drama club, and vibrant cultural dance performances celebrating Nigerian heritage.'
    },
    {
      icon: <Globe className="w-6 h-6 text-[#D9B76A]" />,
      title: 'Clubs & Societies',
      desc: 'Press club, Science & Robotics club, Debate society, Junior Engineers, and ICT coding clubs.'
    },
    {
      icon: <Users className="w-6 h-6 text-[#D9B76A]" />,
      title: 'Leadership & Prefect Council',
      desc: 'Instilling responsibility and democratic governance through student prefects and peer mentorship programs.'
    },
    {
      icon: <Smile className="w-6 h-6 text-[#D9B76A]" />,
      title: 'Excursions & Field Trips',
      desc: 'Educational visits to museums, technology hubs, botanical gardens, and industrial plants for practical exposure.'
    }
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="School Life"
        subtitle="Beyond the classroom: exploring sports, arts, leadership, and vibrant extracurricular activities."
        breadcrumbs={[{ name: 'School Life' }]}
      />

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            subtitle="Holistic Development"
            title="A Vibrant & Engaging Campus Experience"
            description={`At ${SCHOOL_INFO.name}, we believe education extends far beyond textbooks. Our school life is designed to uncover hidden talents and build character.`}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {activities.map((act, idx) => (
              <div
                key={idx}
                className="bg-[#F5F3ED] p-8 rounded-3xl border border-slate-200 flex flex-col gap-4 hover:bg-white hover:shadow-xl transition-all duration-300 group"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#102B46] flex items-center justify-center shadow-md">
                  {act.icon}
                </div>
                <h3 className="text-xl font-bold text-[#102B46] font-['Manrope']">
                  {act.title}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {act.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Daily Routine Showcase */}
      <section className="py-20 bg-[#091C30] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            subtitle="Daily Routine"
            title="A Typical Day at Father Abraham"
            description="Structured balance of academics, recreation, and spiritual reflection."
            light
          />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white/5 p-6 rounded-3xl border border-white/10 flex flex-col gap-3">
              <span className="text-xs font-bold text-[#D9B76A] uppercase tracking-wider">7:00 AM - 7:30 AM</span>
              <h4 className="text-lg font-bold text-white font-['Manrope']">Arrival & Assembly</h4>
              <p className="text-xs text-slate-300">Gates open, morning devotion, national anthem, and inspection.</p>
            </div>
            <div className="bg-white/5 p-6 rounded-3xl border border-white/10 flex flex-col gap-3">
              <span className="text-xs font-bold text-[#D9B76A] uppercase tracking-wider">7:30 AM - 1:00 PM</span>
              <h4 className="text-lg font-bold text-white font-['Manrope']">Core Academic Sessions</h4>
              <p className="text-xs text-slate-300">Engaging lessons across STEM, humanities, and languages.</p>
            </div>
            <div className="bg-white/5 p-6 rounded-3xl border border-white/10 flex flex-col gap-3">
              <span className="text-xs font-bold text-[#D9B76A] uppercase tracking-wider">1:00 PM - 2:00 PM</span>
              <h4 className="text-lg font-bold text-white font-['Manrope']">Lunch & Recess</h4>
              <p className="text-xs text-slate-300">Nutritional meal break, games, and peer socialization.</p>
            </div>
            <div className="bg-white/5 p-6 rounded-3xl border border-white/10 flex flex-col gap-3">
              <span className="text-xs font-bold text-[#D9B76A] uppercase tracking-wider">2:00 PM - 4:00 PM</span>
              <h4 className="text-lg font-bold text-white font-['Manrope']">Extracurriculars & Clubs</h4>
              <p className="text-xs text-slate-300">Sports practice, music, debate, robotics, and homeward departures.</p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
