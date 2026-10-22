import React from 'react';
import { useSiteLogo } from '../lib/siteSeo';

export interface BrandLogoProps {
  /** If true, the logo is placed on a dark background and will automatically convert to negative (âm bản). */
  dark?: boolean;
  /** Custom subtitle, e.g. "TWings Quản trị", "Tuyển sinh · Đào tạo · Vận hành", "Học Viện Thực Chiến". */
  subtitle?: string;
  /** Main title override when no logo image is available. Defaults to "TWINGS ACADEMY". */
  title?: string;
  /** When true, renders compact/icon mode (e.g. for collapsed sidebar). */
  collapsed?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Custom container class */
  className?: string;
  /** Custom image class */
  imageClassName?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  dark = false,
  subtitle,
  title,
  collapsed = false,
  size = 'md',
  className = '',
  imageClassName = '',
}) => {
  const logoUrl = useSiteLogo();

  // If collapsed mode: only show badge icon or compact square
  if (collapsed) {
    return (
      <div
        className={`flex items-center justify-center shrink-0 ${className}`}
        title={title || 'TWings Academy'}
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={title || 'TWings Academy'}
            className={`w-9 h-9 object-contain transition-all ${
              dark ? 'brightness-0 invert' : ''
            } ${imageClassName}`}
            style={dark ? { filter: 'brightness(0) invert(1)' } : undefined}
          />
        ) : (
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0073C1] via-[#2C93E8] to-[#5FBEFF] flex items-center justify-center text-white font-black text-xs shadow-xs relative overflow-hidden">
            <span className="font-sans font-black text-white">TW</span>
            <span className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-[#EA580C] ring-1 ring-white" />
          </div>
        )}
      </div>
    );
  }

  // Size styles
  const imgHeights = {
    sm: 'h-7 sm:h-8 max-w-[140px]',
    md: 'h-9 sm:h-10 max-w-[200px]',
    lg: 'h-11 sm:h-13 max-w-[260px]',
  }[size];

  const badgeSizes = {
    sm: 'w-8 h-8 text-xs rounded-xl',
    md: 'w-9.5 h-9.5 sm:w-10 sm:h-10 text-xs sm:text-sm rounded-xl',
    lg: 'w-11 h-11 sm:w-12 sm:h-12 text-base sm:text-lg rounded-2xl shadow-sm',
  }[size];

  const badgeDotSizes = {
    sm: 'w-2 h-2 ring-1',
    md: 'w-2.5 h-2.5 ring-1.5',
    lg: 'w-3 h-3 ring-2',
  }[size];

  const wordmarkStyles = {
    sm: {
      text: 'text-base font-black',
      dot: 'w-1.5 h-1.5 mb-0.5',
      capsule: 'w-1.5 h-3',
      margin: 'mx-0.5',
      academy: 'text-[8px] sm:text-[9px] font-black tracking-[0.24em] mt-0.5',
    },
    md: {
      text: 'text-lg sm:text-xl font-black',
      dot: 'w-1.5 h-1.5 mb-0.5',
      capsule: 'w-1.5 h-3.5',
      margin: 'mx-0.5',
      academy: 'text-[9px] sm:text-[10px] font-black tracking-[0.28em] mt-0.5',
    },
    lg: {
      text: 'text-2xl sm:text-[26px] font-black',
      dot: 'w-2 h-2 mb-0.5',
      capsule: 'w-2 h-4.5',
      margin: 'mx-0.5 sm:mx-1',
      academy: 'text-[10px] sm:text-[11px] font-black tracking-[0.32em] mt-1',
    },
  }[size];

  const gapSizes = {
    sm: 'gap-2',
    md: 'gap-2.5 sm:gap-3',
    lg: 'gap-3 sm:gap-3.5',
  }[size];

  const titleSizes = {
    sm: 'text-sm sm:text-base',
    md: 'text-base sm:text-lg',
    lg: 'text-xl sm:text-2xl',
  }[size];

  const subSizes = {
    sm: 'text-[9px]',
    md: 'text-[10px] sm:text-[11px]',
    lg: 'text-xs sm:text-[13px]',
  }[size];

  if (logoUrl) {
    return (
      <div className={`flex flex-col justify-center shrink-0 ${className}`}>
        <img
          src={logoUrl}
          alt={title || 'TWings Academy'}
          className={`${imgHeights} object-contain transition-all duration-200 ${
            dark ? 'brightness-0 invert' : ''
          } ${imageClassName}`}
          style={dark ? { filter: 'brightness(0) invert(1)' } : undefined}
        />
        {subtitle && (
          <div
            className={`font-semibold tracking-wider uppercase mt-1 leading-none ${subSizes} ${
              dark ? 'text-slate-400' : 'text-[#424242]'
            }`}
          >
            {subtitle}
          </div>
        )}
      </div>
    );
  }

  // Exact Brand Wordmark & Mark according to Brand Identity Guidelines
  return (
    <div className={`flex items-center ${gapSizes} text-left shrink-0 select-none ${className}`}>
      {/* Brand Icon Mark */}
      <div
        className={`${badgeSizes} bg-gradient-to-tr from-[#0E6BBB] via-[#0073C1] to-[#5FBEFF] flex items-center justify-center text-white font-black shadow-xs shrink-0 relative overflow-hidden`}
      >
        <span className="font-sans font-black tracking-tight text-white z-10">TW</span>
        <span className={`absolute bottom-1 right-1 ${badgeDotSizes} rounded-full bg-[#EA580C] ring-white z-10`} />
        <div className="absolute top-0 right-0 w-4 h-4 bg-white/20 rounded-full blur-xs" />
      </div>

      <div className="truncate flex flex-col justify-center">
        {title ? (
          <div
            className={`font-black tracking-tight leading-tight ${titleSizes} ${
              dark ? 'text-white' : 'text-[#263060]'
            }`}
          >
            {title}
          </div>
        ) : (
          <div>
            {/* TWiNGS main wordmark */}
            <div className={`flex items-center tracking-tight leading-none ${wordmarkStyles.text} font-sans`}>
              <span className={dark ? 'text-white' : 'text-[#0073C1]'}>
                TW
              </span>
              {/* Styled 'i' with cyan wing and orange center capsule */}
              <span className={`inline-flex flex-col items-center justify-center ${wordmarkStyles.margin} relative`}>
                <span className={`${wordmarkStyles.dot} rounded-full bg-[#5FBEFF]`} />
                <span className={`${wordmarkStyles.capsule} rounded-full bg-gradient-to-b from-[#EA580C] to-[#C23010]`} />
              </span>
              <span className={dark ? 'text-white' : 'text-[#0073C1]'}>
                NGS
              </span>
            </div>

            {/* A C A D E M Y sub-mark */}
            <div 
              className={`${wordmarkStyles.academy} uppercase ${
                dark ? 'text-[#5FBEFF]' : 'text-[#263060]'
              }`}
            >
              ACADEMY
            </div>
          </div>
        )}

        {subtitle && (
          <div
            className={`font-semibold tracking-wide leading-tight mt-1 truncate ${subSizes} ${
              dark ? 'text-slate-400' : 'text-[#424242]'
            }`}
          >
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};
