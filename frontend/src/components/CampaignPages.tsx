/**
 * Admission campaigns on the public site, like job postings on a career site:
 *   /tuyen-sinh          the campaigns recruiting now (featured first, then the nearest deadline)
 *   /tuyen-sinh/<slug>   one campaign: its courses with the next intake, places left (when shown), the
 *                        deadline, and a registration that carries the campaign code
 * What appears is decided by the server (published, recruiting, started, not past its deadline).
 */
import React, { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, Flame, GraduationCap, MapPin, Users } from 'lucide-react';
import { api, isBackendEnabled } from '../lib/api';

export interface CampaignCard {
  slug: string;
  code: string;
  name: string;
  summary: string;
  image: string;
  startDate: string | null;
  deadline: string | null;
  daysLeft: number | null;
  location: string;
  isFeatured: boolean;
  hasScholarship: boolean;
  courses: { slug: string; title: string }[];
  quota?: number;
  placesLeft?: number;
}

interface CampaignCourse {
  courseId: string;
  slug: string;
  title: string;
  thumbnail: string;
  price: number;
  originalPrice: number;
  nextIntake: { name: string; startDate: string | null } | null;
  jobTitle: string;
  income: string;
  quota?: number;
  placesLeft?: number;
}

interface CampaignDetail extends Omit<CampaignCard, 'courses'> {
  description: string;
  courses: CampaignCourse[];
}

const vnd = (n: number) => `${new Intl.NumberFormat('vi-VN').format(n)} ₫`;
const day = (iso: string | null) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '');

function deadlineText(c: { deadline: string | null; daysLeft: number | null }) {
  if (!c.deadline) return 'Nhận hồ sơ liên tục';
  if (c.daysLeft === 0) return `Hạn nhận hồ sơ: hôm nay (${day(c.deadline)})`;
  return `Hạn nhận hồ sơ ${day(c.deadline)}${c.daysLeft !== null && c.daysLeft <= 14 ? ` · còn ${c.daysLeft} ngày` : ''}`;
}

/** The campaigns recruiting now (an empty list when the site has no backend). */
export function useLiveCampaigns() {
  const [campaigns, setCampaigns] = useState<CampaignCard[] | null>(null);
  useEffect(() => {
    if (!isBackendEnabled()) return setCampaigns([]);
    api
      .get<CampaignCard[]>('/public/campaigns/')
      .then(setCampaigns)
      .catch(() => setCampaigns([]));
  }, []);
  return campaigns;
}

