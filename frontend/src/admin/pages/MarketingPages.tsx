import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Link2, Star } from 'lucide-react';
import { api, ApiError, Paginated } from '../../lib/api';
import { useStaffCan } from '../../lib/lms';
import { Course } from '../../types';

const SITE = 'https://tuyensinh.twings.edu.vn';
const CHANNELS: { source: string; medium: string; label: string }[] = [
  { source: 'facebook', medium: 'social', label: 'Facebook (bài đăng)' },
  { source: 'facebook', medium: 'cpc', label: 'Facebook Ads' },
  { source: 'zalo', medium: 'social', label: 'Zalo / Zalo OA' },
  { source: 'messenger', medium: 'chat', label: 'Messenger' },
  { source: 'google', medium: 'cpc', label: 'Google Ads' },
  { source: 'tiktok', medium: 'social', label: 'TikTok' },
  { source: 'youtube', medium: 'video', label: 'YouTube' },
  { source: 'email', medium: 'email', label: 'Email' },
  { source: 'event', medium: 'offline', label: 'Sự kiện / tờ rơi (QR)' }
];

/** Campaign links: utm_* (+ optional ?ref= staff code) so every lead shows its channel and campaign. */
export const CampaignLinksPage: React.FC<{ courses: Course[] }> = ({ courses }) => {
  const [campaigns, setCampaigns] = useState<{ code: string; name: string }[]>([]);
  const [page, setPage] = useState('/');
  const [channel, setChannel] = useState(0);
  const [campaign, setCampaign] = useState('');
  const [content, setContent] = useState('');
  const [ref, setRef] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api
      .get<Paginated<{ code: string; name: string }> | { code: string; name: string }[]>('/staff/campaigns/?pageSize=100')
      .then((res) => setCampaigns(Array.isArray(res) ? res : res.results))
      .catch(() => setCampaigns([]));
  }, []);

  const url = useMemo(() => {
    const c = CHANNELS[channel];
    const params = new URLSearchParams({ utm_source: c.source, utm_medium: c.medium });
    if (campaign) params.set('utm_campaign', campaign);
    if (content.trim()) params.set('utm_content', content.trim().toLowerCase().replace(/\s+/g, '-'));
    if (ref.trim()) params.set('ref', ref.trim());
    return `${SITE}${page}?${params.toString()}`;
  }, [page, channel, campaign, content, ref]);

  const input = 'w-full p-2.5 border border-slate-300 rounded-xl text-sm';
  return (
    <div className="max-w-3xl space-y-4">
      <p className="text-sm text-slate-600">
        Dùng link này khi đăng bài, chạy quảng cáo hay in QR. Lead đến từ link tự ghi nhận kênh, chiến dịch (khớp mã chiến
        dịch tuyển sinh thì gắn luôn vào chiến dịch) và mã người giới thiệu – xem trong hồ sơ lead và trang Báo cáo.
      </p>
      <div className="bg-white rounded-2xl border border-slate-200 p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <label className="sm:col-span-2">Trang đích
          <select className={input} value={page} onChange={(e) => setPage(e.target.value)}>
            <option value="/">Trang chủ</option>
            <option value="/khoa-hoc">Danh mục khóa học & chương trình</option>
            {courses.filter((c) => c.status === 'published').map((c) => (
              <option key={c.id} value={`/khoa-hoc/${c.slug}`}>Khóa: {c.title}</option>
            ))}
          </select>
        </label>
        <label>Kênh
          <select className={input} value={channel} onChange={(e) => setChannel(Number(e.target.value))}>
            {CHANNELS.map((c, i) => <option key={c.label} value={i}>{c.label}</option>)}
          </select>
        </label>
        <label>Chiến dịch tuyển sinh
          <select className={input} value={campaign} onChange={(e) => setCampaign(e.target.value)}>
            <option value="">– Không gắn –</option>
            {campaigns.map((c) => <option key={c.code} value={c.code}>{c.code} – {c.name}</option>)}
          </select>
        </label>
        <label>Nội dung / mẫu quảng cáo (tùy chọn)
          <input className={input} value={content} onChange={(e) => setContent(e.target.value)} placeholder="VD: video-gv-phuong" />
        </label>
        <label>Mã người giới thiệu (tùy chọn)
          <input className={input} value={ref} onChange={(e) => setRef(e.target.value)} placeholder="VD: mã nhân viên HUONGNT22" />
        </label>
      </div>
      <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 flex items-center gap-3">
        <Link2 className="w-5 h-5 shrink-0 text-blue-300" />
        <code className="text-xs break-all flex-1">{url}</code>
        <button type="button" onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0">
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? 'Đã chép' : 'Sao chép'}
        </button>
      </div>
    </div>
  );
};

