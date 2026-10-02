import React from 'react';
import { 
  BookOpen, 
  Clock, 
  GraduationCap, 
  PlayCircle, 
  Sparkles, 
  Star, 
  Users, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { Course } from '../types';

interface CourseCardProps {
  course: Course;
  isEnrolled: boolean;
  onSelectCourse: (course: Course) => void;
  onQuickEnroll: (course: Course) => void;
  onEnterClassroom: (course: Course) => void;
}

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  isEnrolled,
  onSelectCourse,
  onQuickEnroll,
  onEnterClassroom,
}) => {
  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num) + ' ₫';
  };

  const discountPercent = Math.round(((course.originalPrice - course.price) / course.originalPrice) * 100);

  return (
    <div className="group bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col overflow-hidden">
      {/* Visual Cover Header */}
      <div className="relative h-44 p-6 bg-gradient-to-br from-[#0050D8] to-[#00388A] text-white flex flex-col justify-between overflow-hidden">
        {/* Subtle geometric grid backdrop */}
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#FFFFFF_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

        {/* Top bar on cover: Unboxed Category & Status text */}
        <div className="relative z-10 flex items-center justify-between text-xs font-medium text-slate-200">
          <div className="flex items-center gap-1.5 text-amber-300 font-semibold tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{course.category}</span>
          </div>

          {course.badgeType === 'bestseller' && (
            <span className="text-amber-400 font-bold text-[11px] tracking-wider uppercase">
              ★ Khóa Bán Chạy Nhất
            </span>
          )}
        </div>

        {/* Middle cover highlight */}
        <div className="relative z-10 space-y-1">
          <div className="text-xs text-slate-300 font-medium">Cấp bậc chuyên môn</div>
          <div className="text-base font-bold text-white tracking-tight">
            {course.level}
          </div>
        </div>

        {/* Bottom cover: Duration & Lessons unboxed info */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-300 pt-2 border-t border-white/10">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            {course.duration}
          </span>
          <span className="flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            {course.lessonsCount} bài học đa phương tiện
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          {/* Metadata line (Zero-Pill discipline: unboxed text with · separator) */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-[#0F294D]">{course.level}</span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1 text-amber-600 font-medium">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              {course.rating.toFixed(2)} ({course.reviewsCount})
            </span>
            <span aria-hidden="true">·</span>
            <span>{(course.studentsCount ?? 12500).toLocaleString()} học viên</span>
          </div>

          {/* Title */}
          <h3 
            onClick={() => onSelectCourse(course)}
            className="text-base font-bold text-slate-900 group-hover:text-[#0F294D] transition-colors leading-snug cursor-pointer line-clamp-2"
          >
            {course.title}
          </h3>

          {/* Subtitle */}
          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
            {course.subtitle}
          </p>
        </div>

        {/* Instructor row */}
        {course.instructor && (
          <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
            <img
              src={course.instructor.avatar}
              alt={course.instructor.name}
              className="w-9 h-9 rounded-full object-cover border border-slate-200"
              referrerPolicy="no-referrer"
            />
            <div className="text-xs min-w-0">
              <div className="font-semibold text-slate-800 truncate">
                {course.instructor.name}
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                {course.instructor.credential || course.instructor.title}
              </div>
            </div>
          </div>
        )}

        {/* Price & Action Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-extrabold text-[#0F294D] font-mono tabular-nums">
                {formatVND(course.price)}
              </span>
              {discountPercent > 0 && (
                <span className="text-xs text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded">
                  -{discountPercent}%
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 line-through font-mono tabular-nums">
              {formatVND(course.originalPrice)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isEnrolled ? (
              <button
                onClick={() => onEnterClassroom(course)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer shadow-xs"
              >
                <PlayCircle className="w-4 h-4" />
                Vào Phòng Học
              </button>
            ) : (
              <>
                <button
                  onClick={() => onSelectCourse(course)}
                  className="px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  Chi Tiết
                </button>
                <button
                  onClick={() => onQuickEnroll(course)}
                  className="px-3.5 py-2 bg-[#0F294D] hover:bg-[#1E3A8A] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer shadow-xs"
                >
                  <span>Đăng Ký</span>
                  <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
