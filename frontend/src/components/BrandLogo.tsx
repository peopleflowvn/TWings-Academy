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
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00388A] via-[#0050D8] to-[#0073C1] flex items-center justify-center text-white font-black text-xs shadow-xs">
            TW
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
    sm: 'text-[10px]',
    md: 'text-xs',
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
              dark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            {subtitle}
          </div>
        )}
      </div>
    );
  }

  // Fallback typography & badge mark
  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 text-left shrink-0 ${className}`}>
      <div
        className={`${badgeSizes} rounded-xl bg-gradient-to-tr from-[#00388A] via-[#0050D8] to-[#0073C1] flex items-center justify-center text-white font-black shadow-xs shrink-0`}
      >
        TW
      </div>
      <div className="truncate">
        {title ? (
          <div
            className={`font-black tracking-tight leading-tight ${titleSizes} ${
              dark ? 'text-white' : 'text-slate-900'
            }`}
          >
            {title}
          </div>
        ) : (
          <div className="flex items-center gap-1 sm:gap-1.5 leading-none">
            <span
              className={`font-black tracking-tight font-sans uppercase ${titleSizes} ${
                dark ? 'text-white' : 'text-[#00388A]'
              }`}
            >
              TWINGS
            </span>
            <span
              className={`font-black tracking-tight font-sans uppercase ${titleSizes} ${
                dark ? 'text-[#38BDF8]' : 'text-[#0073C1]'
              }`}
            >
              ACADEMY
            </span>
          </div>
        )}
        {subtitle && (
          <div
            className={`font-medium tracking-wide leading-tight mt-1 truncate ${subSizes} ${
              dark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};
