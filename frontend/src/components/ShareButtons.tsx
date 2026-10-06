import React, { useState } from 'react';
import { Facebook, Link2, MessageCircle, Share2 } from 'lucide-react';

interface Props {
  title: string;
  /** Defaults to the current page (its own URL, which bots preview with the page's share card). */
  url?: string;
  tone?: 'light' | 'dark';
}

const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

/**
 * Share to Facebook, Messenger, Zalo or copy the link. Facebook / Messenger / Zalo fetch the page's
 * preview (title, description, image) from the server-rendered share card (backend/apps/cms/seo.py).
 * Zalo has no public share URL without an Official Account: on phones the system share sheet offers
 * Zalo directly; elsewhere the link is copied to paste into Zalo.
 */
export const ShareButtons: React.FC<Props> = ({ title, url, tone = 'light' }) => {
  const [notice, setNotice] = useState('');
  const link = url || `${window.location.origin}${window.location.pathname}`;
  const flash = (text: string) => {
    setNotice(text);
    setTimeout(() => setNotice(''), 2500);
  };
  const copy = async (text = 'Đã sao chép liên kết') => {
    try {
      await navigator.clipboard.writeText(link);
      flash(text);
    } catch {
      window.prompt('Sao chép liên kết:', link);
    }
  };
  const systemShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url: link });
        return;
      } catch {
        return; // cancelled
      }
    }
    copy('Đã sao chép – dán vào Zalo để gửi');
  };
  const open = (href: string) => window.open(href, '_blank', 'noopener,noreferrer,width=640,height=560');

  const btn =
    tone === 'dark'
      ? 'p-2 rounded-lg border border-white/30 text-white hover:bg-white/10'
      : 'p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100';
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={`text-[11px] font-bold mr-1 ${tone === 'dark' ? 'text-blue-100' : 'text-slate-500'}`}>Chia sẻ:</span>
      <button type="button" title="Chia sẻ lên Facebook" className={`${btn} cursor-pointer`}
        onClick={() => open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`)}>
        <Facebook className="w-4 h-4" />
      </button>
      {isMobile() && (
        <a title="Gửi qua Messenger" className={btn} href={`fb-messenger://share/?link=${encodeURIComponent(link)}`}>
          <MessageCircle className="w-4 h-4" />
        </a>
      )}
      <button type="button" title="Gửi qua Zalo" onClick={systemShare}
        className={`${btn} cursor-pointer text-[11px] font-black leading-4 px-2.5`}>
        Zalo
      </button>
      {typeof navigator.share === 'function' && (
        <button type="button" title="Chia sẻ…" onClick={systemShare} className={`${btn} cursor-pointer`}>
          <Share2 className="w-4 h-4" />
        </button>
      )}
      <button type="button" title="Sao chép liên kết" onClick={() => copy()} className={`${btn} cursor-pointer`}>
        <Link2 className="w-4 h-4" />
      </button>
      {notice && <span className={`text-[11px] font-bold ${tone === 'dark' ? 'text-emerald-300' : 'text-emerald-700'}`}>{notice}</span>}
    </div>
  );
};
