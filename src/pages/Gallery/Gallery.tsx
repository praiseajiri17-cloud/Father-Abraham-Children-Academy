import React, { useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { SectionHeading } from '../../components/common/SectionHeading';
import { GALLERY_ITEMS } from '../../constants/data';
import { GalleryItem } from '../../types';

export const Gallery: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [lightboxImage, setLightboxImage] = useState<GalleryItem | null>(null);

  const categories = ['All', 'Campus', 'Creche', 'Classrooms', 'Sports', 'Cultural'];

  const filteredItems = activeCategory === 'All' 
    ? GALLERY_ITEMS 
    : GALLERY_ITEMS.filter(item => item.category === activeCategory);

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="Photo Gallery"
        subtitle="Take a visual tour of our campus, modern laboratories, creche, sports facilities, and student activities."
        breadcrumbs={[{ name: 'Gallery' }]}
      />

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            subtitle="Visual Showcase"
            title="Life at Father Abraham Children Academy"
            description="Browse through categorized photos capturing our dynamic learning environment."
          />

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${activeCategory === cat ? 'bg-[#102B46] text-white shadow-md' : 'bg-[#F5F3ED] text-slate-700 hover:bg-slate-200'}`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Gallery Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => setLightboxImage(item)}
                className="relative h-80 rounded-3xl overflow-hidden shadow-lg group cursor-pointer border border-slate-200"
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#102B46]/95 via-[#102B46]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                  <span className="text-xs font-bold text-[#D9B76A] uppercase tracking-wider mb-1">
                    {item.category}
                  </span>
                  <h3 className="text-xl font-bold text-white font-['Manrope']">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
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
          <div 
            className="relative max-w-4xl w-full bg-[#102B46] rounded-3xl overflow-hidden shadow-2xl border-2 border-white/20 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-[65vh] w-full bg-black">
              <img
                src={lightboxImage.image}
                alt={lightboxImage.title}
                className="w-full h-full object-contain"
              />
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white p-3 rounded-full transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6 text-white flex flex-col gap-2 bg-[#091C30]">
              <span className="text-xs font-bold text-[#D9B76A] uppercase tracking-wider">
                {lightboxImage.category}
              </span>
              <h3 className="text-2xl font-bold font-['Manrope']">
                {lightboxImage.title}
              </h3>
              <p className="text-sm text-slate-300">
                {lightboxImage.description}
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
