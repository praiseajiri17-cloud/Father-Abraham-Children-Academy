import React, { useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { SectionHeading } from '../../components/common/SectionHeading';
import { NEWS_ITEMS } from '../../constants/data';
import { NewsItem } from '../../types';
import { Calendar, User, ArrowRight, X } from 'lucide-react';

export const News: React.FC = () => {
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="News & Events"
        subtitle="Stay updated with the latest happenings, academic fairs, sports tournaments, and circulars."
        breadcrumbs={[{ name: 'News & Events' }]}
      />

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            subtitle="Announcements"
            title="Latest School Updates"
            description="Explore our recent school achievements, upcoming events, and official circulars."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
            {NEWS_ITEMS.map((news) => (
              <div
                key={news.id}
                className="bg-[#F5F3ED] rounded-3xl overflow-hidden shadow-lg border border-slate-200 flex flex-col md:flex-row group cursor-pointer"
                onClick={() => setSelectedNews(news)}
              >
                <div className="md:w-1/2 relative h-64 md:h-auto overflow-hidden">
                  <img
                    src={news.image}
                    alt={news.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <span className="absolute top-4 left-4 bg-[#102B46] text-[#D9B76A] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    {news.category}
                  </span>
                </div>
                <div className="md:w-1/2 p-6 sm:p-8 flex flex-col justify-between gap-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#D9B76A]" /> {news.date}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-[#102B46] font-['Manrope'] group-hover:text-[#D9B76A] transition-colors">
                      {news.title}
                    </h3>
                    <p className="text-slate-600 text-sm line-clamp-3 leading-relaxed">
                      {news.excerpt}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedNews(news)}
                    className="inline-flex items-center gap-2 text-sm font-bold text-[#102B46] hover:text-[#D9B76A] transition-colors pt-2"
                  >
                    <span>Read Full Article</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* News Detail Modal */}
      {selectedNews && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setSelectedNews(null)}
        >
          <div 
            className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-10 relative shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedNews(null)}
              className="absolute top-6 right-6 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#102B46] text-[#D9B76A] mb-4">
              {selectedNews.category}
            </span>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#102B46] mb-4 font-['Manrope']">
              {selectedNews.title}
            </h2>

            <div className="flex items-center gap-6 text-xs text-slate-500 mb-6 pb-6 border-b border-slate-200">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4 text-[#D9B76A]" /> {selectedNews.date}
              </span>
              <span className="flex items-center gap-1">
                <User className="w-4 h-4 text-[#D9B76A]" /> {selectedNews.author}
              </span>
            </div>

            <div className="rounded-2xl overflow-hidden mb-6 h-72">
              <img
                src={selectedNews.image}
                alt={selectedNews.title}
                className="w-full h-full object-cover"
              />
            </div>

            <p className="text-slate-700 text-base leading-relaxed mb-6">
              {selectedNews.content}
            </p>

            <button
              onClick={() => setSelectedNews(null)}
              className="bg-[#102B46] text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-[#091C30]"
            >
              Close Article
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
