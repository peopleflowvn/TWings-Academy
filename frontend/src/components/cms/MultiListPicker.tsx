import React, { useState } from 'react';
import { Check, Search, X } from 'lucide-react';

interface Props {
  /** The list's values (/app → Hệ thống → Danh mục). */
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  /** Where the list is managed, shown under the picker. */
  manageHint?: string;
  placeholder?: string;
}

/**
 * Pick several values of an option list: the picked ones as chips (in the order picked), the list with
 * checkboxes and a filter. A picked value no longer in the list (hidden / renamed) stays until removed.
 */
export const MultiListPicker: React.FC<Props> = ({ options, value, onChange, manageHint, placeholder = 'Lọc danh sách…' }) => {
  const [q, setQ] = useState('');
  const all = Array.from(new Set([...options, ...value]));
  const shown = all.filter((o) => !q.trim() || o.toLowerCase().includes(q.trim().toLowerCase()));
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter((v) => v !== o) : [...value, o]);

  return (
    <div className="border border-slate-300 rounded-xl bg-white">
      <div className="flex flex-wrap gap-1.5 p-2 border-b border-slate-100 min-h-[42px]">
        {value.length === 0 && <span className="text-slate-400 text-xs self-center">Chưa chọn – tick một hoặc nhiều mục bên dưới</span>}
        {value.map((v, i) => (
          <span key={v} className="px-2 py-1 rounded-lg bg-blue-50 border border-blue-200 text-[#0073C1] text-xs font-bold flex items-center gap-1">
            <span className="text-[10px] text-blue-400">{i + 1}.</span> {v}
            {!options.includes(v) && <span className="text-[10px] text-amber-600 font-normal">(không còn trong danh mục)</span>}
            <button type="button" onClick={() => toggle(v)} className="cursor-pointer hover:text-red-600" aria-label={`Bỏ ${v}`}>
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      {all.length > 6 && (
        <div className="relative px-2 pt-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="w-full pl-7 pr-2 py-1.5 text-xs border border-slate-200 rounded-lg" />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-4 top-4" />
        </div>
      )}
      <div className="max-h-48 overflow-y-auto p-1">
        {shown.map((o) => {
          const on = value.includes(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => toggle(o)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs cursor-pointer ${on ? 'bg-blue-50 text-slate-900 font-bold' : 'hover:bg-slate-50 text-slate-700'}`}
            >
              <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${on ? 'bg-[#0073C1] border-[#0073C1]' : 'border-slate-300'}`}>
                {on && <Check className="w-3 h-3 text-white" />}
              </span>
              {o}
            </button>
          );
        })}
        {shown.length === 0 && <p className="text-xs text-slate-400 p-2">Không có mục nào.</p>}
      </div>
      {manageHint && <p className="text-[11px] text-slate-500 px-2 py-1.5 border-t border-slate-100">{manageHint}</p>}
    </div>
  );
};
