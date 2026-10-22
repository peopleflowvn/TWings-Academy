import React from 'react';
import { Target, Award, Sparkles, CheckCircle2, ArrowRight, ShieldCheck, Users, Briefcase } from 'lucide-react';
import { CMSSectionsConfig } from '../types';

interface AboutSectionProps {
  aboutData: CMSSectionsConfig['about'];
  onNavigateToAbout?: () => void;
  onOpenConsultation?: () => void;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ 
  aboutData, 
  onNavigateToAbout,
  onOpenConsultation 
}) => {
  const title = aboutData?.title || 'TWINGS ACADEMY';
  const subtitle = aboutData?.subtitle || 'HỌC VIỆN TIÊN PHONG TRONG MÔ HÌNH ĐÀO TẠO THỰC CHIẾN';
  const lead = aboutData?.lead || 'TWings Academy - Học viện tiên phong với mô hình đào tạo thực chiến trong lĩnh vực tài chính - ngân hàng, nay mở rộng hệ sinh thái học tập với các khóa học Short course: chương trình đào tạo ngắn hạn, tập trung, ứng dụng cao, giúp học viên nhanh chóng nắm bắt kiến thức trọng tâm và nâng cấp kỹ năng cần thiết cho học tập, công việc và định hướng nghề nghiệp.\n\nBên cạnh các khóa đào tạo thực chiến chuyên sâu, TWings Academy phát triển các khóa học Short course nhằm đáp ứng nhu cầu học nhanh, học đúng trọng tâm, học để ứng dụng ngay. Với triết lý "Học đi đôi với hành", các chương trình được thiết kế tinh gọn nhưng thực tiễn, cập nhật xu hướng mới trong ngành tài chính - ngân hàng và các kỹ năng nghề nghiệp hiện đại.';

  // Highlight points for homepage cards
  const highlights = [
    {
      title: 'Mô hình đào tạo thực chiến',
      desc: 'Giảng dạy dựa trên case study nghiệp vụ thực tế từ ngân hàng thương mại và định chế tài chính.',
      icon: Briefcase,
    },
    {
      title: 'Hệ sinh thái Short Course',
      desc: 'Thiết kế tinh gọn, học đúng trọng tâm, ứng dụng ngay vào công việc và định hướng nghề nghiệp.',
      icon: Sparkles,
    },
    {
      title: 'Bảo lãnh nghề nghiệp',
      desc: 'Cơ hội kết nối thực tập và tuyển dụng trực tiếp tại MSB Bank và hệ thống đối tác.',
      icon: ShieldCheck,
    }
  ];

  return (
    <section id="about-twings" className="py-12 sm:py-20 bg-slate-50 border-t border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-[#001D4A] via-[#00388A] to-[#005FA0] text-white rounded-3xl p-6 sm:p-12 lg:p-16 shadow-2xl relative overflow-hidden border border-blue-400/20">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-80 h-80 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-12 w-80 h-80 bg-blue-400/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 lg:gap-14 items-center">
            {/* Left Column: Brand Story & Call to Action */}
            <div className="lg:col-span-7 space-y-4 sm:space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-400/20 border border-blue-300/30 text-amber-300 text-xs font-extrabold uppercase tracking-widest backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span>{title}</span>
              </div>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight uppercase leading-tight">
                {subtitle}
              </h2>

              <p className="text-blue-100/90 text-xs sm:text-sm leading-relaxed line-clamp-4 sm:line-clamp-none">
                {lead}
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <button
                  onClick={onNavigateToAbout}
                  className="px-6 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl transition-all shadow-lg hover:shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer hover:scale-102"
                >
                  <span>Tìm hiểu về TWings Academy</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={onOpenConsultation}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer backdrop-blur-md flex items-center justify-center hover:scale-102"
                >
                  Đăng ký tư vấn ngay
                </button>
              </div>
            </div>

            {/* Right Column: 3 Feature Cards */}
            <div className="lg:col-span-5 space-y-3 sm:space-y-4 pt-2 lg:pt-0">
              {highlights.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div 
                    key={idx}
                    className="p-4 sm:p-5 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md flex items-start gap-3.5 sm:gap-4 hover:bg-white/15 hover:border-white/25 transition-all group"
                  >
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-400/20 border border-amber-300/40 text-amber-300 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-108 transition-transform">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-white text-sm sm:text-base mb-1">
                        {item.title}
                      </h4>
                      <p className="text-xs text-blue-100/80 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
