import React from 'react';

/** Vietnamese names end with the given name: "Nguyễn Văn An" -> "A". */
function initial(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words[words.length - 1] || '?').charAt(0).toUpperCase();
}

/** A person's photo, or their initial when no photo was uploaded (never a stock picture). */
export const Avatar: React.FC<{ src?: string; name: string; className: string }> = ({ src, name, className }) =>
  src ? (
    <img src={src} alt={name} loading="lazy" decoding="async" className={`${className} object-cover`} />
  ) : (
    <div
      aria-hidden="true"
      className={`${className} flex items-center justify-center bg-blue-50 text-[#0073C1] font-black text-lg`}
    >
      {initial(name)}
    </div>
  );
