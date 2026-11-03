import React from 'react';
import { Download } from 'lucide-react';

export const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : '–');
export const monthLabel = (m: string) => `${m.slice(5)}/${m.slice(2, 4)}`;

/** Download rows as CSV (UTF-8 with BOM so Excel shows Vietnamese correctly). */
export function downloadCsv(name: string, header: string[], rows: (string | number | null)[][]) {
  const esc = (v: string | number | null) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = '﻿' + [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export const Card: React.FC<{ title: string; onExport?: () => void; children: React.ReactNode }> = ({ title, onExport, children }) => (
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

export const Stat: React.FC<{ label: string; value: string; tone?: string }> = ({ label, value, tone = 'text-slate-900' }) => (
  <div className="bg-white rounded-2xl border border-slate-200 p-4">
    <div className="text-xs text-slate-500">{label}</div>
    <div className={`text-xl font-black ${tone}`}>{value}</div>
  </div>
);

/** Bars scaled to the largest value of the series (no chart library needed). */
export const Bars: React.FC<{ rows: { label: string; values: { v: number; color: string; title: string }[] }[] }> = ({ rows }) => {
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

