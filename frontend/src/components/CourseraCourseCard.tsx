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
  ArrowRight,
  Briefcase,
  Award
} from 'lucide-react';
import { canBuy, deadlineLine, Intake, installmentLine, intakeLine, openIntakes, priceFor, startLine, vnd } from '../lib/selling';
import { Course } from '../types';

interface CourseraCourseCardProps {
  course: Course;
  /** Open the course page (on this card's class when the card is about one). */
  onSelectCourse: (course: Course, intake?: Intake) => void;
  /** Buy the course, in this class when given. */
  onEnrollCourse: (course: Course, intakeName?: string) => void;
  onOpenYouTubeTrial?: (course: Course) => void;
  isEnrolled?: boolean;
  /** The class this card is about ("Đang tuyển sinh": homepage, catalogue filter); default: the next one. */
  intake?: Intake;
}

export const CourseraCourseCard: React.FC<CourseraCourseCardProps> = ({
  course,
  onSelectCourse,
  onEnrollCourse,
  onOpenYouTubeTrial,
  isEnrolled = false,
  intake,
}) => {
  // The class offered (named as in /app: "Khóa học 10 …") and today's price in it (early bird included).
  const open = openIntakes(course);
  const shown = intake ?? open[0];
  const otherClasses = intake ? 0 : Math.max(open.length - 1, 0);
  const price = priceFor(course, shown);
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
    <div className="group bg-white rounded-2xl sm:rounded-3xl border border-[#E1E6EA] overflow-hidden hover:border-[#0073C1] hover:shadow-xl hover:shadow-[#0073C1]/10 hover:-translate-y-1 transition-all duration-300 flex flex-col h-full select-none">
      {/* Thumbnail with overlay & badge */}
      <div 
        onClick={() => onSelectCourse(course, intake)}
        className="relative aspect-video w-full overflow-hidden bg-gradient-to-tr from-[#263060] via-[#0E6BBB] to-[#0073C1] cursor-pointer"
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
          <div className="absolute top-3 right-3 bg-[#EA580C] text-white text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-full shadow-md flex items-center gap-0.5">
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
            className="absolute bottom-2.5 right-2.5 bg-[#EA580C]/95 hover:bg-[#EA580C] text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1.5 transition-all hover:scale-105 cursor-pointer backdrop-blur-xs"
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
            <span className="text-[11px] font-extrabold text-[#263060]/70 tracking-wider uppercase">
              {partnerName}
            </span>
            {renderDeliveryBadge()}
          </div>

          {/* Course Title */}
          <h3
            onClick={() => onSelectCourse(course, intake)}
            className="text-sm sm:text-base font-extrabold text-[#263060] group-hover:text-[#0073C1] transition-colors leading-snug cursor-pointer line-clamp-2 min-h-[2.6rem]"
            title={course.title}
          >
            {course.title}
          </h3>

          {/* The class's hook (a class card) */}
          {intake?.summary && <p className="text-xs text-slate-600 line-clamp-2">{intake.summary}</p>}

          {/* Skills Preview */}
          {course.skills && course.skills.length > 0 && (
            <div className="flex flex-wrap gap-1 items-center pt-0.5">
              {course.skills.slice(0, 3).map((skill, sIdx) => (
                <span
                  key={sIdx}
                  className="text-[10px] font-medium bg-[#D7F5FF]/60 text-[#0073C1] px-2 py-0.5 rounded-md border border-[#94D9FF]/40"
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
        <div className="pt-3 border-t border-[#E1E6EA] space-y-3 mt-auto">
          {shown ? (
            <div data-intake={shown.name} className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs space-y-0.5">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate" title={shown.name}>{shown.name}</span>
                {otherClasses > 0 && <span className="shrink-0 font-semibold text-emerald-700">+{otherClasses} lớp</span>}
              </div>
              <div className="pl-5 text-emerald-700 font-semibold">{intakeLine(shown)}</div>
              {deadlineLine(shown) && <div className="pl-5 text-[11px] text-slate-500">{deadlineLine(shown)}</div>}
              {shown.jobTitle && (
                <div className="flex items-center gap-1.5 pt-0.5 text-[11px] text-slate-700">
                  <Briefcase className="w-3 h-3 shrink-0 text-[#0073C1]" />
                  <span className="truncate" title={shown.jobTitle}>Việc làm: {shown.jobTitle}{shown.income ? ` · ${shown.income}` : ''}</span>
                </div>
              )}
              {(shown.isFeatured || shown.hasScholarship) && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {shown.isFeatured && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                      <Flame className="w-3 h-3" /> Nổi bật
                    </span>
                  )}
                  {shown.hasScholarship && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                      <Award className="w-3 h-3" /> Có học bổng
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            startLine(course) && (
              <div className={`flex items-center gap-1.5 text-xs font-semibold ${canBuy(course) ? 'text-emerald-700' : 'text-slate-500'}`}>
                <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate" title={startLine(course)}>{startLine(course)}</span>
              </div>
            )
          )}
          
          <div>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-lg sm:text-xl font-black text-[#263060] whitespace-nowrap">{vnd(price)}</span>
              {course.originalPrice > price && (
                <span className="text-xs text-slate-400 line-through whitespace-nowrap">{vnd(course.originalPrice)}</span>
              )}
            </div>
            {installmentLine(course, price) && (
              <div className="text-[11px] font-semibold text-[#0073C1] bg-[#D7F5FF] px-2 py-0.5 rounded-md inline-block border border-[#94D9FF]/60 mt-1">
                {installmentLine(course, price)}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <button
              onClick={() => onSelectCourse(course, intake)}
              className="py-2.5 text-xs font-bold text-[#424242] bg-slate-50 hover:bg-[#D7F5FF]/50 hover:text-[#0073C1] border border-[#E1E6EA] rounded-xl transition-all cursor-pointer text-center"
            >
              Xem chi tiết
            </button>
            <button
              onClick={() => onEnrollCourse(course, shown?.name)}
              className="py-2.5 bg-gradient-to-r from-[#5FBEFF] via-[#0073C1] to-[#0E6BBB] hover:brightness-110 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-[#0073C1]/20 cursor-pointer whitespace-nowrap text-center flex items-center justify-center gap-1"
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
