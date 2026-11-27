import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  ArrowRight, 
  Award, 
  BookOpen, 
  Users, 
  ShieldCheck, 
  Sparkles, 
  Play, 
  CheckCircle2, 
  Calendar, 
  ChevronRight,
  Heart,
  Cpu,
  Smile
} from 'lucide-react';
import { SectionHeading } from '../../components/common/SectionHeading';
import { NEWS_ITEMS, GALLERY_ITEMS, SCHOOL_INFO } from '../../constants/data';

export const Home: React.FC = () => {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const educationalLevels = [
    {
      title: 'Creche (Early Years)',
      subtitle: 'Ages 3 months - 2 years',
      desc: 'Early childhood care, sensory development, social interaction, and foundational motor skills in a secure, cozy environment.',
      image: 'https://images.unsplash.com/photo-1587653969292-0945a0b5f850?auto=format&fit=crop&w=800&q=80',
      path: '/academics/creche',
      color: 'bg-amber-500/10 text-amber-700 border-amber-200'
    },
    {
      title: 'Primary School',
      subtitle: 'Ages 5 - 10 years',
      desc: 'Robust literacy, numeracy, moral discipline, and inquisitive scientific exploration laying the groundwork for lifelong success.',
      image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80',
      path: '/academics/primary',
      color: 'bg-blue-500/10 text-blue-700 border-blue-200'
    },
    {
      title: 'Secondary School',
      subtitle: 'Ages 11 - 17 years',
      desc: 'Academic excellence, critical thinking, advanced STEM laboratories, leadership grooming, and university entrance preparation.',
      image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=800&q=80',
      path: '/academics/secondary',
      color: 'bg-[#D9B76A]/20 text-[#102B46] border-[#D9B76A]/40'
    }
  ];

  const whyChooseUs = [
    {
      icon: <Award className="w-6 h-6 text-[#D9B76A]" />,
      title: 'Quality Academic Standard',
      desc: 'Integrated curriculum blending national and international best practices for exceptional scholarship.'
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-[#D9B76A]" />,
      title: 'Character & Moral Uprightness',
      desc: 'Disciplined environment instilling integrity, empathy, leadership, and respect for societal values.'
    },
    {
      icon: <Users className="w-6 h-6 text-[#D9B76A]" />,
      title: 'Qualified Teaching Faculty',
      desc: 'Dedicated, certified educators passionate about mentoring every child to reach their maximum potential.'
    },
    {
      icon: <Smile className="w-6 h-6 text-[#D9B76A]" />,
      title: 'Supportive Learning Environment',
      desc: 'Warm, secure, and inspiring campus equipped with modern facilities designed for holistic child development.'
    },
    {
      icon: <Cpu className="w-6 h-6 text-[#D9B76A]" />,
      title: 'Technology-Enabled Learning',
      desc: 'Well-equipped ICT laboratories and digital tools preparing students for the modern technological age.'
    },
    {
      icon: <Heart className="w-6 h-6 text-[#D9B76A]" />,
      title: 'Holistic Child Development',
      desc: 'Robust sports, arts, music, and club activities ensuring physical, mental, and creative growth.'
    }
  ];

  return (
    <div className="flex flex-col min-h-screen">
      
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center bg-[#091C30] text-white overflow-hidden py-20">
        {/* Cinematic Background Video Fallback / Poster Image Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1920&q=80"
            alt="School Campus"
            className="w-full h-full object-cover opacity-35 scale-105 transform animate-fade-in"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#091C30] via-[#102B46]/85 to-[#091C30]/95"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center lg:text-left">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-8 flex flex-col items-center lg:items-start gap-6">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D9B76A]/20 border border-[#D9B76A]/50 text-[#D9B76A] text-xs sm:text-sm font-bold uppercase tracking-widest backdrop-blur-sm">
                <Sparkles className="w-4 h-4 text-[#D9B76A]" /> Welcome to {SCHOOL_INFO.name}
              </span>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white uppercase font-['Manrope'] leading-tight">
                Building Bright Futures, <br />
                <span className="text-[#D9B76A]">One Child at a Time.</span>
              </h1>

              <p className="text-lg sm:text-xl text-slate-300 max-w-2xl leading-relaxed">
                Providing a rock-solid foundation of knowledge, uncompromised moral character, and academic excellence for every stage of childhood development.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto pt-4">
                <NavLink
                  to="/apply"
                  className="w-full sm:w-auto flex items-center justify-center gap-3 bg-[#D9B76A] hover:bg-[#c9a658] text-[#102B46] px-8 py-4 rounded-xl font-extrabold text-base shadow-lg transition-all hover:scale-105"
                >
                  <span>Apply for Admission</span>
                  <ArrowRight className="w-5 h-5" />
                </NavLink>

                <NavLink
                  to="/about"
                  className="w-full sm:w-auto flex items-center justify-center gap-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-8 py-4 rounded-xl font-bold text-base backdrop-blur-sm transition-all"
                >
                  <span>Explore Our School</span>
                </NavLink>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-slate-700/60 w-full max-w-xl">
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#D9B76A] font-['Manrope']">3 in 1</div>
                  <div className="text-xs text-slate-400 font-medium uppercase mt-1">Creche • Primary • Sec</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#D9B76A] font-['Manrope']">100%</div>
                  <div className="text-xs text-slate-400 font-medium uppercase mt-1">Moral Dedication</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#D9B76A] font-['Manrope']">Top-Tier</div>
                  <div className="text-xs text-slate-400 font-medium uppercase mt-1">Learning Facilities</div>
                </div>
              </div>

            </div>

            {/* Hero Right Card Preview */}
            <div className="lg:col-span-4 hidden lg:block">
              <div className="relative bg-gradient-to-br from-[#102B46] to-[#091C30] p-6 rounded-3xl border-2 border-[#D9B76A]/40 shadow-2xl">
                <div className="absolute -top-4 -right-4 bg-[#D9B76A] text-[#102B46] font-bold text-xs px-3 py-1 rounded-full uppercase tracking-wider shadow">
                  Online Admissions
                </div>
                <h3 className="text-xl font-bold text-white mb-3 font-['Manrope']">Quick Admission Inquiry</h3>
                <p className="text-sm text-slate-300 mb-6">
                  Ready to give your child the best educational start? Begin your family admission application online.
                </p>
                <div className="flex flex-col gap-3">
                  <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#D9B76A] shrink-0" />
                    <span className="text-xs text-slate-200">Creche &amp; Montessori Playgroup</span>
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#D9B76A] shrink-0" />
                    <span className="text-xs text-slate-200">Primary Foundation &amp; Literacy</span>
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#D9B76A] shrink-0" />
                    <span className="text-xs text-slate-200">Secondary STEM &amp; Arts Excellence</span>
                  </div>
                </div>
                <NavLink
                  to="/apply"
                  className="mt-6 w-full flex items-center justify-center gap-2 bg-[#D9B76A] hover:bg-[#c9a658] text-[#102B46] py-3 rounded-xl font-bold text-sm transition-colors"
                >
                  <span>Start Application</span>
                  <ArrowRight className="w-4 h-4" />
                </NavLink>
              </div>
            </div>

          </div>
        </div>

        {/* Decorative Gold Bottom Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-[#D9B76A] via-white to-[#D9B76A]"></div>
      </section>

      {/* Welcome Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-6 relative">
              <div className="relative z-10 rounded-3xl overflow-hidden shadow-2xl border-4 border-[#F5F3ED]">
                <img
                  src="https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1000&q=80"
                  alt="Students learning at Father Abraham Children Academy"
                  className="w-full h-[420px] object-cover hover:scale-105 transition-transform duration-700"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 z-20 bg-[#102B46] text-white p-6 rounded-2xl border-2 border-[#D9B76A] shadow-xl hidden sm:block max-w-xs">
                <div className="text-3xl font-extrabold text-[#D9B76A] font-['Manrope'] mb-1">3 Sections</div>
                <p className="text-xs text-slate-300">Creche, Primary, and Secondary united by academic excellence and moral leadership.</p>
              </div>
              <div className="absolute -top-6 -left-6 z-0 w-48 h-48 bg-[#D9B76A]/20 rounded-full blur-2xl"></div>
            </div>

            <div className="lg:col-span-6 flex flex-col gap-6">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-[#102B46]/10 text-[#102B46] w-max">
                Welcome to Our Academy
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#102B46] tracking-tight uppercase font-['Manrope']">
                Shaping Minds, Inspiring Excellence & Building Character
              </h2>
              <p className="text-slate-600 text-base leading-relaxed">
                At <strong className="text-[#102B46]">{SCHOOL_INFO.name}</strong>, we believe every child is a unique treasury of potential. Spanning our Creche, Primary, and Secondary sections, we provide a structured, nurturing, and intellectually stimulating environment designed to foster curiosity, discipline, and lifelong success.
              </p>
              <p className="text-slate-600 text-base leading-relaxed">
                Our curriculum seamlessly combines rigorous academics with practical skill development, moral grounding, and extracurricular engagement, ensuring our graduates stand out as future leaders of integrity.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="flex items-center gap-3 bg-[#F5F3ED] p-3.5 rounded-xl border border-slate-200">
                  <CheckCircle2 className="w-5 h-5 text-[#102B46] shrink-0" />
                  <span className="text-sm font-bold text-[#102B46]">Experienced Educators</span>
                </div>
                <div className="flex items-center gap-3 bg-[#F5F3ED] p-3.5 rounded-xl border border-slate-200">
                  <CheckCircle2 className="w-5 h-5 text-[#102B46] shrink-0" />
                  <span className="text-sm font-bold text-[#102B46]">Safe & Secure Campus</span>
                </div>
              </div>

              <div className="pt-4 flex items-center gap-4">
                <NavLink
                  to="/about"
                  className="inline-flex items-center gap-2 bg-[#102B46] hover:bg-[#091C30] text-white px-6 py-3 rounded-xl font-bold text-sm shadow-md transition-colors"
                >
                  <span>Read Our Full Story</span>
                  <ArrowRight className="w-4 h-4 text-[#D9B76A]" />
                </NavLink>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Educational Levels Section */}
      <section className="py-20 bg-[#F5F3ED]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            subtitle="Our Educational Sections"
            title="Tailored Learning for Every Stage of Growth"
            description="From early childhood care to adolescent academic preparation, we offer comprehensive programs custom-built for each developmental milestone."
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {educationalLevels.map((level, idx) => (
              <div 
                key={idx}
                className="bg-white rounded-3xl overflow-hidden shadow-lg border border-slate-200 flex flex-col group transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl"
              >
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={level.image}
                    alt={level.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#102B46]/80 via-transparent to-transparent"></div>
                  <span className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md bg-white/90 text-[#102B46]`}>
                    {level.subtitle}
                  </span>
                </div>

                <div className="p-6 sm:p-8 flex flex-col flex-1 justify-between gap-6">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-[#102B46] mb-3 font-['Manrope']">
                      {level.title}
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      {level.desc}
                    </p>
                  </div>

                  <NavLink
                    to={level.path}
                    className="inline-flex items-center justify-between w-full bg-[#F5F3ED] group-hover:bg-[#102B46] group-hover:text-white text-[#102B46] px-5 py-3 rounded-xl font-bold text-sm transition-colors"
                  >
                    <span>Learn More</span>
                    <ChevronRight className="w-4 h-4 text-[#D9B76A]" />
                  </NavLink>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Our School Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            subtitle="Why Choose Us"
            title="The Father Abraham Advantage"
            description="Discover what makes our institution the premier choice for parents seeking uncompromising excellence in education and character."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {whyChooseUs.map((item, idx) => (
              <div
                key={idx}
                className="bg-[#F5F3ED]/50 p-8 rounded-3xl border border-slate-200/80 flex flex-col gap-4 hover:bg-white hover:shadow-xl transition-all duration-300 group"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#102B46] flex items-center justify-center shadow-md group-hover:bg-[#091C30] transition-colors">
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold text-[#102B46] font-['Manrope']">
                  {item.title}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* News & Events Section */}
      <section className="py-20 bg-[#F5F3ED]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-12 gap-4">
            <div>
              <span className="inline-block px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-[#D9B76A]/20 text-[#102B46] mb-3">
                Latest Updates
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#102B46] tracking-tight uppercase font-['Manrope']">
                News & School Events
              </h2>
            </div>
            <NavLink
              to="/news"
              className="inline-flex items-center gap-2 bg-[#102B46] hover:bg-[#091C30] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow transition-colors"
            >
              <span>View All News</span>
              <ArrowRight className="w-4 h-4 text-[#D9B76A]" />
            </NavLink>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {NEWS_ITEMS.slice(0, 3).map((news) => (
              <div
                key={news.id}
                className="bg-white rounded-3xl overflow-hidden shadow-lg border border-slate-200 flex flex-col group"
              >
                <div className="relative h-52 overflow-hidden">
                  <img
                    src={news.image}
                    alt={news.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <span className="absolute top-4 left-4 bg-[#102B46] text-[#D9B76A] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    {news.category}
                  </span>
                </div>
                <div className="p-6 flex flex-col flex-1 justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                      <Calendar className="w-3.5 h-3.5 text-[#D9B76A]" />
                      <span>{news.date}</span>
                    </div>
                    <h3 className="text-lg font-bold text-[#102B46] mb-2 font-['Manrope'] line-clamp-2">
                      {news.title}
                    </h3>
                    <p className="text-slate-600 text-sm line-clamp-3 leading-relaxed">
                      {news.excerpt}
                    </p>
                  </div>
                  <NavLink
                    to="/news"
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-[#102B46] hover:text-[#D9B76A] transition-colors pt-2"
                  >
                    <span>Read Full Article</span>
                    <ChevronRight className="w-4 h-4" />
                  </NavLink>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery Preview Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-12 gap-4">
            <div>
              <span className="inline-block px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-[#102B46]/10 text-[#102B46] mb-3">
                Campus Life
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#102B46] tracking-tight uppercase font-['Manrope']">
                Photo Gallery Preview
              </h2>
            </div>
            <NavLink
              to="/gallery"
              className="inline-flex items-center gap-2 bg-[#102B46] hover:bg-[#091C30] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow transition-colors"
            >
              <span>View Full Gallery</span>
              <ArrowRight className="w-4 h-4 text-[#D9B76A]" />
            </NavLink>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {GALLERY_ITEMS.slice(0, 6).map((item) => (
              <div
                key={item.id}
                onClick={() => setLightboxImage(item.image)}
                className="relative h-64 rounded-3xl overflow-hidden shadow-md group cursor-pointer border border-slate-200"
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#102B46]/90 via-[#102B46]/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                  <span className="text-xs font-bold text-[#D9B76A] uppercase tracking-wider mb-1">
                    {item.category}
                  </span>
                  <h4 className="text-lg font-bold text-white font-['Manrope']">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-300 mt-1">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center">
            <img
              src={lightboxImage}
              alt="Enlarged view"
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl border-2 border-white/20"
            />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white p-3 rounded-full text-lg transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Admissions CTA Banner */}
      <section className="py-20 bg-gradient-to-r from-[#091C30] via-[#102B46] to-[#091C30] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#D9B76A_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center gap-6">
          <span className="px-4 py-1.5 rounded-full bg-[#D9B76A] text-[#102B46] text-xs font-extrabold uppercase tracking-widest shadow">
            Online Admissions Portal
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight uppercase font-['Manrope']">
            Give Your Child a Stronger Foundation for the Future
          </h2>
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
            Secure your child’s place at {SCHOOL_INFO.name}. Experience excellence in academics, character development, and holistic growth.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
            <NavLink
              to="/apply"
              className="w-full sm:w-auto bg-[#D9B76A] hover:bg-[#c9a658] text-[#102B46] px-8 py-4 rounded-xl font-extrabold text-base shadow-xl transition-all hover:scale-105"
            >
              Apply for Admission
            </NavLink>
            <NavLink
              to="/contact"
              className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white border border-white/20 px-8 py-4 rounded-xl font-bold text-base transition-all"
            >
              Contact the School
            </NavLink>
          </div>
        </div>
      </section>

    </div>
  );
};
