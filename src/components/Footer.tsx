import React from 'react';
import { Home, Phone, Mail, ArrowUp } from 'lucide-react';
import { CMSSectionsConfig } from '../types';

interface FooterProps {
  contactData: CMSSectionsConfig['contact'];
}

export const Footer: React.FC<FooterProps> = ({ contactData }) => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#00388A] text-white py-12 px-4 sm:px-6 lg:px-8 border-t border-blue-600/50">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Contact info matching Screenshot 10 */}
        <div className="space-y-4">
          <h3 className="text-base sm:text-lg font-black tracking-wider uppercase text-amber-300">
            THÔNG TIN LIÊN HỆ
          </h3>

          <div className="space-y-2.5 text-xs sm:text-sm text-slate-100">
            <div className="flex items-start gap-3">
              <Home className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
              <span>{contactData.address}</span>
            </div>

            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-amber-300 shrink-0" />
              <span>
                Hotline: <strong className="text-white">{contactData.hotline}</strong>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-amber-300 shrink-0" />
              <span>
                Email: <strong className="text-white">{contactData.email}</strong>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="w-4 h-4 flex items-center justify-center text-amber-300 font-bold shrink-0">
                f
              </span>
              <a
                href={contactData.facebook}
                target="_blank"
                rel="noreferrer"
                className="text-amber-300 hover:underline"
              >
                {contactData.facebook}
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar matching Screenshot 10 */}
        <div className="pt-8 border-t border-blue-500/40 flex items-center justify-between text-xs text-slate-300">
          <button
            onClick={scrollToTop}
            className="flex flex-col items-center gap-1 hover:text-amber-300 transition-colors cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-full bg-white/10 group-hover:bg-amber-400 group-hover:text-slate-900 flex items-center justify-center transition-colors">
              <ArrowUp className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold">Về đầu trang</span>
          </button>

          <div className="font-mono text-[11px] text-slate-300">
            {contactData.copyright}
          </div>
        </div>
      </div>
    </footer>
  );
};
