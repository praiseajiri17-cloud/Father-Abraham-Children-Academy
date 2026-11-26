import React from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { SectionHeading } from '../../components/common/SectionHeading';
import { CheckCircle2, Smile, Heart, Shield, Clock } from 'lucide-react';
import { SCHOOL_INFO } from '../../constants/data';

export const Creche: React.FC = () => {
  const features = [
    { title: 'Early Sensory Stimulation', desc: 'Engaging toys and color recognition activities designed for infant cognitive growth.' },
    { title: 'Cozy Sleeping Quarters', desc: 'Air-conditioned, hygienic, and monitored nap rooms ensuring peaceful rest.' },
    { title: 'Professional Caregivers', desc: 'Certified early childhood nurses and loving caregivers dedicated to each baby’s comfort.' },
    { title: 'Nutritional Meal Plans', desc: 'Wholesome, pediatrician-approved baby meals, purees, and formula preparation.' },
    { title: 'Interactive Playgroup', desc: 'Socialization through guided play, songs, and gentle movement exercises.' },
    { title: 'Daily Progress Logs', desc: 'Detailed feedback journals for parents covering feeding, sleeping, and mood.' }
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="Creche & Early Years"
        subtitle="A loving, safe, and stimulating home away from home for infants and toddlers (Ages 3 months - 2 years)."
        breadcrumbs={[{ name: 'Academics', path: '/academics' }, { name: 'Creche' }]}
        bgImage="https://images.unsplash.com/photo-1587653969292-0945a0b5f850?auto=format&fit=crop&w=1600&q=80"
      />

      {/* Main Content */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 flex flex-col gap-6">
              <span className="inline-block px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-amber-500/10 text-amber-800 w-max">
                Early Childhood Care
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#102B46] tracking-tight uppercase font-['Manrope']">
                Where Tender Care Meets Early Learning
              </h2>
              <p className="text-slate-600 text-base leading-relaxed">
                At the <strong className="text-[#102B46]">{SCHOOL_INFO.name} Creche</strong>, we understand that the first two years of a child’s life are crucial for brain development. We provide an environment that feels like home, where every infant and toddler receives undivided attention, affection, and professional care.
              </p>
              <p className="text-slate-600 text-base leading-relaxed">
                Our facilities are thoroughly sanitized, baby-proofed, and equipped with age-appropriate developmental toys that stimulate motor skills, hand-eye coordination, and sensory awareness.
              </p>

              <div className="flex items-center gap-6 pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2 text-slate-700 text-sm font-bold">
                  <Clock className="w-5 h-5 text-[#D9B76A]" />
                  <span>Open 7:00 AM - 4:00 PM</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 text-sm font-bold">
                  <Shield className="w-5 h-5 text-[#D9B76A]" />
                  <span>100% Safe & Secure</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-3xl overflow-hidden shadow-2xl border-4 border-[#F5F3ED]">
                <img
                  src="https://images.unsplash.com/photo-1587653969292-0945a0b5f850?auto=format&fit=crop&w=1000&q=80"
                  alt="Creche and toddlers"
                  className="w-full h-[400px] object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Creche Features */}
      <section className="py-20 bg-[#F5F3ED]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            subtitle="Creche Facilities & Care"
            title="Designed for Your Baby's Comfort & Joy"
            description="Every detail in our creche section is curated with maternal care and professional expertise."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feat, idx) => (
              <div
                key={idx}
                className="bg-white p-8 rounded-3xl shadow-md border border-slate-200 flex flex-col gap-4 hover:shadow-xl transition-shadow"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#102B46] text-[#D9B76A] flex items-center justify-center font-bold text-lg shadow">
                  0{idx + 1}
                </div>
                <h3 className="text-xl font-bold text-[#102B46] font-['Manrope']">
                  {feat.title}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {feat.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
};
