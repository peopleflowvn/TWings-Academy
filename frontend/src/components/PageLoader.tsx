import React from 'react';

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
        dark ? 'bg-[#0B0F1F] text-slate-100' : 'bg-slate-50/95 backdrop-blur-md text-slate-800'
      } transition-colors duration-300 animate-fadeIn ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center justify-center text-center space-y-6">
        {/* Impressive Multi-layered Orbital Spinner */}
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
          {/* Ambient Glow Aura */}
          <div
            className={`absolute inset-0 rounded-full blur-xl -z-10 animate-pulse ${
              dark ? 'bg-[#0073C1]/30' : 'bg-[#5FBEFF]/25'
            }`}
          />

          {/* Outer Static Track */}
          <div
            className={`absolute inset-0 rounded-full border-2 ${
              dark ? 'border-white/10' : 'border-slate-200/80'
            }`}
          />

          {/* Layer 1: Fast Outer Gradient Arc */}
          <svg
            className="absolute inset-0 w-full h-full animate-spin"
            style={{ animationDuration: '1.2s' }}
            viewBox="0 0 100 100"
            fill="none"
          >
            <defs>
              <linearGradient id="twingsLoaderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0073C1" />
                <stop offset="60%" stopColor="#5FBEFF" />
                <stop offset="100%" stopColor="#EA580C" />
              </linearGradient>
            </defs>
            <circle
              cx="50"
              cy="50"
              r="44"
              stroke="url(#twingsLoaderGrad)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray="95 185"
            />
          </svg>

          {/* Layer 2: Reverse Inner Dashed Ring */}
          <svg
            className="absolute inset-2 sm:inset-2.5 w-[calc(100%-16px)] sm:w-[calc(100%-20px)] h-[calc(100%-16px)] sm:h-[calc(100%-20px)] animate-spin"
            style={{ animationDirection: 'reverse', animationDuration: '2.2s' }}
            viewBox="0 0 100 100"
            fill="none"
          >
            <circle
              cx="50"
              cy="50"
              r="42"
              stroke={dark ? '#5FBEFF' : '#0073C1'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="45 115"
              strokeOpacity={dark ? 0.75 : 0.65}
            />
          </svg>

          {/* Layer 3: Orbiting Glowing Satellite Dot */}
          <div
            className="absolute inset-0 w-full h-full animate-spin"
            style={{ animationDuration: '1.8s' }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-[#FF6B35] to-[#EA580C] shadow-[0_0_10px_#EA580C] absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 ring-2 ring-white/70" />
          </div>

          {/* Center Glowing Core */}
          <div className="relative flex items-center justify-center">
            <div
              className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-gradient-to-tr from-[#0073C1] to-[#5FBEFF] shadow-[0_0_12px_#5FBEFF] animate-ping opacity-75"
            />
            <div
              className={`absolute w-2.5 h-2.5 rounded-full ${
                dark ? 'bg-white' : 'bg-[#0073C1]'
              } shadow-xs`}
            />
          </div>
        </div>

        {/* Loading Message with subtle tracking and bouncing dots */}
        <div className="space-y-2 max-w-xs px-4">
          <p
            className={`text-xs sm:text-sm font-bold tracking-wide transition-colors ${
              dark ? 'text-slate-200' : 'text-slate-700'
            }`}
          >
            {message}
          </p>
          <div className="flex items-center justify-center gap-1.5 pt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0073C1] animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-[#5FBEFF] animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-[#EA580C] animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
};
