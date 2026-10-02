import React from 'react';
import { Sparkles, Check, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { CMSSectionsConfig } from '../types';

interface CourseraPlusBannerProps {
  onJoinPlus: () => void;
  config?: CMSSectionsConfig['courseraPlus'];
}

export const CourseraPlusBanner: React.FC<CourseraPlusBannerProps> = ({ onJoinPlus, config }) => {
  const badgeText = config?.badgeText || 'TWINGS PLUS';
  const title = config?.title || 'Đầu tư vào sự nghiệp của bạn với TWings Plus';
  const subtitle = config?.subtitle || 'Truy cập không giới hạn các chương trình đào tạo thực chiến ngành tài chính - ngân hàng và công nghệ từ các chuyên gia hàng đầu. Nhận chứng chỉ chính thức và cố vấn sự nghiệp 1-1.';
  const benefits = config?.bulletPoints && config.bulletPoints.length > 0 ? config.bulletPoints : [
    'Hơn 70+ học phần chuyên sâu và dự án thực chiến tín dụng ngân hàng',
    'Nhận chứng chỉ nghề nghiệp chính thức được ngân hàng đối tác MSB săn đón',
    'Lộ trình học linh hoạt qua LMS riêng kết hợp cố vấn thực tế',
    'Tiết kiệm chi phí tối đa cho lộ trình phát triển sự nghiệp dài hạn'
  ];

  return (
    <section className="bg-gradient-to-r from-[#00255A] via-[#00419E] to-[#0056D2] text-white py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        <div className="lg:col-span-8 space-y-4">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-amber-300 border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="uppercase tracking-wider font-mono">{badgeText}</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
            {title}
          </h2>

          <p className="text-sm text-blue-100 max-w-2xl leading-relaxed">
            {subtitle}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {benefits.map((b, i) => (
              <div key={i} className="flex items-center gap-2 text-xs font-medium text-blue-100">
                <div className="w-4 h-4 rounded-full bg-blue-500/40 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 text-blue-200" />
                </div>
                <span>{b}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col items-start lg:items-end justify-center space-y-4">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 text-center w-full max-w-sm space-y-3">
            <div className="text-xs text-blue-200 uppercase tracking-wider font-semibold">Chỉ từ</div>
            <div className="text-3xl font-black text-white font-mono">
              990,000 ₫<span className="text-xs font-normal text-blue-200"> / tháng</span>
            </div>
            <div className="text-[11px] text-blue-200">Dùng thử 7 ngày miễn phí · Hủy bất kỳ lúc nào</div>

            <button
              onClick={onJoinPlus}
              className="w-full py-3 px-6 bg-white hover:bg-slate-100 text-[#0056D2] font-black text-sm rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Khám Phá TWings Plus</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
