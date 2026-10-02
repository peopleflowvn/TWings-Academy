import React from 'react';
import { X, Play, ShieldCheck, ArrowRight, BookOpen, Clock, Building2 } from 'lucide-react';
import { Course } from '../types';

interface YouTubeTrialModalProps {
  course?: Course | null;
  customVideoId?: string;
  customTitle?: string;
  onClose: () => void;
  onOpenRegister: (course?: Course) => void;
}

export const YouTubeTrialModal: React.FC<YouTubeTrialModalProps> = ({
  course,
  customVideoId,
  customTitle,
  onClose,
  onOpenRegister,
}) => {
  const videoId = course?.youtubeVideoId || customVideoId || 'kqtD5dpn9C8';
  const title = course?.title || customTitle || 'Bài Giảng Học Thử Trực Tuyến';

  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;

  const deliveryFormatBadge = () => {
    if (!course?.deliveryFormat) return null;
    switch (course.deliveryFormat) {
      case 'offline':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
            Học Trực tiếp (Offline)
          </span>
        );
      case 'hybrid':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            Học Kết hợp (Hybrid)
          </span>
        );
      case 'online_external_lms':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
            Online qua LMS chuyên biệt
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 text-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-700 overflow-hidden relative my-6">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-950">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-red-500 bg-red-950/60 px-2 py-0.5 rounded border border-red-800">
                <Play className="w-3 h-3 fill-current" />
                <span>Video Học Thử YouTube</span>
              </span>
              {deliveryFormatBadge()}
            </div>
            <h3 className="font-bold text-sm sm:text-base text-white truncate max-w-xl">
              {title}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer shrink-0"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player Container */}
        <div className="relative aspect-video w-full bg-black">
          <iframe
            src={embedUrl}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="w-full h-full border-0"
          />
        </div>

        {/* Video Footer & Actions */}
        <div className="p-5 sm:p-6 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-xs text-slate-400 text-center sm:text-left">
            <div className="text-slate-200 font-semibold">
              {course?.deliveryFormat === 'online_external_lms' ? (
                <span>Khóa học Online được tổ chức trên hệ thống LMS chuyên biệt. Ban đào tạo sẽ làm việc riêng với bạn sau khi đăng ký.</span>
              ) : (
                <span>Trải nghiệm trích đoạn bài giảng mẫu trước khi tham gia lớp học chính thức.</span>
              )}
            </div>
            <div className="text-[11px] text-slate-500">
              Video bài giảng được upload và lưu trữ trên YouTube chính thức của học viện.
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              onClick={() => {
                onClose();
                onOpenRegister(course || undefined);
              }}
              className="px-5 py-2.5 bg-[#0073C1] hover:bg-[#005FA0] text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <span>Đăng Ký Tư Vấn Khóa Này</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