const Card: React.FC<{ c: CampaignCard; onOpen: (slug: string) => void }> = ({ c, onOpen }) => (
  <button
    type="button"
    onClick={() => onOpen(c.slug)}
    className="text-left bg-white rounded-2xl border border-slate-200 hover:border-[#0073C1] hover:shadow-md transition-all overflow-hidden flex flex-col cursor-pointer"
  >
    {c.image ? (
      <img src={c.image} alt="" className="w-full h-40 object-cover" loading="lazy" />
    ) : (
      <div className="w-full h-24 bg-gradient-to-r from-[#0073C1] to-sky-500" />
    )}
    <div className="p-4 space-y-2 flex-1 flex flex-col">
      <div className="flex flex-wrap gap-1.5">
        {c.isFeatured && (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
            <Flame className="w-3 h-3" /> Nổi bật
          </span>
        )}
        {c.hasScholarship && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">Có học bổng</span>}
      </div>
      <h3 className="font-bold text-slate-900 leading-snug">{c.name}</h3>
      {c.summary && <p className="text-sm text-slate-600 line-clamp-3">{c.summary}</p>}
      <div className="text-xs text-slate-600 space-y-1 mt-auto pt-2">
        <div className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5 text-[#0073C1]" /> {deadlineText(c)}</div>
        {c.location && <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-[#0073C1]" /> {c.location}</div>}
        {c.placesLeft !== undefined && (
          <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-[#0073C1]" /> Còn {c.placesLeft}/{c.quota} suất</div>
        )}
        {c.courses.length > 0 && (
          <div className="flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5 text-[#0073C1]" /> {c.courses.map((k) => k.title).join(' · ')}</div>
        )}
      </div>
    </div>
  </button>
);

/** /tuyen-sinh/<slug> */
export const CampaignDetailPage: React.FC<{
  slug: string;
  onBack: () => void;
  onOpenCourse: (courseSlug: string) => void;
  onRegister: (courseId: string, campaignCode: string) => void;
}> = ({ slug, onBack, onOpenCourse, onRegister }) => {
  const [camp, setCamp] = useState<CampaignDetail | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    setCamp(null);
    setMissing(false);
    api
      .get<CampaignDetail>(`/public/campaigns/${encodeURIComponent(slug)}/`)
      .then((c) => {
        setCamp(c);
        document.title = `${c.name} | TWings Academy`;
      })
      .catch(() => setMissing(true));
  }, [slug]);

  if (missing) {
    return (
      <main className="flex-1 max-w-3xl mx-auto px-4 py-20 text-center text-slate-600 space-y-3">
        <h1 className="text-xl font-bold text-slate-900">Đợt tuyển sinh không còn mở</h1>
        <p className="text-sm">Đợt này đã kết thúc hoặc tạm dừng nhận hồ sơ.</p>
        <button type="button" onClick={onBack} className="px-4 py-2 rounded-xl bg-[#0073C1] text-white text-sm font-bold cursor-pointer">
          Xem khóa học & đợt tuyển sinh
        </button>
      </main>
    );
  }
  if (!camp) return <main className="flex-1 max-w-3xl mx-auto px-4 py-20 text-center text-slate-500">Đang tải…</main>;

  return (
    <main className="flex-1 w-full">
      <div className="bg-gradient-to-r from-[#00467a] to-[#0073C1] text-white">
        <div className="max-w-6xl mx-auto px-4 py-10 space-y-3">
          <button type="button" onClick={onBack} className="text-sm text-blue-100 hover:text-white inline-flex items-center gap-1 cursor-pointer">
            <ArrowLeft className="w-4 h-4" /> Khóa học & tuyển sinh
          </button>
          <div className="flex flex-wrap gap-2">
            {camp.isFeatured && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/15 inline-flex items-center gap-1"><Flame className="w-3.5 h-3.5" /> Nổi bật</span>}
            {camp.hasScholarship && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-400 text-amber-950">Có học bổng</span>}
          </div>
          <h1 className="text-2xl sm:text-4xl font-black leading-tight">{camp.name}</h1>
          {camp.summary && <p className="text-blue-50 max-w-3xl">{camp.summary}</p>}
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-blue-50">
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="w-4 h-4" /> {deadlineText(camp)}</span>
            {camp.location && <span className="inline-flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {camp.location}</span>}
            {camp.placesLeft !== undefined && <span className="inline-flex items-center gap-1.5"><Users className="w-4 h-4" /> Còn {camp.placesLeft}/{camp.quota} suất</span>}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-slate-900">Khóa học trong đợt tuyển sinh</h2>
          {camp.courses.map((k) => (
            <div key={k.courseId} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-4">
              {k.thumbnail && <img src={k.thumbnail} alt="" className="w-full sm:w-40 h-28 object-cover rounded-xl" loading="lazy" />}
              <div className="flex-1 space-y-1.5">
                <button type="button" onClick={() => onOpenCourse(k.slug)} className="text-left font-bold text-slate-900 hover:text-[#0073C1] cursor-pointer">
                  {k.title}
                </button>
                <div className="text-sm text-slate-600 space-y-0.5">
                  {k.nextIntake && (
                    <div>Khai giảng: {k.nextIntake.name}{k.nextIntake.startDate ? ` · ${day(k.nextIntake.startDate)}` : ''}</div>
                  )}
                  {k.jobTitle && <div>Định hướng việc làm: {k.jobTitle}{k.income ? ` · ${k.income}` : ''}</div>}
                  {k.placesLeft !== undefined && <div>Còn {k.placesLeft}/{k.quota} suất</div>}
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <span className="font-black text-[#0073C1]">{vnd(k.price)}</span>
                  {k.originalPrice > k.price && <span className="text-sm text-slate-400 line-through">{vnd(k.originalPrice)}</span>}
                  <button
                    type="button"
                    disabled={k.placesLeft === 0}
                    onClick={() => onRegister(k.courseId, camp.code)}
                    className="ml-auto px-4 py-2 rounded-xl bg-[#0073C1] hover:bg-[#005fa3] text-white text-sm font-bold disabled:opacity-50 cursor-pointer"
                  >
                    {k.placesLeft === 0 ? 'Đã đủ suất' : 'Đăng ký'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </section>
        {camp.description && (
          <aside className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">Thông tin đợt tuyển sinh</h2>
            <p className="text-slate-700 whitespace-pre-line leading-relaxed">{camp.description}</p>
          </aside>
        )}
      </div>
    </main>
  );
};

/**
 * The campaigns recruiting now (nothing when none is open): on the course catalogue (all of them) and
 * on the homepage (the first three, "Xem tất cả" goes to the catalogue).
 */
export const CampaignsStrip: React.FC<{ onOpen: (slug: string) => void; onSeeAll?: () => void }> = ({ onOpen, onSeeAll }) => {
  const campaigns = useLiveCampaigns();
  if (!campaigns?.length) return null;
  return (
    <section id="tuyen-sinh" className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-4 scroll-mt-24">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">Đang tuyển sinh</h2>
          <p className="text-xs sm:text-sm text-slate-500">Đợt tuyển sinh đang nhận hồ sơ: khóa học, hạn nộp và số suất.</p>
        </div>
        {onSeeAll && campaigns.length > 3 && (
          <button type="button" onClick={onSeeAll} className="text-sm font-bold text-[#0073C1] hover:underline cursor-pointer">
            Xem tất cả
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {(onSeeAll ? campaigns.slice(0, 3) : campaigns).map((c) => <Card key={c.slug} c={c} onOpen={onOpen} />)}
      </div>
    </section>
  );
};
