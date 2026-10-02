import React from 'react';
import { Star, PlayCircle, ArrowRight } from 'lucide-react';
import { Course } from '../types';

interface CourseBlockSectionProps {
  id: string;
  title: string;
  bgColor: 'orange' | 'blue';
  courses: Course[];
  enrolledCourseIds: string[];
  onSelectCourse: (course: Course) => void;
  onQuickEnroll: (course: Course) => void;
  onEnterClassroom: (course: Course) => void;
}

export const CourseBlockSection: React.FC<CourseBlockSectionProps> = ({
  id,
  title,
  bgColor,
  courses,
  enrolledCourseIds,
  onSelectCourse,
  onQuickEnroll,
  onEnterClassroom,
}) => {
  const isOrange = bgColor === 'orange';

  const formatPriceVND = (price: number) => {
    return new Intl.NumberFormat('vi-VN').format(price) + ' VNĐ';
  };

  return (
    <section
      id={id}
      className={`py-14 sm:py-18 px-4 sm:px-6 lg:px-8 relative overflow-hidden ${
        isOrange ? 'bg-[#FF5722] text-white' : 'bg-[#0050D8] text-white'
      }`}
    >
      {/* Background city silhouette watermark matching Screenshots 2, 3, 4 */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#FFFFFF_1px,transparent_1px)] [background-size:20px_20px]" />

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        {/* Section Title matching Screenshots 2, 3, 4, 5 */}
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-wider uppercase text-white drop-shadow-md">
            {title}
          </h2>
        </div>

        {/* 3 Course Cards Row matching the screenshots layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {courses.map((course) => {
            const isEnrolled = enrolledCourseIds.includes(course.id);

            return (
              <div
                key={course.id}
                className="bg-white text-slate-800 rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col justify-between group"
              >
                {/* Course Photo */}
                <div 
                  onClick={() => onSelectCourse(course)}
                  className="h-52 overflow-hidden bg-slate-100 cursor-pointer relative"
                >
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3 bg-[#0050D8] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs">
                    {course.category}
                  </div>
                </div>

                {/* Card Content matching Screenshot 3 & 4 */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    {/* Course Title */}
                    <h3
                      onClick={() => onSelectCourse(course)}
                      className="font-bold text-sm sm:text-base text-slate-900 group-hover:text-[#0050D8] transition-colors leading-snug cursor-pointer line-clamp-2"
                    >
                      {course.title}
                    </h3>

                    {/* 5 Golden Stars */}
                    <div className="flex items-center gap-0.5 text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400" />
                      ))}
                    </div>

                    {/* Dotted Divider as seen in screenshots */}
                    <div className="border-b border-dotted border-slate-300 pt-1" />
                  </div>

                  {/* Price & Link Row */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between">
                      <div className="text-base font-extrabold text-[#FF5722] font-mono">
                        $ {formatPriceVND(course.price)}
                      </div>
                      <button
                        onClick={() => onSelectCourse(course)}
                        className="text-xs italic text-[#FF5722] hover:text-[#E64A19] font-medium cursor-pointer"
                      >
                        Xem thêm &gt;&gt;
                      </button>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-3 flex items-center gap-2">
                      {isEnrolled ? (
                        <button
                          onClick={() => onEnterClassroom(course)}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <PlayCircle className="w-4 h-4" />
                          <span>Vào Phòng Học LMS</span>
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => onSelectCourse(course)}
                            className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer text-center"
                          >
                            Chi Tiết
                          </button>
                          <button
                            onClick={() => onQuickEnroll(course)}
                            className="flex-1 py-2 bg-[#FF5722] hover:bg-[#E64A19] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer text-center shadow-xs flex items-center justify-center gap-1"
                          >
                            <span>Đăng Ký</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
