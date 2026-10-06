import React from 'react';
import { Phone } from 'lucide-react';
import { phoneDigits, useSiteSeo, zaloLink } from '../lib/siteSeo';

/**
 * Chat on Zalo / call the hotline, always one tap away (Vietnamese visitors message far more than they
 * fill forms). Numbers come from /app → Cài đặt SEO website (Zalo falls back to the hotline).
 */
export const FloatingContact: React.FC = () => {
  const seo = useSiteSeo();
  const phone = phoneDigits(seo?.hotline);
  const zalo = zaloLink(seo?.zalo || seo?.hotline);
  if (!phone && !zalo) return null;
  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-2 print:hidden">
      {zalo && (
        <a href={zalo} target="_blank" rel="noopener noreferrer" title="Nhắn tin Zalo cho TWings Academy"
          className="w-12 h-12 rounded-full bg-[#0068FF] text-white shadow-lg flex items-center justify-center text-[11px] font-black hover:scale-105 transition-transform">
          Zalo
        </a>
      )}
      {phone && (
        <a href={`tel:${phone}`} title={`Gọi ${seo?.hotline}`}
          className="w-12 h-12 rounded-full bg-emerald-600 text-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform">
          <Phone className="w-5 h-5" />
        </a>
      )}
    </div>
  );
};
