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
    <section id={id} className="py-8 sm:py-12 border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Shelf Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1.5">
            {badgeTag && (
              <span className="inline-block text-[11px] font-extrabold uppercase tracking-wider text-[#0073C1] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                {badgeTag}
              </span>
            )}
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs sm:text-sm text-slate-600 max-w-3xl">
                {subtitle}
              </p>
            )}
          </div>

          {onViewAll && (
            <button
              onClick={onViewAll}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#0073C1] hover:text-[#005FA0] hover:underline cursor-pointer shrink-0"
            >
              <span>Xem tất cả ({courses.length})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {courses.slice(0, 4).map((course) => (
            <CourseraCourseCard
              key={course.id}
              course={course}
              onSelectCourse={onSelectCourse}
              onEnrollCourse={onEnrollCourse}
              onOpenYouTubeTrial={onOpenYouTubeTrial}
              isEnrolled={enrolledCourseIds.includes(course.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
