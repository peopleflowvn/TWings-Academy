import React, { useEffect, useState } from 'react';
import { Globe, LayoutDashboard, RefreshCw, Search, TrendingUp } from 'lucide-react';
import { api } from '../../lib/api';
import { formatVND } from '../../lib/commerce';
import { linkProps } from '../router';
import { Bars, Card, Stat, downloadCsv, monthLabel, pct } from './ReportWidgets';
import { SeoReport, SeoData, TrafficData, TrafficReport } from './WebsiteReports';

interface Reports {
  months: string[];
  finance?: {
    monthly: { month: string; revenue: number; refunds: number; net: number }[];
    outstanding: number;
    installmentOrders: number;
    overdueInstallments: number;
    overdueAmount: number;
  };
  sales?: {
    monthly: { month: string; leads: number; converted: number }[];
    pipeline: Record<string, number>;
    sources: { source: string; leads: number; converted: number }[];
    items: { title: string; kind: 'course' | 'program'; orders: number; refunded: number; net: number }[];
    /** Per consultant over the period (leads created in it). */
    consultants?: {
      consultant: string;
      leads: number;
      converted: number;
      conversionRate: number;
      revenue: number;
      overdue: number;
      lost: number;
      medianResponseHours: number | null;
    }[];
    lostReasons?: { reason: string; count: number }[];
  };
  marketing?: {
    days: number;
    views: number;
    leads: number;
    paid: number;
    pages: { title: string; path: string; views: number; leads: number; paid: number; leadRate: number | null }[];
    channels: { key: string; label: string; views: number; leads: number; paid: number; leadRate: number | null }[];
  };
  traffic?: TrafficData;
  seo?: SeoData;
  learning?: {
    courses: {
      title: string;
      enrolled: number;
      waiting: number;
      completed: number;
      removed: number;
      avgProgress: number | null;
      completionRate: number | null;
    }[];
    certificates: number;
    certificates30d: number;
  };
}

type Tab = 'business' | 'traffic' | 'seo';
const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'business', label: 'Kinh doanh & Học tập', icon: TrendingUp },
  { key: 'traffic', label: 'Truy cập website', icon: Globe },
  { key: 'seo', label: 'SEO', icon: Search }
];

