import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Course } from '../types';
import { Intake } from '../lib/selling';
import { CourseraCourseCard } from './CourseraCourseCard';

interface CourseraShelfProps {
  id?: string;
  title: string;
  subtitle?: string;
  courses?: Course[];
  /** A shelf of classes ("Đang tuyển sinh"): one card per class, the same card as a course's. */
  classes?: { course: Course; intake: Intake }[];
  enrolledCourseIds: string[];
  onSelectCourse: (course: Course, intake?: Intake) => void;
  onEnrollCourse: (course: Course, intakeName?: string) => void;
  onOpenYouTubeTrial?: (course: Course) => void;
  onViewAll?: () => void;
  badgeTag?: string;
}

export const CourseraShelf: React.FC<CourseraShelfProps> = ({
  id,
  title,
  subtitle,
  courses,
  classes,
  enrolledCourseIds,
  onSelectCourse,
  onEnrollCourse,
  onOpenYouTubeTrial,
  onViewAll,
  badgeTag,
}) => {
  const cards: { course: Course; intake?: Intake }[] = classes ?? (courses || []).map((course) => ({ course }));
  if (cards.length === 0) return null;
  const count = `${cards.length} ${classes ? 'lớp' : 'khóa học'}`;

  return (
    <section id={id} className="py-8 sm:py-14 border-b border-[#E1E6EA] scroll-mt-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5 sm:space-y-7">
        {/* Shelf Header */}
        <div className="flex items-start sm:items-end justify-between gap-4">
          <div className="space-y-1.5 sm:space-y-2 min-w-0">
            {badgeTag && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#0073C1] bg-[#D7F5FF] px-3 py-1 rounded-full border border-[#94D9FF]/60 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0073C1] animate-pulse" />
                <span>{badgeTag}</span>
              </span>
            )}
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#263060] tracking-tight leading-snug">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs sm:text-sm text-[#424242]/80 max-w-3xl leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>

          {onViewAll && (
            <button
              onClick={onViewAll}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#0073C1] hover:text-[#0E6BBB] group transition-colors cursor-pointer shrink-0 pt-1 sm:pt-0 whitespace-nowrap"
            >
              <span>Xem tất cả ({cards.length})</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          )}
        </div>

        {/* Courses: Horizontal Touch-Swipe Rail on Mobile (< sm), 4-Col Grid on Desktop */}
        <div className="flex overflow-x-auto -mx-4 px-4 gap-4 pb-3 no-scrollbar snap-x snap-mandatory sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:mx-0 sm:px-0 sm:gap-6">
          {cards.slice(0, 4).map(({ course, intake }) => (
            <div
              key={`${course.id}:${intake?.name || ''}`}
              className="w-[80vw] max-w-[300px] shrink-0 snap-start sm:w-auto sm:shrink flex flex-col"
            >
              <CourseraCourseCard
                course={course}
                intake={intake}
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
              className="sm:hidden w-[45vw] max-w-[170px] shrink-0 snap-start rounded-2xl sm:rounded-3xl border-2 border-dashed border-[#94D9FF] bg-[#D7F5FF]/50 hover:bg-[#D7F5FF]/80 p-5 flex flex-col items-center justify-center text-center gap-2.5 cursor-pointer transition-colors select-none"
            >
              <div className="w-11 h-11 rounded-full bg-white text-[#0073C1] shadow-sm flex items-center justify-center font-bold">
                <ArrowRight className="w-5 h-5" />
              </div>
              <div className="text-xs font-black text-[#0073C1]">
                Xem tất cả
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                {count}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
