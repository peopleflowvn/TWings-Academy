import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle2, ExternalLink, Info, XCircle } from 'lucide-react';
import { Card, Stat, downloadCsv } from './ReportWidgets';

type Group = 'search' | 'social' | 'direct' | 'referral' | 'campaign';
type Bucket = 'day' | 'week' | 'month';
type Severity = 'error' | 'warning' | 'info';

export interface TrafficData {
  days: number;
  since: string;
  bucket: Bucket;
  views: number;
  previousViews: number;
  change: number | null;
  today: number;
  last7: number;
  dailyAverage: number;
  trackingSince: string | null;
  series: ({ start: string; partial: boolean } & Record<Group, number>)[];
  channels: { key: Group; label: string; views: number; previous: number; change: number | null }[];
  sources: { key: string; label: string; group: Group; views: number; previous: number }[];
  sections: { key: string; label: string; views: number; previous: number }[];
  pages: { path: string; title: string; views: number; search: number; previous: number; change: number | null }[];
}

interface AuditPage {
  path: string;
  kind: string;
  title: string;
  description: string;
  issues: string[];
  score: number;
  views: number;
  searchViews: number;
  googleLastCrawl: string | null;
  focusKeyword?: string;
  editorScore?: number;
  textLength?: number;
}

export interface SeoData {
  days: number;
  bucket: Bucket;
  organic: {
    views: number;
    previous: number;
    change: number | null;
    engines: { key: string; label: string; views: number; previous: number }[];
    landing: { path: string; title: string; views: number; previous: number }[];
  };
  series: { start: string; partial: boolean; searchViews: number; googlebot: number }[];
  crawl: {
    trackingSince: string | null;
    searchHits: number;
    notFound: number;
    redirects: number;
    bots: { key: string; label: string; search: boolean; hits: number; previous: number; errors: number; lastSeen: string | null }[];
  };
  audit: {
    pages: AuditPage[];
    summary: { pages: number; healthy: number; averageScore: number | null; neverCrawled: number; noViews: number };
    issues: { code: string; severity: Severity; label: string; count: number }[];
  };
  site: { key: string; ok: boolean; label: string; detail: string }[];
  content: {
    articles: number;
    published30d: number;
    published90d: number;
    lastPublished: string | null;
    drafts: number;
    scheduled: number;
  };
}

// Categorical slots 1-5 of the validated chart palette, in fixed order (never cycled, never by rank).
const GROUP_COLORS: Record<Group, string> = {
  search: '#2a78d6',
  social: '#eb6834',
  direct: '#1baf7a',
  referral: '#eda100',
  campaign: '#e87ba4'
};
const BLUE = '#2a78d6';

const th = 'text-left text-xs text-slate-500 font-semibold py-1.5 px-1.5 first:pl-0 last:pr-0 whitespace-nowrap';
const td = 'py-1.5 px-1.5 first:pl-0 last:pr-0 border-t border-slate-100';
const num = (n: number) => n.toLocaleString('vi-VN');
const share = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : '–');

const fmtDate = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString('vi-VN') : '–');
const daysAgo = (iso: string | null) => {
  if (!iso) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - new Date(`${iso.slice(0, 10)}T00:00:00`).getTime()) / 86400000);
};
const agoLabel = (iso: string | null) => {
  const d = daysAgo(iso);
  if (d === null) return 'Chưa ghi nhận';
  return d <= 0 ? 'Hôm nay' : d === 1 ? 'Hôm qua' : `${d} ngày trước`;
};

function bucketLabel(start: string, bucket: Bucket, long = false) {
  const [y, m, d] = start.split('-');
  if (bucket === 'month') return long ? `Tháng ${m}/${y}` : `${m}/${y.slice(2)}`;
  if (bucket === 'week') return long ? `Tuần từ ${d}/${m}/${y}` : `${d}/${m}`;
  return long ? `${d}/${m}/${y}` : `${d}/${m}`;
}

