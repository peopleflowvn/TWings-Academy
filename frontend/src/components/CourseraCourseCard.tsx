import React from 'react';
import { Star, Clock, CheckCircle2, Sparkles, BookOpen, ArrowRight, Play, MapPin, Building2, Laptop } from 'lucide-react';
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
  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num) + ' ₫';
  };

  const partnerName = course.partner?.name || 'Twings Partner';
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
        className="relative aspect-video w-full overflow-hidden bg-slate-100 cursor-pointer"
      >
        <img
          src={course.thumbnail}
          alt={course.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
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
            <div className="flex items-center gap-1 text-amber-600 font-bold">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>{course.rating.toFixed(1)}</span>
            </div>
            <span>({course.reviewsCount.toLocaleString()})</span>
            <span>·</span>
            <span className="font-medium text-slate-500">{course.level}</span>
          </div>
        </div>

        {/* Footer: Price & Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <div>
            <div className="text-[11px] text-slate-400">Học phí:</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-black text-slate-900 font-mono">
                {formatVND(course.price)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {course.youtubeVideoId && onOpenYouTubeTrial && (
              <button
                onClick={() => onOpenYouTubeTrial(course)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                title="Học thử qua YouTube"
              >
                <Play className="w-4 h-4 fill-current" />
              </button>
            )}

            <button
              onClick={() => onSelectCourse(course)}
              className="px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:text-[#0073C1] hover:bg-blue-50/80 rounded-lg transition-colors cursor-pointer"
            >
              Chi tiết
            </button>

            <button
              onClick={() => onEnrollCourse(course)}
              className="px-3 py-1.5 bg-[#0073C1] hover:bg-[#005FA0] text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer whitespace-nowrap"
            >
              Đăng ký
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
