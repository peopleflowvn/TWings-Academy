import React from 'react';

interface IntroSectionProps {
  onScrollToSection: (sectionId: string) => void;
}

export const IntroSection: React.FC<IntroSectionProps> = ({ onScrollToSection }) => {
  const categoryTiles = [
    {
      id: 'section-bestsellers',
      title: 'KHÓA HỌC BÁN CHẠY NHẤT',
      image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'section-recommended',
      title: 'ĐƯỢC ĐỀ XUẤT CHO BẠN',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'section-new',
      title: 'KHÓA HỌC MỚI RA MẮT',
      image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'section-useful',
      title: 'KHÓA HỌC HỮU ÍCH NHẤT',
      image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80',
    }
  ];

  return (
    <section className="bg-[#D8ECFD] py-14 px-4 sm:px-6 lg:px-8 border-b border-blue-200">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Section Heading matching Screenshot 1 & 2 */}
        <div className="text-center space-y-2 max-w-3xl mx-auto">
          <div className="text-xs sm:text-sm font-bold text-[#FF5722] tracking-widest uppercase">
            TWINGS ACADEMY
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#FF5722] tracking-tight">
            NÂNG TẦM NĂNG LỰC, KIẾN TẠO TƯƠNG LAI
          </h2>
          <p className="text-xs sm:text-sm text-[#00388A] italic leading-relaxed pt-1">
            TWings Academy giúp bạn phát triển nhanh những năng lực thực tiễn, thích ứng với thị trường lao động không ngừng thay đổi và chủ động tiến xa trên hành trình sự nghiệp.
          </p>
        </div>

        {/* 4 Category Cards matching Screenshot 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categoryTiles.map((tile) => (
            <div
              key={tile.id}
              onClick={() => onScrollToSection(tile.id)}
              className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer border border-blue-100 transform hover:-translate-y-1"
            >
              <div className="h-56 overflow-hidden bg-slate-100 relative">
                <img
                  src={tile.image}
                  alt={tile.title}
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="bg-[#FF5722] group-hover:bg-[#E64A19] text-white py-3.5 px-3 text-center transition-colors">
                <h3 className="text-xs sm:text-sm font-black tracking-wide uppercase">
                  {tile.title}
                </h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