interface Review {
  id: string;
  courseTitle: string;
  orderCode: string;
  learnerEmail: string;
  displayName: string;
  role: string;
  rating: number;
  comment: string;
  completed: boolean;
  status: 'pending' | 'approved' | 'rejected';
  moderationNote: string;
  createdAt: string;
}

/** Learner reviews written from the learner account: approve to publish on the course page. */
export const ReviewsPage: React.FC = () => {
  const canModerate = useStaffCan('courses.reviews');
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [rows, setRows] = useState<Review[] | null>(null);
  const [error, setError] = useState('');

  const load = () => {
    setRows(null);
    api.get<Paginated<Review>>(`/staff/reviews/?status=${status}&pageSize=100`).then((r) => setRows(r.results)).catch((e: Error) => setError(e.message));
  };
  useEffect(load, [status]);

  const moderate = async (r: Review, next: Review['status']) => {
    const note = next === 'rejected' ? window.prompt('Lý do không đăng (nội bộ):') ?? '' : '';
    try {
      await api.patch(`/staff/reviews/${r.id}/`, { status: next, moderationNote: note });
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Thao tác thất bại');
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Đánh giá do học viên đã học viết trong Tài khoản học viên (đã đồng ý cho đăng). Chỉ đánh giá được duyệt mới hiện trên
        trang khóa học, kèm nhãn “Học viên đã học”. Không sửa nội dung đánh giá của học viên.
      </p>
      <div className="flex gap-2">
        {(['pending', 'approved', 'rejected'] as const).map((s) => (
          <button key={s} type="button" onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${status === s ? 'bg-[#0073C1] text-white border-[#0073C1]' : 'border-slate-200 text-slate-600'}`}>
            {{ pending: 'Chờ duyệt', approved: 'Đã đăng', rejected: 'Không đăng' }[s]}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!rows ? <p className="text-sm text-slate-500">Đang tải…</p> : rows.length === 0 ? <p className="text-sm text-slate-500">Không có đánh giá nào.</p> : null}
      <div className="space-y-3">
        {rows?.map((r) => (
          <div key={r.id} className="bg-white rounded-2xl border border-slate-200 p-4 text-sm space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-bold text-slate-900">{r.displayName}</span>
                {r.role && <span className="text-slate-500"> · {r.role}</span>}
                <div className="text-xs text-slate-500">{r.courseTitle} · đơn {r.orderCode} · {r.learnerEmail} · {new Date(r.createdAt).toLocaleDateString('vi-VN')}{r.completed ? ' · đã hoàn thành khóa' : ''}</div>
              </div>
              <span className="flex text-amber-500">{Array.from({ length: r.rating }, (_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}</span>
            </div>
            <p className="text-slate-700 whitespace-pre-line">{r.comment}</p>
            {r.moderationNote && <p className="text-xs text-slate-500">Ghi chú: {r.moderationNote}</p>}
            {canModerate && (
              <div className="flex gap-2">
                {r.status !== 'approved' && <button type="button" onClick={() => moderate(r, 'approved')} className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer">Duyệt & đăng</button>}
                {r.status !== 'rejected' && <button type="button" onClick={() => moderate(r, 'rejected')} className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold cursor-pointer">Không đăng</button>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
