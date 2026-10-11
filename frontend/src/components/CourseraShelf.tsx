import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Course } from '../types';
import { CourseraCourseCard } from './CourseraCourseCard';

interface CourseraShelfProps {
  id?: string;
  title: string;
  subtitle?: string;
  courses: Course[];
  enrolledCourseIds: string[];
  onSelectCourse: (course: Course) => void;
  onEnrollCourse: (course: Course) => void;
  onOpenYouTubeTrial?: (course: Course) => void;
  onViewAll?: () => void;
  badgeTag?: string;
}

export const CourseraShelf: React.FC<CourseraShelfProps> = ({
  id,
  title,
  subtitle,
  courses,
  enrolledCourseIds,
  onSelectCourse,
  onEnrollCourse,
  onOpenYouTubeTrial,
  onViewAll,
  badgeTag,
}) => {
  if (!courses || courses.length === 0) return null;

  return (
    <section id={id} className="py-6 sm:py-12 border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 sm:space-y-6">
        {/* Shelf Header */}
        <div className="flex items-start sm:items-end justify-between gap-3">
          <div className="space-y-1 sm:space-y-1.5 min-w-0">
            {badgeTag && (
              <span className="inline-block text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-[#0073C1] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                {badgeTag}
              </span>
            )}
            <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs sm:text-sm text-slate-600 max-w-3xl line-clamp-2 sm:line-clamp-none">
                {subtitle}
              </p>
            )}
          </div>

          {onViewAll && (
            <button
              onClick={onViewAll}
              className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-[#0073C1] hover:text-[#005FA0] hover:underline cursor-pointer shrink-0 pt-1 sm:pt-0 whitespace-nowrap"
            >
              <span>Xem tất cả ({courses.length})</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          )}
        </div>

        {/* Courses: Horizontal Touch-Swipe Rail on Mobile (< sm), 4-Col Grid on Desktop */}
        <div className="flex overflow-x-auto -mx-4 px-4 gap-3.5 pb-2 no-scrollbar snap-x snap-mandatory sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:mx-0 sm:px-0 sm:gap-6">
          {courses.slice(0, 4).map((course) => (
            <div
              key={course.id}
              className="w-[78vw] max-w-[290px] shrink-0 snap-start sm:w-auto sm:shrink flex flex-col"
            >
              <CourseraCourseCard
                course={course}
                onSelectCourse={onSelectCourse}
                onEnrollCourse={onEnrollCourse}
                onOpenYouTubeTrial={onOpenYouTubeTrial}
                isEnrolled={enrolledCourseIds.includes(course.id)}
              />
            </div>
          ))}

          {/* Mobile "View All" End Card in the swipe rail */}
          {onViewAll && (
            <div
              onClick={onViewAll}
              className="sm:hidden w-[45vw] max-w-[170px] shrink-0 snap-start rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 hover:bg-blue-100/60 p-4 flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-colors select-none"
            >
              <div className="w-10 h-10 rounded-full bg-white text-[#0073C1] shadow-xs flex items-center justify-center font-bold">
                <ArrowRight className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-[#0073C1]">
                Xem tất cả
              </div>
              <div className="text-[10px] text-slate-500">
                {courses.length} khóa học
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
