import React from 'react';
import { 
  Compass, 
  Target, 
  Award, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles,
  BookOpen
} from 'lucide-react';
import { CourseLevel } from '../types';

interface LearningPathSectionProps {
  onSelectLevel: (level: CourseLevel) => void;
}

export const LearningPathSection: React.FC<LearningPathSectionProps> = ({ onSelectLevel }) => {
  const paths = [
    {
      step: '01',
      title: 'Khởi Động & Nền Tảng',
      level: 'Mất gốc' as CourseLevel,
      targetBand: 'Band 0 - 3.5',
      timeframe: '2 - 3 Tháng',
      description: 'Lấy lại căn bản tiếng Anh, chuẩn hóa 44 âm IPA và 800 từ vựng cốt lõi hàng ngày.',
      features: ['Ngữ pháp cơ bản dễ hiểu', 'Khắc phục triệt để phát âm sai', 'Luyện nghe phản xạ chậm'],
      accentColor: 'border-l-amber-500'
    },
    {
      step: '02',
      title: 'Bứt Phá Giao Tiếp & KET',
      level: '4.5 - 5.5' as CourseLevel,
      targetBand: 'Band 4.5 - 5.5',
      timeframe: '3 Tháng',
      description: 'Phát triển phản xạ tự nhiên không cần dịch nhẩm, làm chủ hội thoại công sở và các bài thi Cambridge/THPT.',
      features: ['100+ tình huống đàm phán', 'Kỹ thuật nghe bắt key words', 'Thuyết trình cơ bản'],
      accentColor: 'border-l-blue-500'
    },
    {
      step: '03',
      title: 'IELTS Chuyên Sâu 6.5+',
      level: '6.0 - 7.5' as CourseLevel,
      targetBand: 'Band 6.0 - 7.5',
      timeframe: '3 - 4 Tháng',
      description: 'Chiến thuật làm bài 4 kỹ năng IELTS, bẻ khóa dạng bài khó và tư duy luận điểm sắc bén.',
      features: ['Sửa bài Writing chi tiết', 'Mock test Speaking 1-1', 'Bẫy Distractors Section 3 & 4'],
      accentColor: 'border-l-emerald-500'
    },
    {
      step: '04',
      title: 'Masterclass Đỉnh Cao',
      level: '7.5+ Master' as CourseLevel,
      targetBand: 'Band 7.5 - 8.5+',
      timeframe: '2 Tháng',
      description: 'Hoàn thiện tư duy ngôn ngữ học thuật C1/C2, ngữ điệu tự nhiên như người bản xứ để du học và định cư.',
      features: ['Cấu trúc câu phức & Idioms C2', 'Phản biện đề tài vĩ mô', 'Săn học bổng du học'],
      accentColor: 'border-l-purple-500'
    },
  ];

  return (
    <section id="learning-paths" className="py-16 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600">
            <Compass className="w-4 h-4" />
            <span>Khung Đào Tạo Chuẩn Châu Âu CEFR & Cambridge</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F294D] tracking-tight" style={{ textWrap: 'balance' }}>
            Lộ Trình Học Cá Nhân Hóa Tại Học Viện Twings
          </h2>
          <p className="text-slate-600 text-sm leading-relaxed">
            Dù bạn đang mất gốc hay muốn chinh phục IELTS 7.5+, Twings Edu đều có lộ trình đào tạo bài bản với học liệu Moodle trực quan và giáo viên đồng hành sát sao.
          </p>
        </div>

        {/* 4 Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {paths.map((path) => (
            <div
              key={path.step}
              className={`bg-slate-50 border border-slate-200 border-l-4 ${path.accentColor} rounded-2xl p-6 flex flex-col justify-between space-y-6 hover:shadow-md transition-shadow`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-400">
                    BƯỚC {path.step}
                  </span>
                  <span className="text-xs font-bold text-[#0F294D] bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                    {path.targetBand}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">
                    {path.title}
                  </h3>
                  <div className="text-xs text-amber-600 font-medium">
                    Thời lượng ước tính: {path.timeframe}
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {path.description}
                </p>

                <div className="space-y-2 pt-2 border-t border-slate-200/80">
                  {path.features.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px] text-slate-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => onSelectLevel(path.level)}
                className="w-full py-2.5 px-3 bg-white hover:bg-slate-100 text-[#0F294D] text-xs font-bold rounded-xl border border-slate-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Xem Khóa Học Phù Hợp</span>
                <ArrowRight className="w-3.5 h-3.5 text-amber-500" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
