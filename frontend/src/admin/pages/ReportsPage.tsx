import React, { useEffect, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api';
import { formatVND } from '../../lib/commerce';

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
  };
  marketing?: {
    days: number;
    views: number;
    leads: number;
    paid: number;
    pages: { title: string; path: string; views: number; leads: number; paid: number; leadRate: number | null }[];
    channels: { key: string; label: string; views: number; leads: number; paid: number; leadRate: number | null }[];
  };
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

const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : '–');
const monthLabel = (m: string) => `${m.slice(5)}/${m.slice(2, 4)}`;

/** Download rows as CSV (UTF-8 with BOM so Excel shows Vietnamese correctly). */
function downloadCsv(name: string, header: string[], rows: (string | number | null)[][]) {
  const esc = (v: string | number | null) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = '﻿' + [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const Card: React.FC<{ title: string; onExport?: () => void; children: React.ReactNode }> = ({ title, onExport, children }) => (
  <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
    <div className="flex items-center justify-between gap-2">
      <h3 className="font-bold text-slate-900">{title}</h3>
      {onExport && (
        <button type="button" onClick={onExport} className="text-xs font-bold text-slate-600 border border-slate-200 rounded-lg px-2 py-1 flex items-center gap-1 hover:bg-slate-50 cursor-pointer">
          <Download className="w-3.5 h-3.5" /> CSV
        </button>
      )}
    </div>
    {children}
  </section>
);

const Stat: React.FC<{ label: string; value: string; tone?: string }> = ({ label, value, tone = 'text-slate-900' }) => (
  <div className="bg-white rounded-2xl border border-slate-200 p-4">
    <div className="text-xs text-slate-500">{label}</div>
    <div className={`text-xl font-black ${tone}`}>{value}</div>
  </div>
);

/** Bars scaled to the largest value of the series (no chart library needed). */
const Bars: React.FC<{ rows: { label: string; values: { v: number; color: string; title: string }[] }[] }> = ({ rows }) => {
  const max = Math.max(1, ...rows.flatMap((r) => r.values.map((x) => x.v)));
  return (
    <div className="flex items-end gap-3 h-40 pt-2">
      {rows.map((r) => (
        <div key={r.label} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <div className="flex items-end gap-0.5 h-32 w-full justify-center">
            {r.values.map((x) => (
              <div key={x.title} title={`${x.title}: ${x.v.toLocaleString('vi-VN')}`} className={`${x.color} w-3 sm:w-4 rounded-t`}
                style={{ height: `${Math.max(2, (x.v / max) * 100)}%` }} />
            ))}
          </div>
          <span className="text-[10px] text-slate-500">{r.label}</span>
        </div>
      ))}
    </div>
  );
};

export const ReportsPage: React.FC = () => {
  const [months, setMonths] = useState(6);
  const [data, setData] = useState<Reports | null>(null);
  const [error, setError] = useState('');

  const load = () => {
    setError('');
    api.get<Reports>(`/staff/reports/?months=${months}`).then(setData).catch((e: Error) => setError(e.message));
  };
  useEffect(load, [months]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Đang tải báo cáo…</p>;
  const { finance, sales, learning, marketing } = data;
  const th = 'text-left text-xs text-slate-500 font-semibold py-1.5';
  const td = 'py-1.5 border-t border-slate-100';

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-600">Khoảng thời gian:</span>
        {[3, 6, 12].map((m) => (
          <button key={m} type="button" onClick={() => setMonths(m)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${months === m ? 'bg-[#0073C1] text-white border-[#0073C1]' : 'border-slate-200 text-slate-600'}`}>
            {m} tháng
          </button>
        ))}
        <button type="button" onClick={load} className="p-2 rounded-xl border border-slate-200 cursor-pointer" title="Làm mới"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {finance && (
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

      {sales && (
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
          <Card title="Pipeline tư vấn (toàn bộ)">
            {Object.entries(sales.pipeline).sort().map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm border-t border-slate-100 py-1.5"><span>{k}</span><strong>{v}</strong></div>
            ))}
          </Card>
        </div>
      )}

      {marketing && (
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

      {learning && (
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
