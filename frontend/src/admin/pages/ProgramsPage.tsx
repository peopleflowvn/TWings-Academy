import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, ExternalLink, Plus, Save, Trash2, X } from 'lucide-react';
import { Course } from '../../types';
import { commerceApi, formatVND, Program } from '../../lib/commerce';
import { ImageUploadField } from '../../components/cms/ImageUploadField';

type Draft = Partial<Program> & { courseIds: string[] };

const EMPTY: Draft = {
  slug: '',
  title: '',
  subtitle: '',
  description: '',
  thumbnail: '',
  highlights: [],
  price: 0,
  originalPrice: 0,
  installmentCount: 1,
  installmentIntervalDays: 30,
  isPublished: false,
  sortOrder: 0,
  courseIds: []
};

const slugify = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Programs ("Chương trình"): several courses sold at one price, optionally in installments. */
export const ProgramsPage: React.FC<{ courses: Course[]; canEdit: boolean }> = ({ courses, canEdit }) => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => commerceApi.staffPrograms().then(setPrograms).catch((e: Error) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  const byId = new Map(courses.map((c) => [c.id, c]));
  const coursesTotal = (draft?.courseIds || []).reduce((sum, id) => sum + (byId.get(id)?.price || 0), 0);

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    setError('');
    try {
      await commerceApi.saveProgram({ ...draft, slug: draft.slug || slugify(draft.title || '') });
      setDraft(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lưu thất bại');
    } finally {
      setBusy(false);
    }
  };
  const remove = async (p: Program) => {
    if (!window.confirm(`Xóa chương trình "${p.title}"? Đơn đã bán vẫn được giữ.`)) return;
    try {
      await commerceApi.deleteProgram(p.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xóa thất bại');
    }
  };
  const move = (i: number, d: -1 | 1) => {
    if (!draft) return;
    const ids = [...draft.courseIds];
    [ids[i], ids[i + d]] = [ids[i + d], ids[i]];
    setDraft({ ...draft, courseIds: ids });
  };

  const input = 'w-full p-2.5 border border-slate-300 rounded-xl text-sm';
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600 max-w-2xl">
          Chương trình gồm nhiều khóa học bán theo một giá (có thể trả góp). Khi học viên thanh toán, mỗi khóa trong chương
          trình tự có một đơn thành phần, được xếp lớp và ghi danh Moodle như khi mua lẻ.
        </p>
        {canEdit && (
          <button type="button" onClick={() => setDraft({ ...EMPTY })}
            className="px-4 py-2 rounded-xl bg-[#0073C1] text-white text-sm font-bold flex items-center gap-1.5 cursor-pointer">
            <Plus className="w-4 h-4" /> Chương trình mới
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
        {programs.length === 0 && <p className="p-5 text-sm text-slate-500">Chưa có chương trình nào.</p>}
        {programs.map((p) => (
          <div key={p.id} className="p-4 flex flex-wrap items-center gap-4">
            <div className="min-w-0 flex-1">
              <div className="font-bold text-slate-900">
                {p.title}{' '}
                <span className={`ml-1 text-[10px] font-bold rounded-full px-2 py-0.5 border ${p.isPublished ? 'text-emerald-700 border-emerald-200 bg-emerald-50' : 'text-slate-500 border-slate-200'}`}>
                  {p.isPublished ? 'Đang bán' : 'Nháp'}
                </span>
              </div>
              <div className="text-xs text-slate-500">
                {p.courses.map((c) => c.title).join(' · ') || 'Chưa có khóa học'}
              </div>
            </div>
            <div className="text-right text-xs">
              <div className="font-bold text-slate-900 text-sm">{formatVND(p.price)}</div>
              {p.installmentCount > 1 && <div className="text-amber-700">Trả góp {p.installmentCount} kỳ</div>}
              <div className="text-slate-500">{p.ordersCount ?? 0} học viên</div>
            </div>
            <div className="flex gap-2">
              {p.isPublished && (
                <a href={`/chuong-trinh/${p.slug}`} target="_blank" rel="noopener" title="Xem trên website"
                  className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"><ExternalLink className="w-4 h-4" /></a>
              )}
              {canEdit && (
                <>
                  <button type="button" onClick={() => setDraft({ ...p, courseIds: p.courses.map((c) => c.id) })}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold hover:bg-slate-50 cursor-pointer">Sửa</button>
                  <button type="button" onClick={() => remove(p)} title="Xóa"
                    className="p-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {draft && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl my-6 p-6 space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">{draft.id ? 'Sửa chương trình' : 'Chương trình mới'}</h3>
              <button type="button" onClick={() => setDraft(null)} className="cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="sm:col-span-2">Tên chương trình *
                <input className={input} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              </label>
              <label>Đường dẫn (slug)
                <input className={input} value={draft.slug} placeholder={slugify(draft.title || '')} onChange={(e) => setDraft({ ...draft, slug: slugify(e.target.value) })} />
              </label>
              <ImageUploadField label="Ảnh đại diện" value={draft.thumbnail || ''}
                onChange={(url) => setDraft({ ...draft, thumbnail: url })} previewClassName="w-12 h-8 object-cover" />
              <label className="sm:col-span-2">Mô tả ngắn
                <input className={input} value={draft.subtitle} onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })} />
              </label>
              <label className="sm:col-span-2">Giới thiệu
                <textarea rows={4} className={input} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </label>
              <label className="sm:col-span-2">Điểm nổi bật (mỗi dòng một ý)
                <textarea rows={3} className={input} value={(draft.highlights || []).join('\n')}
                  onChange={(e) => setDraft({ ...draft, highlights: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })} />
              </label>
            </div>

            <div className="space-y-2">
              <div className="font-bold">Khóa học trong chương trình (theo thứ tự học)</div>
              {draft.courseIds.map((id, i) => (
                <div key={id} className="flex items-center gap-2 border border-slate-200 rounded-xl p-2">
                  <span className="w-6 text-center font-bold text-slate-500">{i + 1}</span>
                  <span className="flex-1">{byId.get(id)?.title || id}</span>
                  <span className="text-xs text-slate-500">{formatVND(byId.get(id)?.price || 0)}</span>
                  <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="p-1 disabled:opacity-30 cursor-pointer"><ArrowUp className="w-4 h-4" /></button>
                  <button type="button" disabled={i === draft.courseIds.length - 1} onClick={() => move(i, 1)} className="p-1 disabled:opacity-30 cursor-pointer"><ArrowDown className="w-4 h-4" /></button>
                  <button type="button" onClick={() => setDraft({ ...draft, courseIds: draft.courseIds.filter((c) => c !== id) })} className="p-1 text-red-600 cursor-pointer"><X className="w-4 h-4" /></button>
                </div>
              ))}
              <select className={input} value="" onChange={(e) => e.target.value && setDraft({ ...draft, courseIds: [...draft.courseIds, e.target.value] })}>
                <option value="">+ Thêm khóa học…</option>
                {courses.filter((c) => !draft.courseIds.includes(c.id)).map((c) => (
                  <option key={c.id} value={c.id}>{c.title} – {formatVND(c.price)}</option>
                ))}
              </select>
              <div className="text-xs text-slate-500">Tổng học phí mua lẻ: {formatVND(coursesTotal)}</div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label>Giá chương trình
                <input type="number" min={0} className={input} value={draft.price} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} />
              </label>
              <label>Giá niêm yết
                <input type="number" min={0} className={input} value={draft.originalPrice} onChange={(e) => setDraft({ ...draft, originalPrice: Number(e.target.value) })} />
              </label>
              <label>Trả góp
                <select className={input} value={draft.installmentCount} onChange={(e) => setDraft({ ...draft, installmentCount: Number(e.target.value) })}>
                  {[1, 2, 3, 4, 6].map((n) => <option key={n} value={n}>{n === 1 ? 'Không' : `${n} kỳ`}</option>)}
                </select>
              </label>
              <label>Cách nhau (ngày)
                <input type="number" min={7} max={180} disabled={(draft.installmentCount || 1) <= 1} className={input} value={draft.installmentIntervalDays}
                  onChange={(e) => setDraft({ ...draft, installmentIntervalDays: Number(e.target.value) })} />
              </label>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <label className="flex items-center gap-2 font-bold">
                <input type="checkbox" checked={!!draft.isPublished} onChange={(e) => setDraft({ ...draft, isPublished: e.target.checked })} />
                Mở bán trên website (/chuong-trinh)
              </label>
              <button type="button" disabled={busy || !draft.title || draft.courseIds.length === 0} onClick={save}
                className="px-4 py-2 rounded-xl bg-[#0073C1] text-white font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
                <Save className="w-4 h-4" /> Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
