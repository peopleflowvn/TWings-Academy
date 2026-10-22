import React from 'react';
import { 
  Star, 
  CheckCircle2, 
  Sparkles, 
  Play, 
  Building2, 
  Laptop, 
  CalendarDays,
  Flame,
  ArrowRight
} from 'lucide-react';
import { canBuy, installmentLine, openIntakes, priceFor, startLine, vnd } from '../lib/selling';
import { Course } from '../types';

interface CourseraCourseCardProps {
  course: Course;
  onSelectCourse: (course: Course) => void;
  onEnrollCourse: (course: Course) => void;
  onOpenYouTubeTrial?: (course: Course) => void;
  isEnrolled?: boolean;
}

export const CourseraCourseCard: React.FC<CourseraCourseCardProps> = ({
  course,
  onSelectCourse,
  onEnrollCourse,
  onOpenYouTubeTrial,
  isEnrolled = false,
}) => {
  // Today's price of the next intake (early bird included).
  const price = priceFor(course, openIntakes(course)[0]);
  const discountPercent = course.originalPrice > price 
    ? Math.round(((course.originalPrice - price) / course.originalPrice) * 100)
    : 0;

  const partnerName = course.partner?.name || 'TWings Academy';
  const partnerLogoText = course.partner?.logoText || partnerName;
  const partnerColor = course.partner?.logoColor || '#0073C1';

  // Format delivery badge
  const renderDeliveryBadge = () => {
    switch (course.deliveryFormat) {
      case 'offline':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/80">
            <Building2 className="w-3 h-3 text-amber-600" />
            <span>Trực tiếp (Offline)</span>
          </span>
        );
      case 'hybrid':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200/80">
            <Sparkles className="w-3 h-3 text-blue-600" />
            <span>Kết hợp (Hybrid)</span>
          </span>
        );
      case 'online_external_lms':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200/80" title="Khóa học Online được tổ chức trên nền tảng LMS chuyên biệt">
            <Laptop className="w-3 h-3 text-purple-600" />
            <span>Online (LMS riêng)</span>
          </span>
        );
    }
  };

  return (
    <div className="group bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 overflow-hidden hover:border-[#0073C1] hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-300 flex flex-col h-full select-none">
      {/* Thumbnail with overlay & badge */}
      <div 
        onClick={() => onSelectCourse(course)}
        className="relative aspect-video w-full overflow-hidden bg-gradient-to-tr from-[#002255] via-[#00388A] to-[#0073C1] cursor-pointer"
      >
        {course.thumbnail ? (
          <img
            src={course.thumbnail}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-106 transition-transform duration-500"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : null}
        
        {/* Subtle shadow vignette on image bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-black/20" />

        {/* Partner Logo Badge in top left corner */}
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-lg shadow-sm border border-white/60 flex items-center gap-1.5">
          <span 
            className="text-xs font-black tracking-tight font-sans"
            style={{ color: partnerColor }}
          >
            {partnerLogoText}
          </span>
        </div>

        {/* Discount tag top right */}
        {discountPercent > 0 && (
          <div className="absolute top-3 right-3 bg-rose-600 text-white text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-full shadow-md flex items-center gap-0.5">
            <Flame className="w-3 h-3 fill-amber-300 text-amber-300" />
            <span>-{discountPercent}%</span>
          </div>
        )}

        {/* YouTube Trial Button overlay */}
        {course.youtubeVideoId && onOpenYouTubeTrial && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenYouTubeTrial(course);
            }}
            className="absolute bottom-2.5 right-2.5 bg-rose-600/95 hover:bg-rose-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1.5 transition-all hover:scale-105 cursor-pointer backdrop-blur-xs"
            title="Xem thử video YouTube miễn phí"
          >
            <Play className="w-3 h-3 fill-white" />
            <span>Học thử 0đ</span>
          </button>
        )}

        {/* Enrolled Status Overlay */}
        {isEnrolled && (
          <div className="absolute bottom-2.5 left-2.5 bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Đã đăng ký</span>
          </div>
        )}
      </div>

      {/* Card Content Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3.5">
        <div className="space-y-2">
          {/* Format badge & partner name */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[11px] font-extrabold text-slate-500 tracking-wider uppercase">
              {partnerName}
            </span>
            {renderDeliveryBadge()}
          </div>

          {/* Course Title */}
          <h3
            onClick={() => onSelectCourse(course)}
            className="text-sm sm:text-base font-extrabold text-slate-900 group-hover:text-[#0050D8] transition-colors leading-snug cursor-pointer line-clamp-2 min-h-[2.6rem]"
            title={course.title}
          >
            {course.title}
          </h3>

          {/* Skills Preview */}
          {course.skills && course.skills.length > 0 && (
            <div className="flex flex-wrap gap-1 items-center pt-0.5">
              {course.skills.slice(0, 3).map((skill, sIdx) => (
                <span
                  key={sIdx}
                  className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}

          {/* Rating, Reviews and Level */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 pt-1">
            {course.reviewsCount > 0 && (
              <div className="flex items-center gap-1 text-amber-600 font-bold">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{course.rating.toFixed(1)}</span>
                <span className="text-slate-400 font-normal">({course.reviewsCount.toLocaleString('vi-VN')})</span>
              </div>
            )}
            <span className="text-slate-300">·</span>
            <span className="font-semibold text-slate-500 text-[11px]">{course.level}</span>
          </div>
        </div>

        {/* Footer: when it starts, price (installments), actions */}
        <div className="pt-3 border-t border-slate-100 space-y-3 mt-auto">
          {startLine(course) && (
            <div className={`flex items-center gap-1.5 text-xs font-semibold ${canBuy(course) ? 'text-emerald-700' : 'text-slate-500'}`}>
              <CalendarDays className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate" title={startLine(course)}>{startLine(course)}</span>
            </div>
          )}
          
          <div>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-lg sm:text-xl font-black text-slate-950 whitespace-nowrap">{vnd(price)}</span>
              {course.originalPrice > price && (
                <span className="text-xs text-slate-400 line-through whitespace-nowrap">{vnd(course.originalPrice)}</span>
              )}
            </div>
            {installmentLine(course, price) && (
              <div className="text-[11px] font-semibold text-emerald-700 bg-emerald-50/80 px-2 py-0.5 rounded-md inline-block border border-emerald-100/60 mt-1">
                {installmentLine(course, price)}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <button
              onClick={() => onSelectCourse(course)}
              className="py-2.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/90 rounded-xl transition-all cursor-pointer text-center"
            >
              Xem chi tiết
            </button>
            <button
              onClick={() => onEnrollCourse(course)}
              className="py-2.5 bg-gradient-to-r from-[#00388A] via-[#0050D8] to-[#0073C1] hover:brightness-110 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/15 cursor-pointer whitespace-nowrap text-center flex items-center justify-center gap-1"
            >
              <span>{canBuy(course) ? 'Đăng ký học' : 'Nhận tư vấn'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
