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
    <section id="about-twings" className="py-16 bg-slate-50 border-t border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-[#00388A] via-[#0050D8] to-[#0073C1] text-white rounded-3xl p-8 sm:p-12 lg:p-14 shadow-xl relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-12 w-72 h-72 bg-blue-300/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Column: Brand Story & Call to Action */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-400/20 border border-blue-300/30 text-amber-300 text-xs font-bold uppercase tracking-widest backdrop-blur-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                {title}
              </div>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-wide uppercase leading-tight">
                {subtitle}
              </h2>

              <p className="text-blue-100 text-xs sm:text-sm leading-relaxed text-justify line-clamp-4">
                {lead}
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={onNavigateToAbout}
                  className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-blue-950 font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  <span>Tìm hiểu về TWings Academy</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={onOpenConsultation}
                  className="px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer backdrop-blur-xs"
                >
                  Đăng ký tư vấn
                </button>
              </div>
            </div>

            {/* Right Column: 3 Feature Cards */}
            <div className="lg:col-span-5 space-y-3.5">
              {highlights.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div 
                    key={idx}
                    className="p-4.5 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm flex items-start gap-4 hover:bg-white/15 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-300/40 text-amber-300 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm mb-1">
                        {item.title}
                      </h4>
                      <p className="text-xs text-blue-100/90 leading-relaxed">
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

