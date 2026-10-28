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
  Briefcase,
  Layers,
  HeartHandshake,
  Lightbulb,
  Check,
  ChevronRight,
  PhoneCall
} from 'lucide-react';
import { CMSSectionsConfig } from '../types';

interface CourseraAboutPageProps {
  aboutData?: CMSSectionsConfig['about'];
  /** The instructors, photos and partners staff manage in /app (homepage sections); empty: not shown. */
  instructors: CMSSectionsConfig['instructors']['items'];
  photos: CMSSectionsConfig['gallery']['photos'];
  partners: CMSSectionsConfig['partners']['items'];
  onNavigate: (view: 'home' | 'catalog' | 'course-detail' | 'articles' | 'article-detail' | 'about') => void;
  onOpenConsultation: () => void;
}

export const CourseraAboutPage: React.FC<CourseraAboutPageProps> = ({ 
  aboutData, 
  instructors,
  photos,
  partners,
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

  const coreValues = [
    {
      name: 'Thấu hiểu (Empathy)',
      desc: 'Lắng nghe nhu cầu học tập, thấu hiểu điểm xuất phát và đồng hành định hướng mục tiêu sự nghiệp riêng của từng học viên.',
      icon: HeartHandshake,
      badge: '01'
    },
    {
      name: 'Thực tiễn (Practicality)',
      desc: '100% nội dung xuất phát từ case study thực tế, hồ sơ tín dụng và quy trình nghiệp vụ đang áp dụng tại hệ thống ngân hàng.',
      icon: CheckCircle2,
      badge: '02'
    },
    {
      name: 'Tinh gọn (Agility)',
      desc: 'Thiết kế chương trình Short course ngắn hạn, cô đọng, đúng trọng tâm: học nhanh - nắm chắc - ứng dụng được ngay hôm sau.',
      icon: Layers,
      badge: '03'
    },
    {
      name: 'Sáng tạo (Innovation)',
      desc: 'Tiên phong cập nhật xu thế chuyển đổi số, Generative AI, AI Agents và tự động hóa quy trình nghiệp vụ ngân hàng hiện đại.',
      icon: Lightbulb,
      badge: '04'
    },
    {
      name: 'Nâng tầm (Elevation)',
      desc: 'Cầu nối bảo trợ việc làm, mở rộng mạng lưới quan hệ và chắp cánh giúp học viên tự tin thăng tiến lên các vị trí quản lý.',
      icon: TrendingUp,
      badge: '05'
    }
  ];

  const stats = [
    { value: '100%', label: 'Giảng viên cấp Giám đốc', sub: '20+ năm kinh nghiệm ngân hàng', icon: Briefcase },
    { value: '5.000+', label: 'Học viên đã tốt nghiệp', sub: 'Đã và đang làm việc tại các Bank', icon: Users },
    { value: '95%', label: 'Tỷ lệ ứng dụng thực tế', sub: 'Vượt qua vòng phỏng vấn tuyển dụng', icon: TrendingUp },
    { value: 'Độc quyền', label: 'Bảo trợ việc làm tại MSB', sub: 'Hệ sinh thái đối tác ROX Group', icon: Building2 },
  ];

  const pillars = [
    {
      title: 'Hồ sơ & Case Study thật 100%',
      desc: 'Học viên trực tiếp xử lý các bộ hồ sơ thẩm định tín dụng, bóc tách báo cáo CIC và tài chính từ các chi nhánh ngân hàng thương mại thực tế.',
      icon: ShieldCheck,
      color: 'bg-[#D7F5FF] text-[#0073C1]'
    },
    {
      title: 'Hệ sinh thái Short Course',
      desc: 'Thời lượng tinh gọn từ 20 đến 45 giờ học tập trung, tối ưu thời gian cho sinh viên chuẩn bị ra trường và nhân sự đang đi làm.',
      icon: Sparkles,
      color: 'bg-orange-50 text-[#EA580C]'
    },
    {
      title: 'Bảo lãnh cơ hội phỏng vấn',
      desc: 'Học viên đạt chứng nhận tốt nghiệp được kết nối phỏng vấn trực tiếp vào hệ thống Ngân hàng MSB và các đối tác tài chính lớn.',
      icon: Award,
      color: 'bg-emerald-50 text-emerald-700'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-[#424242]">
      {/* 1. Hero Section: Rich Brand Navy Atmosphere */}
      <section className="relative bg-gradient-to-b from-[#182046] via-[#263060] to-[#151B3B] text-white pt-16 sm:pt-24 pb-24 sm:pb-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Ambient brand glow lighting */}
        <div className="absolute top-0 left-1/4 w-[550px] h-[350px] bg-[#5FBEFF]/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[300px] bg-[#0073C1]/20 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center space-y-6 sm:space-y-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#D7F5FF]/10 border border-[#5FBEFF]/30 text-[#5FBEFF] text-xs font-bold uppercase tracking-widest backdrop-blur-md shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#5FBEFF] animate-pulse" />
            <span>Học viện Đào tạo Thực chiến Tài chính – Ngân hàng</span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-tight uppercase font-sans">
            NÂNG TẦM NĂNG LỰC,{' '}
            <span className="bg-gradient-to-r from-[#5FBEFF] via-[#2C93E8] to-[#0073C1] bg-clip-text text-transparent">
              KIẾN TẠO TƯƠNG LAI
            </span>
          </h1>

          <p className="max-w-3xl mx-auto text-sm sm:text-base md:text-lg text-slate-200 font-normal leading-relaxed">
            TWings Academy là học viện tiên phong tại Việt Nam thu hẹp khoảng cách giữa giảng đường lý thuyết và thực tiễn khắt khe của ngành ngân hàng, đào tạo nhân sự thực chiến sẵn sàng bứt phá sự nghiệp.
          </p>

          <div className="pt-2 sm:pt-4 flex flex-wrap justify-center gap-3.5 sm:gap-4">
            <button
              onClick={() => onNavigate('catalog')}
              className="px-6 sm:px-8 py-3.5 bg-gradient-to-r from-[#5FBEFF] via-[#0073C1] to-[#0E6BBB] hover:brightness-110 text-white font-black text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 cursor-pointer hover:scale-102"
            >
              <span>Khám phá các khóa học</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenConsultation}
              className="px-6 sm:px-8 py-3.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs sm:text-sm rounded-xl transition-all backdrop-blur-md cursor-pointer hover:scale-102 flex items-center gap-2"
            >
              <PhoneCall className="w-4 h-4 text-[#5FBEFF]" />
              <span>Đăng ký nhận tư vấn 1-1</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. Key Stats Bar: Floating Elevation with Brand Colors */}
      <section className="max-w-6xl mx-auto px-4 -mt-12 sm:-mt-16 relative z-20">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 bg-white p-4 sm:p-7 rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-900/5 border border-[#E1E6EA]">
          {stats.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div 
                key={idx} 
                className="flex flex-col items-center text-center p-3 sm:p-4 rounded-2xl hover:bg-slate-50/80 transition-colors border border-transparent hover:border-[#E1E6EA]"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#D7F5FF] text-[#0073C1] flex items-center justify-center mb-2.5 shadow-2xs">
                  <Icon className="w-6 h-6" />
                </div>
                <div className="text-xl sm:text-3xl font-black text-[#263060] tracking-tight">{s.value}</div>
                <div className="text-xs sm:text-sm font-bold text-slate-800 mt-1 leading-snug">{s.label}</div>
                <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5">{s.sub}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Về chúng tôi & Triết lý đào tạo thực chiến */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-12 sm:space-y-16">
        <div className="bg-white rounded-3xl p-6 sm:p-12 lg:p-14 shadow-xs border border-[#E1E6EA] space-y-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D7F5FF] text-[#0073C1] text-xs font-bold uppercase tracking-wider">
              <span>Về chúng tôi</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#263060] tracking-tight">
              Học Viện Tiên Phong Mô Hình Đào Tạo Thực Chiến & Hệ Sinh Thái Short Course
            </h2>
          </div>

          <div className="text-[#424242] leading-relaxed text-sm sm:text-base space-y-4 text-justify">
            {lead.split('\n\n').map((paragraph, pIdx) => (
              <p key={pIdx}>
                {paragraph}
              </p>
            ))}
          </div>

          {/* Triết lý Learn by Doing Highlight Card */}
          <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-[#D7F5FF]/60 via-blue-50/40 to-slate-50 border border-[#94D9FF]/60 flex flex-col sm:flex-row items-start gap-5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0073C1] to-[#0E6BBB] text-white flex items-center justify-center shrink-0 shadow-md">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-black text-[#263060] text-base sm:text-lg">
                Triết lý "Học Đi Đôi Với Hành" (Learn by Doing)
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Chúng tôi không dạy lý thuyết hàn lâm. Mọi bài học tại TWings Academy đều xoay quanh việc phân tích tình huống thực tế, giải quyết bài toán nghiệp vụ cụ thể và trang bị kỹ năng ứng xử thực chiến giúp học viên đạt chỉ tiêu KPI ngay trong tháng đầu nhận việc.
              </p>
            </div>
          </div>

          {/* 3 Trụ Cột Độc Bản */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
            {pillars.map((pil, idx) => {
              const Icon = pil.icon;
              return (
                <div 
                  key={idx}
                  className="p-5 sm:p-6 rounded-2xl border border-[#E1E6EA] bg-slate-50/50 hover:bg-white hover:border-[#0073C1] hover:shadow-lg transition-all duration-300 space-y-3"
                >
                  <div className={`w-11 h-11 rounded-xl ${pil.color} flex items-center justify-center font-bold shadow-2xs`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-[#263060] text-sm sm:text-base">
                    {pil.title}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {pil.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Tầm nhìn & Sứ mệnh (2 Cột hiện đại) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {/* Tầm nhìn Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xs border border-[#E1E6EA] hover:border-[#0073C1] transition-all flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#EA580C] border border-amber-200/60 flex items-center justify-center">
                <Target className="w-6 h-6" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-[#263060]">
                Tầm Nhìn Chiến Lược 2030
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed text-justify">
                {vision}
              </p>
            </div>
            <div className="pt-4 border-t border-[#E1E6EA] text-xs font-bold text-[#0073C1] flex items-center gap-1.5">
              <span>Học viện hàng đầu Việt Nam về đào tạo thực chiến</span>
            </div>
          </div>

          {/* Sứ mệnh Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xs border border-[#E1E6EA] hover:border-[#0073C1] transition-all flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#D7F5FF] text-[#0073C1] border border-[#94D9FF]/60 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-[#263060]">
                Sứ Mệnh Hành Động
              </h3>
              <ul className="space-y-3">
                {mission.map((m, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-[#0073C1] shrink-0 mt-0.5" />
                    <span className="leading-snug">{m}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="pt-4 border-t border-[#E1E6EA] text-xs font-bold text-[#0073C1] flex items-center gap-1.5">
              <span>Đồng hành cùng sự nghiệp tài chính của học viên</span>
            </div>
          </div>
        </div>

        {/* 5. 5 Giá trị cốt lõi (5 Cards Grid) */}
        <div className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D7F5FF] text-[#0073C1] text-xs font-bold uppercase tracking-wider">
              <span>Nền tảng văn hóa</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#263060]">
              5 Giá Trị Cốt Lõi Tại TWings Academy
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Kim chỉ nam định hướng toàn bộ hoạt động giảng dạy, nghiên cứu và kết nối doanh nghiệp.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {coreValues.map((val, idx) => {
              const Icon = val.icon;
              return (
                <div 
                  key={idx}
                  className={`bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-7 border border-[#E1E6EA] hover:border-[#0073C1] shadow-xs hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-300 space-y-3.5 relative overflow-hidden group ${
                    idx === 4 ? 'sm:col-span-2 lg:col-span-1' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-xl bg-[#D7F5FF] text-[#0073C1] flex items-center justify-center font-bold shadow-2xs group-hover:scale-108 transition-transform">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-mono font-black text-slate-400">
                      {val.badge}
                    </span>
                  </div>
                  <h4 className="text-base sm:text-lg font-black text-[#263060] group-hover:text-[#0073C1] transition-colors">
                    {val.name}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {val.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 6. Đội ngũ Giảng viên Chuyên gia Thực chiến (Expert Faculty Showcase) */}
        {instructors.length > 0 && (
        <div className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D7F5FF] text-[#0073C1] text-xs font-bold uppercase tracking-wider">
              <span>Đội ngũ chuyên gia</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#263060]">
              Đội Ngũ Giảng Viên Hàng Đầu Tại TWings
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Các Giám đốc Khối, Trưởng phòng chiến lược và Chuyên gia cấp cao trực tiếp giảng dạy và cố vấn 1-1.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {instructors.map((inst) => (
              <div 
                key={inst.id}
                className="bg-white rounded-3xl border border-[#E1E6EA] hover:border-[#0073C1] overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col group"
              >
                <div className="relative aspect-square w-full overflow-hidden bg-slate-900">
                  <img
                    src={inst.avatar}
                    alt={inst.name}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <div className="text-lg font-black">{inst.name}</div>
                    <div className="text-xs text-[#5FBEFF] font-medium line-clamp-1">{inst.title}</div>
                  </div>
                </div>

                <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="inline-block text-[11px] font-bold text-[#0073C1] bg-[#D7F5FF] px-2.5 py-0.5 rounded-full">
                      {inst.credential}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-4">
                      {inst.bio}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#E1E6EA] flex items-center justify-between text-xs font-bold text-[#0073C1]">
                    <span>Cố vấn chuyên môn TWings</span>
                    <Check className="w-4 h-4 text-emerald-600" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* 7. Hình ảnh Học viên & Hoạt động Đào tạo (Gallery Showcase) */}
        {photos.length > 0 && (
        <div className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D7F5FF] text-[#0073C1] text-xs font-bold uppercase tracking-wider">
              <span>Hình ảnh thực tế</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#263060]">
              Khoảnh Khắc Học Viên & Hoạt Động Đào Tạo
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Những buổi học thực chiến, lễ bảo vệ phương án thẩm định và trao chứng nhận tại TWings Academy.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {photos.slice(0, 6).map((photo) => (
              <div 
                key={photo.id}
                className="bg-white rounded-2xl sm:rounded-3xl border border-[#E1E6EA] overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 group"
              >
                <div className="relative aspect-4/3 w-full overflow-hidden bg-slate-900">
                  <img
                    src={photo.url}
                    alt={photo.caption}
                    className="w-full h-full object-cover group-hover:scale-106 transition-transform duration-700"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="p-4 sm:p-5">
                  <p className="text-xs font-semibold text-[#263060] line-clamp-2 leading-relaxed">
                    {photo.caption}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* 8. Đối tác đồng hành chiến lược */}
        {partners.length > 0 && (
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-[#E1E6EA] space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-widest">
              ĐỐI TÁC CHIẾN LƯỢC ĐỒNG HÀNH
            </h3>
            <p className="text-base sm:text-lg font-black text-[#263060]">
              Kết nối tuyển dụng và chuẩn hóa nguồn nhân lực cùng các định chế lớn
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-2">
            {partners.map((p) => (
              <div 
                key={p.id}
                className="px-5 py-3 rounded-2xl bg-slate-50 border border-[#E1E6EA] flex items-center gap-3 select-none"
              >
                <Building2 className="w-5 h-5 text-[#0073C1]" />
                <div className="text-left">
                  <div className="text-xs sm:text-sm font-black text-[#263060]">{p.name}</div>
                  <div className="text-[10px] text-slate-500 line-clamp-1">{p.slogan}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* 9. Final Call to Action Banner: Brand Gradient */}
        <div className="bg-gradient-to-br from-[#182046] via-[#263060] to-[#0E6BBB] text-white rounded-3xl p-8 sm:p-14 lg:p-16 shadow-2xl relative overflow-hidden border border-[#5FBEFF]/20">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#5FBEFF]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#0073C1]/20 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-3xl space-y-5 relative z-10">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D7F5FF]/10 border border-[#5FBEFF]/30 text-[#5FBEFF] text-xs font-bold uppercase tracking-widest backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-[#5FBEFF]" />
              <span>Chắp cánh sự nghiệp 2026</span>
            </span>

            <h3 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              Sẵn Sàng Bứt Phá Cùng TWings Academy?
            </h3>

            <p className="text-xs sm:text-base text-slate-200 leading-relaxed max-w-2xl">
              Dù bạn là sinh viên chuẩn bị bước vào các kỳ thi tuyển ngân hàng hay nhân sự muốn nâng cao nghiệp vụ thẩm định tín dụng, đội ngũ chuyên gia TWings luôn sẵn sàng đồng hành cùng bạn.
            </p>

            <div className="pt-3 flex flex-wrap gap-3.5 items-center">
              <button
                onClick={() => onNavigate('catalog')}
                className="px-6 sm:px-8 py-3.5 bg-gradient-to-r from-[#5FBEFF] via-[#0073C1] to-[#0E6BBB] hover:brightness-110 text-white font-black text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-blue-500/20 cursor-pointer hover:scale-102 flex items-center gap-2"
              >
                <span>Xem danh mục khóa học</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onOpenConsultation}
                className="px-6 sm:px-8 py-3.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs sm:text-sm rounded-xl transition-all backdrop-blur-md cursor-pointer hover:scale-102 flex items-center gap-2"
              >
                <PhoneCall className="w-4 h-4 text-[#5FBEFF]" />
                <span>Đăng ký nhận tư vấn lộ trình</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
