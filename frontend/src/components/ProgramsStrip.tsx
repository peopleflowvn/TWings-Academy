import React, { useEffect, useState } from 'react';
import { ArrowRight, Layers } from 'lucide-react';
import { isBackendEnabled } from '../lib/api';
import { commerceApi, formatVND, Program } from '../lib/commerce';

/** "Chương trình trọn gói" row on the course catalog: programs and courses are browsed in one place. */
export const ProgramsStrip: React.FC = () => {
  const [programs, setPrograms] = useState<Program[]>([]);
  useEffect(() => {
    if (isBackendEnabled()) commerceApi.publicPrograms().then(setPrograms).catch(() => undefined);
  }, []);
  if (!programs.length) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#0056D2]" /> Chương trình trọn gói
          </h2>
          <p className="text-xs text-slate-500">Nhiều khóa theo lộ trình, học phí thấp hơn mua lẻ, có thể trả góp.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {programs.map((p) => (
          <a key={p.id} href={`/chuong-trinh/${p.slug}`}
            className="bg-white rounded-2xl border border-blue-200 p-4 flex flex-col gap-2 hover:shadow-lg transition-shadow">
            <div className="text-[11px] font-bold text-[#0056D2] uppercase">Chương trình · {p.courses.length} khóa học</div>
            <div className="font-bold text-slate-900">{p.title}</div>
            <div className="text-xs text-slate-500 line-clamp-2">{p.courses.map((c) => c.title).join(' → ')}</div>
            <div className="mt-auto flex items-end justify-between pt-2">
              <div>
                <div className="font-black text-slate-900">{formatVND(p.price)}</div>
                {p.coursesTotalPrice > p.price && (
                  <div className="text-[11px] text-emerald-700 font-bold">Tiết kiệm {formatVND(p.coursesTotalPrice - p.price)}</div>
                )}
              </div>
              <span className="text-xs font-bold text-[#0056D2] flex items-center gap-1">
                {p.installmentCount > 1 ? `Trả góp ${p.installmentCount} kỳ` : 'Xem chi tiết'} <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
};
