import React from 'react';
import { BrandLogo } from './BrandLogo';

export interface PageLoaderProps {
  /** If true, uses dark styling (e.g. for /app or dark sections). */
  dark?: boolean;
  /** Custom loading message. */
  message?: string;
  /** Fullscreen fixed overlay vs container height. Defaults to true. */
  fullScreen?: boolean;
  /** Additional custom class names. */
  className?: string;
}

export const PageLoader: React.FC<PageLoaderProps> = ({
  dark = false,
  message = 'Đang tải dữ liệu...',
  fullScreen = true,
  className = '',
}) => {
  return (
    <div
      className={`${
        fullScreen
          ? 'fixed inset-0 z-50 flex items-center justify-center'
          : 'w-full py-16 flex items-center justify-center'
      } ${
        dark ? 'bg-slate-900 text-slate-100' : 'bg-[#F8FAFC] text-slate-800'
      } transition-colors duration-300 animate-fadeIn ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center max-w-sm px-6 text-center space-y-6">
        {/* Brand Logo with automatic negative/âm bản on dark background */}
        <div className="relative">
          <div
            className={`p-3.5 rounded-2xl ${
              dark
                ? 'bg-slate-800/80 border border-slate-700/80 shadow-xl shadow-black/30'
                : 'bg-white border border-slate-200/80 shadow-xl shadow-blue-500/5'
            }`}
          >
            <BrandLogo dark={dark} size="md" subtitle={undefined} />
          </div>
          {/* Subtle glowing ring */}
          <div
            className={`absolute -inset-1 rounded-2xl blur-md -z-10 opacity-60 animate-pulse ${
              dark ? 'bg-[#0073C1]/30' : 'bg-blue-400/20'
            }`}
          />
        </div>

        {/* Progress Bar & Spinner */}
        <div className="w-48 space-y-2.5">
          <div
            className={`h-1.5 w-full rounded-full overflow-hidden ${
              dark ? 'bg-slate-800' : 'bg-slate-200/80'
            }`}
          >
            <div className="h-full w-full bg-gradient-to-r from-[#00388A] via-[#0073C1] to-[#38BDF8] rounded-full animate-indeterminate-bar" />
          </div>

          <p
            className={`text-xs font-semibold tracking-wide ${
              dark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            {message}
          </p>
        </div>
      </div>
    </div>
  );
};