/** Change against the previous period of the same length: arrow + sign + text, never color alone. */
const Delta: React.FC<{ change: number | null; previous: number; current: number }> = ({ change, previous, current }) => {
  if (change === null) {
    return <span className="text-[11px] text-slate-400">{current && !previous ? 'mới' : '–'}</span>;
  }
  if (change === 0) return <span className="text-[11px] text-slate-500">0%</span>;
  const up = change > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold ${up ? 'text-emerald-700' : 'text-red-600'}`}>
      <Icon className="w-3 h-3" />
      {up ? '+' : ''}
      {change}%
    </span>
  );
};

/** Stacked columns (one stack per bucket) with a 2px surface gap between segments and a hover tooltip. */
const Columns: React.FC<{
  rows: { start: string; partial?: boolean; values: number[] }[];
  series: { key: string; label: string; color: string }[];
  bucket: Bucket;
  unit: string;
}> = ({ rows, series, bucket, unit }) => {
  const [hover, setHover] = useState<number | null>(null);
  const totals = rows.map((r) => r.values.reduce((s, v) => s + v, 0));
  const max = Math.max(1, ...totals);
  const every = Math.max(1, Math.ceil(rows.length / 10));
  return (
    <div className="space-y-2">
      {series.length > 1 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
          {series.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <div className="flex items-end gap-[2px] h-40 border-b border-slate-200" onMouseLeave={() => setHover(null)}>
          {rows.map((r, i) => (
            <div
              key={r.start}
              className={`flex-1 min-w-0 h-full flex flex-col justify-end cursor-default ${hover === i ? 'bg-slate-100/80' : ''}`}
              onMouseEnter={() => setHover(i)}
            >
              <div
                className={`flex flex-col-reverse gap-[2px] mx-auto w-full max-w-[28px] ${r.partial ? 'opacity-40' : ''}`}
                style={{ height: `${(totals[i] / max) * 100}%` }}
              >
                {r.values.map((v, k) =>
                  v > 0 ? (
                    <div
                      key={series[k].key}
                      className={k === r.values.reduce((top, x, j) => (x > 0 ? j : top), -1) ? 'rounded-t' : ''}
                      style={{ backgroundColor: series[k].color, flexGrow: v, minHeight: 2 }}
                    />
                  ) : null
                )}
              </div>
            </div>
          ))}
        </div>
        {hover !== null && rows[hover] && (
          <div
            className="absolute -top-2 z-10 -translate-y-full pointer-events-none bg-white border border-slate-200 shadow-lg rounded-lg px-3 py-2 text-xs min-w-[160px]"
            style={{ left: `clamp(0px, calc(${((hover + 0.5) / rows.length) * 100}% - 80px), calc(100% - 170px))` }}
          >
            <div className="font-bold text-slate-900">{bucketLabel(rows[hover].start, bucket, true)}</div>
            {rows[hover].partial && (
              <div className="text-[10px] text-slate-500">
                {bucket === 'week' ? 'Chưa trọn tuần' : 'Chưa trọn tháng'} trong kỳ, không so sánh với cột khác
              </div>
            )}
            <div className="mb-1" />
            {series.map((s, k) => (
              <div key={s.key} className="flex items-center justify-between gap-3 text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: s.color }} />
                  {s.label}
                </span>
                <span className="font-mono text-slate-900">{num(rows[hover].values[k])}</span>
              </div>
            ))}
            {series.length > 1 && (
              <div className="flex justify-between gap-3 border-t border-slate-100 mt-1 pt-1 font-bold text-slate-900">
                <span>Tổng</span>
                <span className="font-mono">{num(totals[hover])}</span>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex gap-[2px]">
        {rows.map((r, i) => (
          <span key={r.start} className="flex-1 min-w-0 text-center text-[10px] text-slate-500 overflow-visible whitespace-nowrap">
            {i % every === 0 ? bucketLabel(r.start, bucket) : ''}
          </span>
        ))}
      </div>
      <div className="flex justify-between gap-2 text-[10px] text-slate-400">
        <span>{rows.some((r) => r.partial) ? `Cột mờ: ${bucket === 'week' ? 'tuần' : 'tháng'} chưa trọn trong kỳ` : ''}</span>
        <span>Cao nhất: {num(max)} {unit}</span>
      </div>
    </div>
  );
};

/** A row of a ranking with a thin proportion bar (the number is always printed). */
const ShareRow: React.FC<{ label: React.ReactNode; value: number; total: number; color?: string; extra?: React.ReactNode }> = ({
  label,
  value,
  total,
  color = BLUE,
  extra
}) => (
  <div className="py-1.5 border-t border-slate-100">
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="min-w-0 truncate">{label}</span>
      <span className="shrink-0 flex items-center gap-2">
        <strong>{num(value)}</strong>
        <span className="text-[11px] text-slate-500 w-9 text-right">{share(value, total)}</span>
        {extra}
      </span>
    </div>
    <div className="h-1 rounded-full bg-slate-100 mt-1">
      <div className="h-1 rounded-full" style={{ width: `${total ? (100 * value) / total : 0}%`, backgroundColor: color }} />
    </div>
  </div>
);

const Before: React.FC<{ n: number }> = ({ n }) => (
  <span className="text-[11px] text-slate-400 w-20 text-right whitespace-nowrap">trước {num(n)}</span>
);

const PageLink: React.FC<{ path: string; title: string }> = ({ path, title }) => (
  <a href={path} target="_blank" rel="noreferrer" title={title} className="group flex flex-col min-w-0 max-w-full hover:text-[#0073C1]">
    <span className="block truncate font-medium">{title}</span>
    <span className="text-[10px] text-slate-400 truncate flex items-center gap-1">
      {path} <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100" />
    </span>
  </a>
);

// ------------------------------------------------------------------ traffic
export const TrafficReport: React.FC<{ data: TrafficData }> = ({ data }) => {
  const groups = data.channels.map((c) => ({ key: c.key, label: c.label, color: GROUP_COLORS[c.key] }));
  const sectionTotal = data.sections.reduce((s, r) => s + r.views, 0);
  const groupLabel = Object.fromEntries(data.channels.map((c) => [c.key, c.label]));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500">Lượt xem {data.days} ngày</div>
          <div className="text-xl font-black text-slate-900">{num(data.views)}</div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <Delta change={data.change} previous={data.previousViews} current={data.views} /> so với {num(data.previousViews)} kỳ trước
          </div>
        </div>
        <Stat label="Hôm nay" value={num(data.today)} />
        <Stat label="7 ngày qua" value={num(data.last7)} />
        <Stat label="Trung bình mỗi ngày" value={data.dailyAverage.toLocaleString('vi-VN')} />
      </div>

      <Card
        title="Lượt xem theo kênh"
        onExport={() =>
          downloadCsv(
            'truy-cap-theo-thoi-gian',
            ['Từ ngày', ...groups.map((g) => g.label), 'Tổng'],
            data.series.map((r) => [r.start, ...groups.map((g) => r[g.key as Group]), groups.reduce((s, g) => s + r[g.key as Group], 0)])
          )
        }
      >
        <Columns
          rows={data.series.map((r) => ({ start: r.start, partial: r.partial, values: groups.map((g) => r[g.key as Group]) }))}
          series={groups}
          bucket={data.bucket}
          unit="lượt xem"
        />
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={th}>Kênh</th>
              <th className={`${th} text-right`}>Lượt xem</th>
              <th className={`${th} text-right`}>Tỷ trọng</th>
              <th className={`${th} text-right`}>Kỳ trước</th>
              <th className={`${th} text-right`}>Thay đổi</th>
            </tr>
          </thead>
          <tbody>
            {data.channels.map((c) => (
              <tr key={c.key}>
                <td className={td}>
                  <span className="inline-flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: GROUP_COLORS[c.key] }} />
                    {c.label}
                  </span>
                </td>
                <td className={`${td} text-right font-bold`}>{num(c.views)}</td>
                <td className={`${td} text-right`}>{share(c.views, data.views)}</td>
                <td className={`${td} text-right text-slate-500`}>{num(c.previous)}</td>
                <td className={`${td} text-right`}>
                  <Delta change={c.change} previous={c.previous} current={c.views} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card
          title="Nguồn truy cập chi tiết"
          onExport={() =>
            downloadCsv('nguon-truy-cap', ['Nguồn', 'Nhóm kênh', 'Lượt xem', 'Kỳ trước'], data.sources.map((r) => [r.label, groupLabel[r.group], r.views, r.previous]))
          }
        >
          {data.sources.length === 0 && <p className="text-sm text-slate-500">Chưa có lượt xem trong kỳ.</p>}
          {data.sources.slice(0, 15).map((s) => (
            <ShareRow
              key={s.key}
              label={s.label}
              value={s.views}
              total={data.views}
              color={GROUP_COLORS[s.group]}
              extra={<Before n={s.previous} />}
            />
          ))}
        </Card>
        <Card title="Theo khu vực của website">
          {data.sections.length === 0 && <p className="text-sm text-slate-500">Chưa có lượt xem trong kỳ.</p>}
          {data.sections.map((s) => (
            <ShareRow
              key={s.key}
              label={s.label}
              value={s.views}
              total={sectionTotal}
              extra={<Before n={s.previous} />}
            />
          ))}
        </Card>
      </div>

      <Card
        title="Trang được xem nhiều nhất"
        onExport={() =>
          downloadCsv(
            'trang-xem-nhieu',
            ['Trang', 'Đường dẫn', 'Lượt xem', 'Từ tìm kiếm', 'Kỳ trước', 'Thay đổi %'],
            data.pages.map((r) => [r.title, r.path, r.views, r.search, r.previous, r.change])
          )
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr>
                <th className={th}>Trang</th>
                <th className={`${th} text-right`}>Lượt xem</th>
                <th className={`${th} text-right`}>Từ tìm kiếm</th>
                <th className={`${th} text-right`}>Kỳ trước</th>
                <th className={`${th} text-right`}>Thay đổi</th>
              </tr>
            </thead>
            <tbody>
              {data.pages.slice(0, 25).map((r) => (
                <tr key={r.path}>
                  <td className={`${td} max-w-[320px]`}>
                    <PageLink path={r.path} title={r.title} />
                  </td>
                  <td className={`${td} text-right font-bold`}>{num(r.views)}</td>
                  <td className={`${td} text-right`}>{num(r.search)}</td>
                  <td className={`${td} text-right text-slate-500`}>{num(r.previous)}</td>
                  <td className={`${td} text-right`}>
                    <Delta change={r.change} previous={r.previous} current={r.views} />
                  </td>
                </tr>
              ))}
              {data.pages.length === 0 && (
                <tr>
                  <td className={td} colSpan={5}>Chưa có lượt xem trong kỳ.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="text-[11px] text-slate-500">
        Lượt xem được đếm ẩn danh, không cookie, không lưu IP; bot và công cụ tự động không được tính. Kênh là nguồn gần nhất đưa khách tới website (link UTM
        hoặc trang giới thiệu), nên khách quay lại trực tiếp sau khi đến từ Google vẫn tính vào Google; link có utm_source=google (quảng cáo) cũng tính vào
        tìm kiếm.{data.trackingSince && ` Dữ liệu có từ ${fmtDate(data.trackingSince)}.`}
      </p>
    </div>
  );
};

// ------------------------------------------------------------------ SEO
const SEVERITY: Record<Severity, { label: string; icon: React.ElementType; className: string }> = {
  error: { label: 'Lỗi', icon: XCircle, className: 'text-red-700 bg-red-50 border-red-200' },
  warning: { label: 'Cần sửa', icon: AlertTriangle, className: 'text-amber-800 bg-amber-50 border-amber-200' },
  info: { label: 'Gợi ý', icon: Info, className: 'text-slate-700 bg-slate-50 border-slate-200' }
};

const SeverityBadge: React.FC<{ severity: Severity; children?: React.ReactNode }> = ({ severity, children }) => {
  const s = SEVERITY[severity];
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold border rounded-md px-1.5 py-0.5 ${s.className}`}>
      <Icon className="w-3 h-3 shrink-0" />
      {children ?? s.label}
    </span>
  );
};

