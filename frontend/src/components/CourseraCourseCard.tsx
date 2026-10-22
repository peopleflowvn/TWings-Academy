import React from 'react';
import { Star, CheckCircle2, Sparkles, Play, Building2, Laptop, CalendarDays } from 'lucide-react';
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

  const partnerName = course.partner?.name || 'TWings Academy';
  const partnerLogoText = course.partner?.logoText || partnerName;
  const partnerColor = course.partner?.logoColor || '#0073C1';

  // Format delivery badge
  const renderDeliveryBadge = () => {
    switch (course.deliveryFormat) {
      case 'offline':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-orange-100 text-orange-900 border border-orange-200">
            <Building2 className="w-3 h-3 text-orange-600" />
            <span>Học Trực tiếp (Offline)</span>
          </span>
        );
      case 'hybrid':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 border border-blue-200">
            <Sparkles className="w-3 h-3 text-blue-600" />
            <span>Kết hợp (Hybrid)</span>
          </span>
        );
      case 'online_external_lms':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-purple-200" title="Khóa học Online được tổ chức trên nền tảng LMS chuyên biệt">
            <Laptop className="w-3 h-3 text-purple-600" />
            <span>Online (LMS riêng)</span>
          </span>
        );
    }
  };

  return (
    <div className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-[#0073C1] hover:shadow-xl transition-all duration-300 flex flex-col h-full">
      {/* Thumbnail with overlay & badge */}
      <div 
        onClick={() => onSelectCourse(course)}
        className="relative aspect-video w-full overflow-hidden bg-gradient-to-tr from-[#00388A] to-[#0073C1] cursor-pointer"
      >
        {course.thumbnail ? (
          <img
            src={course.thumbnail}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none'; // broken image: the gradient below shows
            }}
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Partner Logo Badge in top left corner */}
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-md shadow-sm border border-slate-100 flex items-center gap-1.5">
          <span 
            className="text-xs font-black tracking-tight font-sans"
            style={{ color: partnerColor }}
          >
            {partnerLogoText}
          </span>
        </div>

        {/* YouTube Trial Button overlay */}
        {course.youtubeVideoId && onOpenYouTubeTrial && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenYouTubeTrial(course);
            }}
            className="absolute bottom-2.5 right-2.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1 transition-transform hover:scale-105 cursor-pointer"
            title="Xem thử video YouTube"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Học thử YouTube</span>
          </button>
        )}

        {/* Enrolled Status Overlay */}
        {isEnrolled && (
          <div className="absolute bottom-2.5 left-2.5 bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow-md flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Đã đăng ký</span>
          </div>
        )}
      </div>

      {/* Card Content Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          {/* Format badge & partner name */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-500 tracking-wide uppercase">
              {partnerName}
            </span>
            {renderDeliveryBadge()}
          </div>

          {/* Course Title */}
          <h3
            onClick={() => onSelectCourse(course)}
            className="text-base font-bold text-slate-900 group-hover:text-[#0073C1] transition-colors leading-snug cursor-pointer line-clamp-2"
            title={course.title}
          >
            {course.title}
          </h3>

          {/* Skills Preview */}
          {course.skills && course.skills.length > 0 && (
            <div className="text-xs text-slate-600 line-clamp-1">
              <span className="font-semibold text-slate-700">Kỹ năng: </span>
              {course.skills.slice(0, 3).join(', ')}
            </div>
          )}

          {/* Rating, Reviews and Level */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 pt-1">
            {course.reviewsCount > 0 && (
              <>
                <div className="flex items-center gap-1 text-amber-600 font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  <span>{course.rating.toFixed(1)}</span>
                </div>
                <span>({course.reviewsCount.toLocaleString('vi-VN')} đánh giá)</span>
                <span>·</span>
              </>
            )}
            <span className="font-medium text-slate-500">{course.level}</span>
          </div>
        </div>

        {/* Footer: when it starts, price (installments), actions */}
        <div className="pt-3 border-t border-slate-100 space-y-3">
          {startLine(course) && (
            <div className={`flex items-center gap-1.5 text-xs font-semibold ${canBuy(course) ? 'text-emerald-700' : 'text-slate-500'}`}>
              <CalendarDays className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate" title={startLine(course)}>{startLine(course)}</span>
            </div>
          )}
          <div>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-lg font-black text-slate-900 whitespace-nowrap">{vnd(price)}</span>
              {course.originalPrice > price && (
                <span className="text-xs text-slate-400 line-through whitespace-nowrap">{vnd(course.originalPrice)}</span>
              )}
            </div>
            {installmentLine(course, price) && <div className="text-[11px] text-slate-500">{installmentLine(course, price)}</div>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onSelectCourse(course)}
              className="py-2 text-xs font-bold text-slate-700 border border-slate-200 hover:border-[#0073C1] hover:text-[#0073C1] rounded-lg transition-colors cursor-pointer"
            >
              Xem chi tiết
            </button>
            <button
              onClick={() => onEnrollCourse(course)}
              className="py-2 bg-[#0073C1] hover:bg-[#005FA0] text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer whitespace-nowrap"
            >
              {canBuy(course) ? 'Đăng ký học' : 'Nhận tư vấn'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
