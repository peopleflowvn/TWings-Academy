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
    sm: 'h-7 max-w-[130px]',
    md: 'h-8 sm:h-9 max-w-[180px]',
    lg: 'h-10 sm:h-12 max-w-[220px]',
  }[size];

  const badgeSizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-9 h-9 text-xs sm:text-sm',
    lg: 'w-11 h-11 text-base',
  }[size];

  const titleSizes = {
    sm: 'text-sm sm:text-base',
    md: 'text-base sm:text-lg',
    lg: 'text-lg sm:text-xl',
  }[size];

  const subSizes = {
    sm: 'text-[9px]',
    md: 'text-[11px]',
    lg: 'text-xs',
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
    <div className={`flex items-center gap-2.5 sm:gap-3 text-left shrink-0 select-none ${className}`}>
      {/* Brand Icon Mark */}
      <div
        className={`${badgeSizes} rounded-xl bg-gradient-to-tr from-[#0E6BBB] via-[#0073C1] to-[#5FBEFF] flex items-center justify-center text-white font-black shadow-xs shrink-0 relative overflow-hidden`}
      >
        <span className="font-sans font-black tracking-tight text-white z-10">TW</span>
        <span className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-[#EA580C] ring-1.5 ring-white z-10" />
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
            <div className="flex items-center tracking-tight leading-none font-black font-sans">
              <span className={dark ? 'text-white' : 'text-[#0073C1]'}>
                TW
              </span>
              {/* Styled 'i' with cyan wing and orange center capsule */}
              <span className="inline-flex flex-col items-center justify-center mx-0.5 relative">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5FBEFF] mb-0.5" />
                <span className="w-1.5 h-3.5 rounded-full bg-gradient-to-b from-[#EA580C] to-[#C23010]" />
              </span>
              <span className={dark ? 'text-white' : 'text-[#0073C1]'}>
                NGS
              </span>
            </div>

            {/* A C A D E M Y sub-mark */}
            <div 
              className={`text-[9px] sm:text-[10px] font-black uppercase tracking-[0.28em] mt-0.5 ${
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
