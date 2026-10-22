import React from 'react';
import { Phone } from 'lucide-react';
import { phoneDigits, useSiteSeo, zaloLink } from '../lib/siteSeo';

/**
 * Chat on Zalo / call the hotline, always one tap away (Vietnamese visitors message far more than they
 * fill forms). Numbers come from /app → Cài đặt SEO website (Zalo falls back to the hotline).
 */
export const FloatingContact: React.FC<{ raised?: boolean }> = ({ raised = false }) => {
  const seo = useSiteSeo();
  const phone = phoneDigits(seo?.hotline);
  const zalo = zaloLink(seo?.zalo || seo?.hotline);
  if (!phone && !zalo) return null;
  return (
    // Phones: above the bottom bar, smaller so content shows.
    // On the course page phones use the buy bar ("Tư vấn") instead.
    <div className={`fixed ${raised ? 'hidden lg:flex' : 'flex'} bottom-20 right-2.5 md:bottom-6 sm:right-6 z-40 flex-col gap-2 print:hidden`}>
      {zalo && (
        <a href={zalo} target="_blank" rel="noopener noreferrer" title="Nhắn tin Zalo cho TWings Academy"
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#0068FF] text-white shadow-lg flex items-center justify-center text-[10px] sm:text-[11px] font-black hover:scale-105 transition-transform">
          Zalo
        </a>
      )}
      {phone && (
        <a href={`tel:${phone}`} title={`Gọi ${seo?.hotline}`}
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-600 text-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform">
          <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
        </a>
      )}
    </div>
  );
};
