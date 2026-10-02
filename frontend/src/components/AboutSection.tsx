import React from 'react';
import { Target, Award, Sparkles, CheckCircle2 } from 'lucide-react';
import { CMSSectionsConfig } from '../types';

interface AboutSectionProps {
  aboutData: CMSSectionsConfig['about'];
}

export const AboutSection: React.FC<AboutSectionProps> = ({ aboutData }) => {
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

  return (
    <section id="about-twings" className="py-16 bg-[#0050D8] text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 text-left leading-relaxed text-xs sm:text-sm">
        {/* Header */}
        <div className="space-y-1">
          <div className="text-xs font-bold text-amber-300 uppercase tracking-widest">
            {title}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide uppercase">
            {subtitle}
          </h2>
        </div>

        {/* Lead Text matching Screenshot 9 */}
        <div className="text-slate-100 whitespace-pre-line text-justify leading-relaxed">
          {lead}
        </div>

        {/* Tầm nhìn matching Screenshot 9 */}
        <div className="space-y-2 pt-2 border-t border-blue-400/40">
          <h3 className="font-bold text-base text-amber-300">
            Tầm nhìn:
          </h3>
          <p className="text-slate-100 leading-relaxed text-justify">
            {vision}
          </p>
        </div>

        {/* Sứ mệnh matching Screenshot 9 */}
        <div className="space-y-2 pt-2 border-t border-blue-400/40">
          <h3 className="font-bold text-base text-amber-300">
            Sứ mệnh:
          </h3>
          <ul className="space-y-2 text-slate-100">
            {mission.map((m, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-amber-300 font-bold">•</span>
                <span className="text-justify">{m}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Giá trị cốt lõi matching Screenshot 9 */}
        <div className="space-y-2 pt-2 border-t border-blue-400/40">
          <h3 className="font-bold text-base text-amber-300">
            Giá trị cốt lõi:
          </h3>
          <ul className="space-y-2 text-slate-100">
            {coreValues.map((cv, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-amber-300 font-bold">•</span>
                <span className="text-justify">{cv}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};
