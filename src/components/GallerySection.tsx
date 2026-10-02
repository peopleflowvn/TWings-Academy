import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { GalleryPhoto } from '../types';

interface GallerySectionProps {
  title: string;
  photos: GalleryPhoto[];
  onOpenRegister: () => void;
}

export const GallerySection: React.FC<GallerySectionProps> = ({
  title,
  photos,
  onOpenRegister,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const prevPhoto = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const nextPhoto = () => {
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  };

  return (
    <section className="py-16 bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Centered Orange CTA Button matching Screenshot 8 */}
        <div className="text-center">
          <button
            onClick={onOpenRegister}
            className="px-10 py-3.5 bg-[#FF5722] hover:bg-[#E64A19] text-white font-black text-sm uppercase tracking-widest rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer"
          >
            ĐĂNG KÝ NGAY
          </button>
        </div>

        {/* Section Heading matching Screenshot 8 */}
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-black text-[#FF5722] tracking-wider uppercase inline-block pb-2 border-b-2 border-orange-200">
            {title}
          </h2>
        </div>

        {/* Large Carousel Viewport */}
        {photos.length > 0 && (
          <div className="space-y-4">
            <div className="relative aspect-video max-h-[500px] w-full rounded-2xl overflow-hidden shadow-2xl bg-slate-900 border border-slate-200">
              <img
                src={photos[currentIndex].url}
                alt={photos[currentIndex].caption}
                className="w-full h-full object-cover"
              />

              {/* Caption Overlay */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 sm:p-6 text-white text-xs sm:text-sm font-medium">
                {photos[currentIndex].caption}
              </div>

              {/* Navigation Arrows */}
              <button
                onClick={prevPhoto}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/40 hover:bg-black/70 text-white transition-colors cursor-pointer"
                title="Ảnh trước"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <button
                onClick={nextPhoto}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/40 hover:bg-black/70 text-white transition-colors cursor-pointer"
                title="Ảnh tiếp"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* Thumbnails Row matching Screenshot 8 */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {photos.map((p, idx) => (
                <button
                  key={p.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-20 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    currentIndex === idx
                      ? 'border-[#FF5722] scale-105 shadow-md'
                      : 'border-slate-200 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={p.url}
                    alt={p.caption}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
