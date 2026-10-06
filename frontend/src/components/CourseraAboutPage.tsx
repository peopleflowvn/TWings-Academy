import React from 'react';
import { 
  Target, 
  Award, 
  Sparkles, 
  CheckCircle2, 
  Building2, 
  Users, 
  ArrowRight, 
  Compass, 
  TrendingUp, 
  ShieldCheck, 
  GraduationCap,
  BookOpen,
  Briefcase
} from 'lucide-react';
import { CMSSectionsConfig } from '../types';

interface CourseraAboutPageProps {
  aboutData?: CMSSectionsConfig['about'];
  onNavigate: (view: 'home' | 'catalog' | 'course-detail' | 'articles' | 'article-detail' | 'about' | 'cms') => void;
  onOpenConsultation: () => void;
}

export const CourseraAboutPage: React.FC<CourseraAboutPageProps> = ({ 
  aboutData, 
  onNavigate,
  onOpenConsultation 
}) => {
  const title = aboutData?.title || 'TWINGS ACADEMY';
  const subtitle = aboutData?.subtitle || 'HỌC VIỆN TIÊN PHONG TRONG MÔ HÌNH ĐÀO TẠO THỰC CHIẾN';
  const lead = aboutData?.lead || 'TWings Academy - Học viện tiên phong với mô hình đào tạo thực chiến trong lĩnh vực tài chính - ngân hàng, nay mở rộng hệ sinh thái học tập với các khóa học Short course: chương trình đào tạo ngắn hạn, tập trung, ứng dụng cao, giúp học viên nhanh chóng nắm bắt kiến thức trọng tâm và nâng cấp kỹ năng cần thiết cho học tập, công việc và định hướng nghề nghiệp.\n\nBên cạnh các khóa đào tạo thực chiến chuyên sâu, TWings Academy phát triển các khóa học Short course nhằm đáp ứng nhu cầu học nhanh, học đúng trọng tâm, học để ứng dụng ngay. Với triết lý "Học đi đôi với hành", các chương trình được thiết kế tinh gọn nhưng thực tiễn, cập nhật xu hướng mới trong ngành tài chính - ngân hàng và các kỹ năng nghề nghiệp hiện đại.';
  const vision = aboutData?.vision || 'Trở thành học viện hàng đầu Việt Nam về đào tạo thực chiến và đào tạo ngắn hạn trong lĩnh vực tài chính - ngân hàng, là cầu nối uy tín giúp học viên, sinh viên và người đi làm nâng cao năng lực nghề nghiệp, sẵn sàng thích ứng với nhu cầu ngày càng khắt khe của thị trường lao động.';
  
  const mission = aboutData?.mission && aboutData.mission.length > 0 ? aboutData.mission : [
    'Cung cấp các chương trình đào tạo thực chiến và khóa học Short course ngắn hạn, tập trung vào kiến thức cốt lõi, kỹ năng thực tiễn và khả năng ứng dụng ngay sau học.',
    'Xây dựng môi trường học tập năng động, linh hoạt, phù hợp với học viên, sinh viên và người đi làm có nhu cầu nâng cấp năng lực trong thời gian ngắn.',
    'Đồng hành cùng học viên trong quá trình định hướng nghề nghiệp, phát triển kỹ năng và gia tăng lợi thế cạnh tranh trên thị trường tài chính - ngân hàng.'
  ];

  const coreValues = aboutData?.coreValues && aboutData.coreValues.length > 0 ? aboutData.coreValues : [
    'Thấu hiểu: Lắng nghe nhu cầu học tập và định hướng nghề nghiệp của học viên.',
    'Thực tiễn: Tập trung vào kiến thức và kỹ năng có thể áp dụng ngay.',
    'Tinh gọn: Thiết kế nội dung ngắn hạn, cô đọng, đúng trọng tâm.',
    'Sáng tạo: Không ngừng đổi mới nội dung và phương pháp đào tạo.',
    'Nâng tầm: Đồng hành cùng học viên mở rộng cơ hội nghề nghiệp.'
  ];

  // Parse core values into title and description
  const parsedCoreValues = coreValues.map((cv, index) => {
    const parts = cv.split(':');
    const name = parts[0]?.trim() || `Giá trị ${index + 1}`;
    const desc = parts.slice(1).join(':').trim() || cv;
    return { name, desc };
  });

  const stats = [
    { value: '100%', label: 'Giảng viên chuyên gia thực chiến ngân hàng', icon: Briefcase },
    { value: '5000+', label: 'Học viên & chuyên viên đã được đào tạo', icon: Users },
    { value: '95%', label: 'Học viên ứng dụng thành công vào công việc', icon: TrendingUp },
    { value: 'Đối tác', label: 'Bảo trợ nghề nghiệp bởi MSB & ROX Group', icon: Building2 },
  ];

  const coreValueIcons = [Compass, CheckCircle2, Sparkles, Award, TrendingUp];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* 1. Hero Section */}
      <section className="relative bg-gradient-to-br from-[#002D72] via-[#0047BA] to-[#0073C1] text-white py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Subtle decorative circles */}
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-12 w-80 h-80 bg-blue-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-300/30 text-amber-300 text-xs font-bold uppercase tracking-widest backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            {title}
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight uppercase leading-tight">
            {subtitle}
          </h1>

          <p className="max-w-3xl mx-auto text-sm sm:text-base text-blue-100 font-normal leading-relaxed">
            Học viện đào tạo thực chiến lĩnh vực Tài chính - Ngân hàng, kết nối nguồn nhân lực chất lượng cao với các định chế tài chính hàng đầu.
          </p>

          <div className="pt-4 flex flex-wrap justify-center gap-4">
            <button
              onClick={() => onNavigate('catalog')}
              className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-blue-950 font-bold text-xs sm:text-sm rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center gap-2 cursor-pointer"
            >
              <span>Khám phá khóa học</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenConsultation}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold text-xs sm:text-sm rounded-xl transition-all backdrop-blur-xs cursor-pointer"
            >
              Đăng ký nhận tư vấn
            </button>
          </div>
        </div>
      </section>

      {/* 2. Key Stats Bar */}
      <section className="max-w-6xl mx-auto px-4 -mt-8 relative z-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white p-6 rounded-2xl shadow-xl border border-slate-100">
          {stats.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div key={idx} className="flex flex-col items-center text-center p-3 border-r last:border-r-0 border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0073C1] flex items-center justify-center mb-2">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900">{s.value}</div>
                <div className="text-[11px] sm:text-xs text-slate-500 font-medium mt-1 leading-snug">{s.label}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Về chúng tôi & Giới thiệu chi tiết */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-slate-200/80 space-y-6">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-8 bg-[#0073C1] rounded-full" />
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-wide">
              Hệ Sinh Thái Đào Tạo & Các Khóa Học Short Course
            </h2>
          </div>

          <div className="text-slate-700 leading-relaxed text-sm sm:text-base space-y-4">
            {lead.split('\n\n').map((paragraph, pIdx) => (
              <p key={pIdx} className="text-justify">
                {paragraph}
              </p>
            ))}
          </div>

          {/* Triết lý nổi bật */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#0073C1] text-white flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm sm:text-base mb-1">
                Triết lý "Học đi đôi với hành" (Learn by Doing)
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Các chương trình được thiết kế tinh gọn nhưng thực tiễn, cập nhật xu hướng mới nhất trong ngành tài chính - ngân hàng và các kỹ năng nghề nghiệp hiện đại, giúp bạn sẵn sàng thích nghi và bứt phá ngay trong công việc.
              </p>
            </div>
          </div>
        </div>

        {/* 4. Tầm nhìn & Sứ mệnh (2 Cột hiện đại) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Tầm nhìn Card */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Target className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                Tầm Nhìn Chiến Lược
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed text-justify">
                {vision}
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100 text-xs font-semibold text-amber-600 flex items-center gap-1.5">
              <span>Học viện hàng đầu Việt Nam về đào tạo thực chiến</span>
            </div>
          </div>

          {/* Sứ mệnh Card */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-[#0073C1] flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                Sứ Mệnh Hành Động
              </h3>
              <ul className="space-y-3">
                {mission.map((m, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span className="leading-snug">{m}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="pt-4 border-t border-slate-100 text-xs font-semibold text-blue-600 flex items-center gap-1.5">
              <span>Đồng hành cùng sự nghiệp tài chính của học viên</span>
            </div>
          </div>
        </div>

        {/* 5. Giá trị cốt lõi (Grid 5 cards) */}
        <div className="space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <div className="text-xs font-bold text-[#0073C1] uppercase tracking-wider">
              Nền tảng phát triển
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              5 Giá Trị Cốt Lõi Tại TWings Academy
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {parsedCoreValues.map((val, idx) => {
              const Icon = coreValueIcons[idx % coreValueIcons.length];
              return (
                <div 
                  key={idx}
                  className={`bg-white rounded-2xl p-6 border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-3 ${
                    idx === parsedCoreValues.length - 1 && parsedCoreValues.length % 3 === 2 ? 'sm:col-span-2 lg:col-span-1' : ''
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0073C1] flex items-center justify-center font-bold">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900">
                    {idx + 1}. {val.name}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {val.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 6. Đối tác đồng hành & Bảo trợ chuyên môn */}
        <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-3xl p-8 sm:p-12 space-y-6">
          <div className="max-w-2xl space-y-3">
            <span className="text-xs font-bold text-blue-300 uppercase tracking-widest">
              ĐỐI TÁC HÀNG ĐẦU
            </span>
            <h3 className="text-xl sm:text-3xl font-black tracking-tight">
              Bảo trợ chuyên môn & Cơ hội việc làm
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Các chương trình tại TWings Academy được xây dựng phối hợp với các chuyên gia cấp cao từ Ngân hàng Hàng Hải Việt Nam (MSB), Tập đoàn ROX và hệ thống đối tác tài chính uy tín, giúp học viên tiếp cận tiêu chuẩn làm việc thực tế ngay từ khi bắt đầu học.
            </p>
          </div>

          <div className="pt-4 flex flex-wrap gap-4 items-center">
            <button
              onClick={() => onNavigate('catalog')}
              className="px-5 py-3 bg-[#0073C1] hover:bg-blue-600 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Xem danh mục khóa học
            </button>
            <button
              onClick={onOpenConsultation}
              className="px-5 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Đăng ký tư vấn lộ trình
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