const scoreTone = (score: number) => (score >= 80 ? 'text-emerald-700' : score >= 60 ? 'text-amber-700' : 'text-red-600');

export const SeoReport: React.FC<{ data: SeoData }> = ({ data }) => {
  const [issue, setIssue] = useState('');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(30);
  const issueInfo = useMemo(() => Object.fromEntries(data.audit.issues.map((i) => [i.code, i])), [data]);
  const { summary } = data.audit;
  const searchBots = data.crawl.bots.filter((b) => b.search);
  const google = data.crawl.bots.find((b) => b.key === 'google');
  const engineTotal = data.organic.engines.reduce((s, e) => s + e.views, 0);

  const pages = data.audit.pages.filter(
    (p) =>
      (!issue || p.issues.includes(issue)) &&
      (!query || `${p.title} ${p.path}`.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500">Lượt xem từ tìm kiếm ({data.days} ngày)</div>
          <div className="text-xl font-black text-slate-900">{num(data.organic.views)}</div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <Delta change={data.organic.change} previous={data.organic.previous} current={data.organic.views} /> so với {num(data.organic.previous)} kỳ trước
          </div>
        </div>
        <Stat label="Lượt Googlebot thu thập" value={num(google?.hits ?? 0)} />
        <Stat
          label="Điểm SEO trung bình"
          value={summary.averageScore === null ? '–' : `${summary.averageScore}/100`}
          tone={summary.averageScore === null ? 'text-slate-900' : scoreTone(summary.averageScore)}
        />
        <Stat label="Trang không có lỗi / cần sửa" value={`${summary.healthy}/${summary.pages}`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card title="Lượt xem từ công cụ tìm kiếm">
          <Columns
            rows={data.series.map((r) => ({ start: r.start, partial: r.partial, values: [r.searchViews] }))}
            series={[{ key: 'search', label: 'Lượt xem từ tìm kiếm', color: BLUE }]}
            bucket={data.bucket}
            unit="lượt xem"
          />
          {data.organic.engines.map((e) => (
            <ShareRow key={e.key} label={e.label} value={e.views} total={engineTotal}
              extra={<Before n={e.previous} />} />
          ))}
          {data.organic.engines.length === 0 && <p className="text-sm text-slate-500">Chưa có lượt xem nào từ Google, Cốc Cốc hay Bing trong kỳ.</p>}
        </Card>
        <Card title="Googlebot ghé website">
          <Columns
            rows={data.series.map((r) => ({ start: r.start, partial: r.partial, values: [r.googlebot] }))}
            series={[{ key: 'googlebot', label: 'Lượt Googlebot', color: BLUE }]}
            bucket={data.bucket}
            unit="lượt"
          />
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-slate-50 p-2">
              <div className="text-[11px] text-slate-500">Bot tìm kiếm</div>
              <div className="font-black">{num(data.crawl.searchHits)}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-2">
              <div className="text-[11px] text-slate-500">Gặp trang 404</div>
              <div className={`font-black ${data.crawl.notFound ? 'text-red-600' : ''}`}>{num(data.crawl.notFound)}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-2">
              <div className="text-[11px] text-slate-500">Chuyển hướng 301</div>
              <div className="font-black">{num(data.crawl.redirects)}</div>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            {data.crawl.trackingSince
              ? `Ghi nhận bot từ ${fmtDate(data.crawl.trackingSince)}.`
              : 'Chưa ghi nhận lượt bot nào: số liệu bắt đầu có từ khi bản cập nhật này lên máy chủ.'}{' '}
            Google chỉ hiển thị trang đã thu thập; trang lâu không được ghé nên gửi lại trong Google Search Console.
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card
          title="Trang đích từ tìm kiếm"
          onExport={() => downloadCsv('trang-dich-tim-kiem', ['Trang', 'Đường dẫn', 'Lượt xem', 'Kỳ trước'], data.organic.landing.map((r) => [r.title, r.path, r.views, r.previous]))}
        >
          {data.organic.landing.length === 0 && <p className="text-sm text-slate-500">Chưa có trang nào được vào từ tìm kiếm trong kỳ.</p>}
          {data.organic.landing.map((r) => (
            <ShareRow key={r.path} label={<PageLink path={r.path} title={r.title} />} value={r.views} total={data.organic.views}
              extra={<Before n={r.previous} />} />
          ))}
        </Card>
        <Card title="Bot thu thập & xem trước link">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={th}>Bot</th>
                <th className={`${th} text-right`}>Lượt</th>
                <th className={`${th} text-right`}>Kỳ trước</th>
                <th className={`${th} text-right`}>Lỗi</th>
                <th className={`${th} text-right`}>Lần cuối</th>
              </tr>
            </thead>
            <tbody>
              {[...searchBots, ...data.crawl.bots.filter((b) => !b.search)].map((b) => (
                <tr key={b.key}>
                  <td className={td}>{b.label}</td>
                  <td className={`${td} text-right font-bold`}>{num(b.hits)}</td>
                  <td className={`${td} text-right text-slate-500`}>{num(b.previous)}</td>
                  <td className={`${td} text-right ${b.errors ? 'text-red-600 font-bold' : ''}`}>{num(b.errors)}</td>
                  <td className={`${td} text-right text-xs`}>{agoLabel(b.lastSeen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[11px] text-slate-500">Lượt xem trước link (Facebook, Zalo…) cho biết trang được chia sẻ bao nhiêu lần trên mạng xã hội.</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card title="Cấu hình SEO toàn website">
          {data.site.map((c) => (
            <div key={c.key} className="flex items-start gap-2 text-sm border-t border-slate-100 py-1.5">
              {c.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />}
              <div className="min-w-0">
                <div>
                  {c.label} <span className={`text-[11px] font-bold ${c.ok ? 'text-emerald-700' : 'text-red-600'}`}>{c.ok ? 'Đạt' : 'Chưa đạt'}</span>
                </div>
                {c.detail && <div className="text-[11px] text-slate-500 break-all">{c.detail}</div>}
              </div>
            </div>
          ))}
          <p className="text-[11px] text-slate-500">Sửa tại Nội dung → Cài đặt SEO.</p>
        </Card>
        <Card title="Nhịp đăng bài (Tin tức & Cẩm nang)">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-slate-50 p-2">
              <div className="text-[11px] text-slate-500">Đang hiển thị</div>
              <div className="font-black">{data.content.articles}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-2">
              <div className="text-[11px] text-slate-500">Bài mới 30 ngày</div>
              <div className="font-black">{data.content.published30d}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-2">
              <div className="text-[11px] text-slate-500">Bài mới 90 ngày</div>
              <div className="font-black">{data.content.published90d}</div>
            </div>
          </div>
          <div className="text-sm space-y-1">
            <div className="flex justify-between border-t border-slate-100 pt-1.5"><span>Bài gần nhất</span><strong>{fmtDate(data.content.lastPublished)}</strong></div>
            <div className="flex justify-between border-t border-slate-100 pt-1.5"><span>Bản nháp</span><strong>{data.content.drafts}</strong></div>
            <div className="flex justify-between border-t border-slate-100 pt-1.5"><span>Hẹn giờ đăng</span><strong>{data.content.scheduled}</strong></div>
          </div>
          {data.content.published30d === 0 && (
            <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Chưa có bài mới trong 30 ngày. Đăng đều (ví dụ 1–2 bài mỗi tuần) giúp Google ghé website thường xuyên hơn.
            </div>
          )}
        </Card>
      </div>

      <Card title={`Vấn đề SEO trên ${summary.pages} trang trong sitemap`}>
        {data.audit.issues.length === 0 && <p className="text-sm text-emerald-700">Không phát hiện vấn đề nào.</p>}
        <div className="flex flex-wrap gap-2">
          {data.audit.issues.map((i) => (
            <button
              key={i.code}
              type="button"
              onClick={() => setIssue(issue === i.code ? '' : i.code)}
              className={`text-left rounded-xl border px-3 py-2 text-xs cursor-pointer transition-all ${
                issue === i.code ? 'border-[#0073C1] ring-2 ring-[#0073C1]/20 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <SeverityBadge severity={i.severity} />
                <strong className="text-slate-900">{i.count} trang</strong>
              </div>
              <div className="mt-1 text-slate-700">{i.label}</div>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
          <div className="rounded-xl bg-slate-50 p-2">
            Googlebot chưa từng ghé: <strong>{summary.neverCrawled}</strong> trang
          </div>
          <div className="rounded-xl bg-slate-50 p-2">
            Không có lượt xem nào trong kỳ: <strong>{summary.noViews}</strong> trang
          </div>
        </div>
      </Card>

      <Card
        title="Kiểm tra từng trang"
        onExport={() =>
          downloadCsv(
            'kiem-tra-seo',
            ['Trang', 'Đường dẫn', 'Điểm', 'Vấn đề', 'Tiêu đề (Google)', 'Mô tả (Google)', 'Từ khóa chính', 'Lượt xem', 'Từ tìm kiếm', 'Googlebot ghé lần cuối'],
            pages.map((p) => [
              p.title,
              p.path,
              p.score,
              p.issues.map((c) => issueInfo[c]?.label ?? c).join('; '),
              p.title,
              p.description,
              p.focusKeyword ?? '',
              p.views,
              p.searchViews,
              p.googleLastCrawl ?? ''
            ])
          )
        }
      >
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tiêu đề hoặc đường dẫn…"
            className="flex-1 border border-slate-200 rounded-xl px-3 py-1.5 text-sm"
          />
          <select value={issue} onChange={(e) => setIssue(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm">
            <option value="">Mọi trang ({data.audit.pages.length})</option>
            {data.audit.issues.map((i) => (
              <option key={i.code} value={i.code}>
                {i.label} ({i.count})
              </option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr>
                <th className={th}>Trang (tiêu đề Google thấy)</th>
                <th className={`${th} text-right`}>Điểm</th>
                <th className={th}>Vấn đề</th>
                <th className={`${th} text-right`}>Lượt xem</th>
                <th className={`${th} text-right`}>Từ tìm kiếm</th>
                <th className={`${th} text-right`}>Googlebot</th>
              </tr>
            </thead>
            <tbody>
              {pages.slice(0, limit).map((p) => (
                <tr key={p.path} className="align-top">
                  <td className={`${td} max-w-[300px]`}>
                    <PageLink path={p.path} title={p.title || p.path} />
                    {p.description && <div className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{p.description}</div>}
                    {p.focusKeyword && <div className="text-[10px] text-slate-500 mt-0.5">Từ khóa: <strong>{p.focusKeyword}</strong></div>}
                  </td>
                  <td className={`${td} text-right font-black ${scoreTone(p.score)}`}>{p.score}</td>
                  <td className={td}>
                    <div className="flex flex-wrap gap-1">
                      {p.issues.length === 0 && <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700"><CheckCircle2 className="w-3 h-3" /> Đạt</span>}
                      {p.issues.map((c) => (
                        <SeverityBadge key={c} severity={issueInfo[c]?.severity ?? 'info'}>
                          {issueInfo[c]?.label ?? c}
                        </SeverityBadge>
                      ))}
                    </div>
                  </td>
                  <td className={`${td} text-right`}>{num(p.views)}</td>
                  <td className={`${td} text-right`}>{num(p.searchViews)}</td>
                  <td className={`${td} text-right text-xs whitespace-nowrap`}>{agoLabel(p.googleLastCrawl)}</td>
                </tr>
              ))}
              {pages.length === 0 && (
                <tr>
                  <td className={td} colSpan={6}>Không có trang phù hợp.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {pages.length > limit && (
          <button type="button" onClick={() => setLimit(limit + 50)} className="text-xs font-bold text-[#0073C1] cursor-pointer">
            Xem thêm ({pages.length - limit} trang)
          </button>
        )}
        <p className="text-[11px] text-slate-500">
          Kiểm tra đúng nội dung máy chủ trả cho Google và Facebook (tiêu đề, mô tả, ảnh chia sẻ, độ dài nội dung). Điểm: 100 trừ 30 mỗi lỗi, 10 mỗi mục cần sửa, 3
          mỗi gợi ý. Thứ hạng từ khóa và số lần hiển thị trên Google chỉ có trong Google Search Console.
        </p>
      </Card>
    </div>
  );
};