export const ReportsPage: React.FC = () => {
  const [months, setMonths] = useState(6);
  const [data, setData] = useState<Reports | null>(null);
  const [error, setError] = useState('');
  // The chosen tab lives in the URL hash (#seo), so a link can open it directly.
  const [tab, setTabState] = useState<Tab | ''>(() => {
    const hash = window.location.hash.slice(1);
    return TABS.some((t) => t.key === hash) ? (hash as Tab) : '';
  });
  const setTab = (t: Tab) => {
    setTabState(t);
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}#${t}`);
  };

  const load = () => {
    setError('');
    api.get<Reports>(`/staff/reports/?months=${months}`).then(setData).catch((e: Error) => setError(e.message));
  };
  useEffect(load, [months]);
  useEffect(() => {
    const onHash = () => {
      const hash = window.location.hash.slice(1);
      if (TABS.some((t) => t.key === hash)) setTabState(hash as Tab);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Đang tải báo cáo…</p>;
  const { finance, sales, learning, marketing, traffic, seo } = data;
  const available = TABS.filter((t) => (t.key === 'business' ? finance || sales || learning || marketing : data[t.key]));
  const active = available.find((t) => t.key === tab)?.key ?? available[0]?.key;
  const th = 'text-left text-xs text-slate-500 font-semibold py-1.5';
  const td = 'py-1.5 border-t border-slate-100';

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600 font-medium">Khoảng thời gian:</span>
          {[1, 3, 6, 12].map((m) => (
            <button key={m} type="button" onClick={() => setMonths(m)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${months === m ? 'bg-[#0073C1] text-white border-[#0073C1]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {m} tháng
            </button>
          ))}
          <button type="button" onClick={load} className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer" title="Làm mới"><RefreshCw className="w-4 h-4" /></button>
        </div>
        <a
          {...linkProps('/')}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:border-[#0073C1] hover:bg-blue-50 text-xs font-bold text-slate-700 hover:text-[#0073C1] transition-all shadow-xs self-start sm:self-auto cursor-pointer"
        >
          <LayoutDashboard className="w-4 h-4 text-[#0073C1]" />
          <span>Về vận hành hôm nay</span>
        </a>
      </div>

      {available.length > 1 && (
        <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
          {available.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.key} type="button" onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 -mb-px whitespace-nowrap cursor-pointer ${
                  active === t.key ? 'border-[#0073C1] text-[#0073C1]' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}>
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            );
          })}
        </div>
      )}

      {active === 'traffic' && traffic && <TrafficReport data={traffic} />}
      {active === 'seo' && seo && <SeoReport data={seo} />}

      {active === 'business' && finance && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label={`Thu thuần ${months} tháng`} value={formatVND(finance.monthly.reduce((s, r) => s + r.net, 0))} tone="text-emerald-700" />
            <Stat label="Còn phải thu" value={formatVND(finance.outstanding)} />
            <Stat label="Đơn đang trả góp" value={String(finance.installmentOrders)} />
            <Stat label="Kỳ trả góp quá hạn" value={`${finance.overdueInstallments} · ${formatVND(finance.overdueAmount)}`} tone={finance.overdueInstallments ? 'text-red-600' : 'text-slate-900'} />
          </div>
          <Card title="Doanh thu theo tháng (đã thu − đã hoàn)"
            onExport={() => downloadCsv('doanh-thu', ['Tháng', 'Đã thu', 'Đã hoàn', 'Thuần'], finance.monthly.map((r) => [r.month, r.revenue, r.refunds, r.net]))}>
            <Bars rows={finance.monthly.map((r) => ({
              label: monthLabel(r.month),
              values: [
                { v: r.revenue, color: 'bg-emerald-500', title: 'Đã thu' },
                { v: r.refunds, color: 'bg-red-400', title: 'Đã hoàn' }
              ]
            }))} />
            <div className="text-[11px] text-slate-500 flex gap-4"><span>■ <span className="text-emerald-600">Đã thu</span></span><span>■ <span className="text-red-500">Đã hoàn</span></span></div>
          </Card>
        </>
      )}

      {active === 'business' && sales && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <Card title="Lead mới & chuyển đổi theo tháng tạo đơn"
            onExport={() => downloadCsv('tuyen-sinh', ['Tháng', 'Lead', 'Đã đóng phí / vào học'], sales.monthly.map((r) => [r.month, r.leads, r.converted]))}>
            <Bars rows={sales.monthly.map((r) => ({
              label: monthLabel(r.month),
              values: [
                { v: r.leads, color: 'bg-slate-300', title: 'Lead' },
                { v: r.converted, color: 'bg-[#0073C1]', title: 'Chuyển đổi' }
              ]
            }))} />
            <div className="text-xs text-slate-600">
              Tỷ lệ chuyển đổi: <strong>{pct(sales.monthly.reduce((s, r) => s + r.converted, 0), sales.monthly.reduce((s, r) => s + r.leads, 0))}</strong>
            </div>
          </Card>
          <Card title="Nguồn lead"
            onExport={() => downloadCsv('nguon-lead', ['Nguồn', 'Lead', 'Chuyển đổi'], sales.sources.map((r) => [r.source, r.leads, r.converted]))}>
            <table className="w-full text-sm">
              <thead><tr><th className={th}>Nguồn</th><th className={`${th} text-right`}>Lead</th><th className={`${th} text-right`}>Chuyển đổi</th><th className={`${th} text-right`}>Tỷ lệ</th></tr></thead>
              <tbody>
                {sales.sources.map((r) => (
                  <tr key={r.source}><td className={td}>{r.source}</td><td className={`${td} text-right`}>{r.leads}</td><td className={`${td} text-right`}>{r.converted}</td><td className={`${td} text-right font-bold`}>{pct(r.converted, r.leads)}</td></tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card title="Doanh thu theo khóa học / chương trình"
            onExport={() => downloadCsv('san-pham', ['Sản phẩm', 'Loại', 'Học viên', 'Hoàn tiền', 'Thu thuần'], sales.items.map((r) => [r.title, r.kind === 'program' ? 'Chương trình' : 'Khóa học', r.orders, r.refunded, r.net]))}>
            <table className="w-full text-sm">
              <thead><tr><th className={th}>Sản phẩm</th><th className={`${th} text-right`}>Học viên</th><th className={`${th} text-right`}>Hoàn</th><th className={`${th} text-right`}>Thu thuần</th></tr></thead>
              <tbody>
                {sales.items.map((r) => (
                  <tr key={r.title}>
                    <td className={td}>{r.title}{r.kind === 'program' && <span className="ml-1 text-[10px] font-bold text-amber-700">CHƯƠNG TRÌNH</span>}</td>
                    <td className={`${td} text-right`}>{r.orders}</td><td className={`${td} text-right`}>{r.refunded}</td>
                    <td className={`${td} text-right font-mono font-bold`}>{formatVND(r.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card title="Lý do hủy đăng ký"
            onExport={() => downloadCsv('ly-do-huy', ['Lý do', 'Số đăng ký'], (sales.lostReasons || []).map((r) => [r.reason, r.count]))}>
            {(sales.lostReasons || []).length === 0 && <p className="text-sm text-slate-500">Chưa có đăng ký nào bị hủy trong kỳ.</p>}
            {(sales.lostReasons || []).map((r) => (
              <div key={r.reason} className="flex justify-between text-sm border-t border-slate-100 py-1.5"><span>{r.reason}</span><strong>{r.count}</strong></div>
            ))}
          </Card>
          <div className="xl:col-span-2">
            <Card title="Hiệu suất tư vấn viên (lead tạo trong kỳ)"
              onExport={() =>
                downloadCsv(
                  'hieu-suat-tu-van',
                  ['Tư vấn viên', 'Lead', 'Phản hồi đầu (giờ, trung vị)', 'Quá hạn', 'Đóng phí', 'Tỷ lệ %', 'Hủy', 'Thu thuần'],
                  (sales.consultants || []).map((r) => [r.consultant, r.leads, r.medianResponseHours ?? '', r.overdue, r.converted, r.conversionRate, r.lost, r.revenue])
                )
              }>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr>
                      <th className={th}>Tư vấn viên</th><th className={`${th} text-right`}>Lead</th>
                      <th className={`${th} text-right`}>Phản hồi đầu</th><th className={`${th} text-right`}>Đang quá hạn</th>
                      <th className={`${th} text-right`}>Đóng phí</th><th className={`${th} text-right`}>Tỷ lệ</th>
                      <th className={`${th} text-right`}>Hủy</th><th className={`${th} text-right`}>Thu thuần</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(sales.consultants || []).map((r) => (
                      <tr key={r.consultant}>
                        <td className={td}>{r.consultant}</td>
                        <td className={`${td} text-right`}>{r.leads}</td>
                        <td className={`${td} text-right`}>{r.medianResponseHours == null ? '–' : `${r.medianResponseHours} giờ`}</td>
                        <td className={`${td} text-right ${r.overdue ? 'text-red-600 font-bold' : ''}`}>{r.overdue}</td>
                        <td className={`${td} text-right`}>{r.converted}</td>
                        <td className={`${td} text-right font-bold`}>{r.conversionRate}%</td>
                        <td className={`${td} text-right`}>{r.lost}</td>
                        <td className={`${td} text-right font-mono`}>{formatVND(r.revenue)}</td>
                      </tr>
                    ))}
                    {(sales.consultants || []).length === 0 && (
                      <tr><td className={td} colSpan={8}>Chưa có lead trong kỳ.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-slate-500 pt-2">Phản hồi đầu: trung vị số giờ từ lúc lead vào đến lần liên hệ đầu (gọi, Zalo, email hoặc chuyển giai đoạn).</p>
            </Card>
          </div>
        </div>
      )}

      {active === 'business' && marketing && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <Card title={`Phễu marketing ${marketing.days} ngày: ${marketing.views.toLocaleString('vi-VN')} lượt xem → ${marketing.leads} lead → ${marketing.paid} đóng phí`}
            onExport={() => downloadCsv('phieu-kenh', ['Kênh', 'Lượt xem', 'Lead', 'Tỷ lệ lead %', 'Đóng phí'], marketing.channels.map((r) => [r.label, r.views, r.leads, r.leadRate, r.paid]))}>
            <table className="w-full text-sm">
              <thead><tr><th className={th}>Kênh</th><th className={`${th} text-right`}>Lượt xem</th><th className={`${th} text-right`}>Lead</th><th className={`${th} text-right`}>Tỷ lệ</th><th className={`${th} text-right`}>Đóng phí</th></tr></thead>
              <tbody>
                {marketing.channels.map((r) => (
                  <tr key={r.key}><td className={td}>{r.label}</td><td className={`${td} text-right`}>{r.views}</td><td className={`${td} text-right`}>{r.leads}</td>
                    <td className={`${td} text-right font-bold`}>{r.leadRate !== null ? `${r.leadRate}%` : '–'}</td><td className={`${td} text-right`}>{r.paid}</td></tr>
                ))}
              </tbody>
            </table>
            <p className="text-[11px] text-slate-500">Lượt xem đếm ẩn danh (không cookie). Kênh của lead lấy từ link UTM / trang giới thiệu lúc khách đăng ký.</p>
          </Card>
          <Card title="Trang khóa học: lượt xem → lead → đóng phí"
            onExport={() => downloadCsv('phieu-khoa-hoc', ['Khóa học', 'Lượt xem', 'Lead', 'Tỷ lệ lead %', 'Đóng phí'], marketing.pages.map((r) => [r.title, r.views, r.leads, r.leadRate, r.paid]))}>
            <table className="w-full text-sm">
              <thead><tr><th className={th}>Khóa học</th><th className={`${th} text-right`}>Lượt xem</th><th className={`${th} text-right`}>Lead</th><th className={`${th} text-right`}>Tỷ lệ</th><th className={`${th} text-right`}>Đóng phí</th></tr></thead>
              <tbody>
                {marketing.pages.map((r) => (
                  <tr key={r.path}><td className={td}>{r.title}</td><td className={`${td} text-right`}>{r.views}</td><td className={`${td} text-right`}>{r.leads}</td>
                    <td className={`${td} text-right font-bold`}>{r.leadRate !== null ? `${r.leadRate}%` : '–'}</td><td className={`${td} text-right`}>{r.paid}</td></tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {active === 'business' && learning && (
        <Card title={`Kết quả học tập · ${learning.certificates} chứng chỉ đã cấp (${learning.certificates30d} trong 30 ngày)`}
          onExport={() => downloadCsv('hoc-tap', ['Khóa học', 'Đang học', 'Chờ ghi danh', 'Hoàn thành', 'Tỷ lệ hoàn thành %', 'Tiến độ TB %', 'Đã hủy'],
            learning.courses.map((r) => [r.title, r.enrolled, r.waiting, r.completed, r.completionRate, r.avgProgress, r.removed]))}>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={th}>Khóa học</th><th className={`${th} text-right`}>Ghi danh</th><th className={`${th} text-right`}>Chờ</th>
                <th className={`${th} text-right`}>Hoàn thành</th><th className={`${th} text-right`}>Tiến độ TB</th><th className={`${th} text-right`}>Đã hủy</th>
              </tr>
            </thead>
            <tbody>
              {learning.courses.map((r) => (
                <tr key={r.title}>
                  <td className={td}>{r.title}</td><td className={`${td} text-right`}>{r.enrolled}</td><td className={`${td} text-right`}>{r.waiting}</td>
                  <td className={`${td} text-right`}>{r.completed} <span className="text-slate-400">({r.completionRate ?? '–'}%)</span></td>
                  <td className={`${td} text-right`}>{r.avgProgress ?? '–'}%</td><td className={`${td} text-right`}>{r.removed}</td>
                </tr>
              ))}
              {learning.courses.length === 0 && <tr><td className={td} colSpan={6}>Chưa có học viên trên LMS.</td></tr>}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};
