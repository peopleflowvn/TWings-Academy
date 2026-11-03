/**
 * /app → Hệ thống → Danh mục: the option lists every form offers (sources, provinces, schools, course
 * categories…), kept by the backend (apps/crm/lists.py, /staff/lists/). A renamed value is carried onto the
 * records that have it (renaming to a value already in the list merges the two); a value in use is hidden, not
 * deleted; values the records have outside the list can be replaced by one of the list or added to it. Values the
 * system itself writes or relies on (new website leads' source, LMS completion…) are locked: ordered only.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Eye, EyeOff, ListChecks, Lock, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { api } from '../../lib/api';
import { reloadCrmLists } from '../../lib/crmLists';

interface Item {
  id: string;
  value: string;
  active: boolean;
  used: number;
  locked: boolean; // the system writes / relies on it: ordered only
}
interface Kind {
  key: string;
  label: string;
  group: string;
  hint: string;
  maxLength: number;
  items: Item[];
  unlisted: { value: string; used: number }[];
}
type KindResult = Kind & { records?: number };

const SHOWN = 200; // rows drawn at once in a long list (schools, MSB units): search for the rest
const input = 'px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white';
const iconBtn =
  'p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer';

const plain = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

export const ListsPage: React.FC<{ canEdit: boolean }> = ({ canEdit }) => {
  const [kinds, setKinds] = useState<Kind[] | null>(null);
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState('');
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);
  const [replaceWith, setReplaceWith] = useState<Record<string, string>>({});

  useEffect(() => {
    api
      .get<{ kinds: Kind[] }>('/staff/lists/')
      .then((res) => {
        setKinds(res.kinds);
        setSelected((s) => s || res.kinds[0]?.key || '');
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const kind = kinds?.find((k) => k.key === selected);
  const groups = useMemo(() => {
    const out: { group: string; kinds: Kind[] }[] = [];
    for (const k of kinds || []) {
      const g = out.find((o) => o.group === k.group);
      if (g) g.kinds.push(k);
      else out.push({ group: k.group, kinds: [k] });
    }
    return out;
  }, [kinds]);
  const filtered = useMemo(() => {
    if (!kind) return [];
    const q = plain(query.trim());
    return q ? kind.items.filter((i) => plain(i.value).includes(q)) : kind.items;
  }, [kind, query]);

  const choose = (key: string) => {
    setSelected(key);
    setQuery('');
    setAdding('');
    setEditing(null);
    setError('');
    setNotice('');
  };

  /** Run a change; the answer is the list as it now is. */
  const run = async (call: () => Promise<KindResult>, done?: (r: KindResult) => string) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await call();
      setKinds((all) => (all || []).map((k) => (k.key === result.key ? { ...k, ...result } : k)));
      reloadCrmLists();
      if (done) setNotice(done(result));
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (!kinds) {
    return error ? (
      <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3">{error}</div>
    ) : (
      <p className="text-xs text-slate-500">Đang tải danh mục…</p>
    );
  }

  const add = (value: string) =>
    run(
      () => api.post<KindResult>(`/staff/lists/${selected}/`, { value }),
      () => `Đã thêm “${value.trim()}”.`
    ).then((ok) => ok && setAdding(''));

  const rename = (item: Item, value: string) => {
    const next = value.trim();
    if (!next || next === item.value) return setEditing(null);
    const into = kind?.items.find((i) => i.value === next && i.id !== item.id);
    const message = into
      ? `Gộp “${item.value}” vào “${next}”? ${item.used} hồ sơ đang dùng “${item.value}” sẽ chuyển sang “${next}”, và “${item.value}” bị bỏ khỏi danh mục.`
      : `Đổi “${item.value}” thành “${next}”?` + (item.used ? ` ${item.used} hồ sơ đang dùng giá trị này sẽ được cập nhật theo.` : '');
    if (!window.confirm(message)) return;
    run(
      () => api.patch<KindResult>(`/staff/lists/items/${item.id}/`, { value: next }),
      (r) => (into ? `Đã gộp vào “${next}”` : `Đã đổi thành “${next}”`) + (r.records ? `, cập nhật ${r.records} hồ sơ.` : '.')
    ).then((ok) => ok && setEditing(null));
  };

  const toggle = (item: Item) =>
    run(
      () => api.patch<KindResult>(`/staff/lists/items/${item.id}/`, { active: !item.active }),
      () => (item.active ? `Đã ẩn “${item.value}”: hồ sơ cũ vẫn giữ giá trị này.` : `Đã hiện lại “${item.value}”.`)
    );

  const remove = (item: Item) => {
    if (!window.confirm(`Xóa “${item.value}” khỏi danh mục?`)) return;
    run(() => api.delete<KindResult>(`/staff/lists/items/${item.id}/`), () => `Đã xóa “${item.value}”.`);
  };

  const move = (index: number, step: number) => {
    if (!kind) return;
    const ids = kind.items.map((i) => i.id);
    const [id] = ids.splice(index, 1);
    ids.splice(index + step, 0, id);
    run(() => api.post<KindResult>(`/staff/lists/${selected}/order/`, { ids }));
  };

  const replace = (from: string, used: number) => {
    const to = replaceWith[from];
    if (!to) return;
    if (!window.confirm(`Thay “${from}” bằng “${to}” trong ${used} hồ sơ?`)) return;
    run(
      () => api.post<KindResult>(`/staff/lists/${selected}/replace/`, { from, to }),
      (r) => `Đã thay trong ${r.records ?? 0} hồ sơ.`
    );
  };

  const searching = query.trim() !== '';
  const activeItems = kind?.items.filter((i) => i.active) || [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-black text-slate-900">Danh mục</h1>
        <p className="text-xs text-slate-500 max-w-3xl">
          Các lựa chọn trong ô chọn của /app và CMS. Đổi tên một giá trị sẽ cập nhật luôn các hồ sơ đang dùng nó; đổi thành
          một giá trị đã có là gộp hai giá trị. Giá trị đang được dùng thì chỉ ẩn được (hồ sơ cũ vẫn giữ nguyên). Các danh
          mục gắn với quy trình (giai đoạn CRM, trạng thái đơn, lớp, thanh toán) cố định trong hệ thống nên không có ở đây; giá
          trị có nhãn “hệ thống” do hệ thống tự ghi (nguồn của lead từ website / link UTM, kết quả học trên LMS…) nên chỉ sắp xếp được.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 items-start">
        <nav className="bg-white rounded-2xl border border-slate-200 p-2 space-y-3">
          {groups.map((g) => (
            <div key={g.group}>
              <div className="px-2 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{g.group}</div>
              {g.kinds.map((k) => (
                <button
                  key={k.key}
                  type="button"
                  onClick={() => choose(k.key)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm flex items-center justify-between gap-2 cursor-pointer ${
                    k.key === selected ? 'bg-blue-50 text-[#0073C1] font-bold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate">{k.label}</span>
                  <span className="flex items-center gap-1 shrink-0">
                    {k.unlisted.length > 0 && (
                      <span className="text-[10px] font-bold px-1.5 rounded-full bg-amber-100 text-amber-700" title="Giá trị ngoài danh mục">
                        {k.unlisted.length}
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400">{k.items.filter((i) => i.active).length}</span>
                  </span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        {kind && (
          <section className="space-y-4 min-w-0">
            <div className="bg-white rounded-2xl border border-slate-200">
              <div className="p-4 border-b border-slate-100 space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-black text-slate-900 flex items-center gap-2">
                    <ListChecks className="w-4 h-4 text-[#0073C1]" /> {kind.label}
                  </h2>
                  <span className="text-xs text-slate-500">
                    {activeItems.length} đang dùng{kind.items.length > activeItems.length ? ` · ${kind.items.length - activeItems.length} đã ẩn` : ''}
                  </span>
                </div>
                {kind.hint && <p className="text-xs text-slate-500">{kind.hint}</p>}
                <div className="flex flex-col sm:flex-row gap-2">
                  <label className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm trong danh mục" className={`${input} w-full pl-9`} />
                  </label>
                  {canEdit && (
                    <form
                      className="flex gap-2 flex-1"
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (adding.trim()) add(adding);
                      }}
                    >
                      <input value={adding} onChange={(e) => setAdding(e.target.value)} placeholder="Giá trị mới" maxLength={kind.maxLength} className={`${input} flex-1 min-w-0`} />
                      <button type="submit" disabled={busy || !adding.trim()} className="px-3 py-2 rounded-xl text-xs font-bold bg-[#0073C1] text-white flex items-center gap-1 disabled:opacity-50 cursor-pointer">
                        <Plus className="w-3.5 h-3.5" /> Thêm
                      </button>
                    </form>
                  )}
                </div>
                {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3">{error}</div>}
                {notice && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl p-3">{notice}</div>}
              </div>

              <ul className="divide-y divide-slate-100">
                {filtered.slice(0, SHOWN).map((item) => {
                  const index = kind.items.indexOf(item);
                  const isEditing = editing?.id === item.id;
                  return (
                    <li key={item.id} className={`px-4 py-2 flex items-center gap-2 text-sm ${item.active ? '' : 'bg-slate-50'}`}>
                      {isEditing ? (
                        <form
                          className="flex-1 flex gap-2 min-w-0"
                          onSubmit={(e) => {
                            e.preventDefault();
                            rename(item, editing.value);
                          }}
                        >
                          <input
                            autoFocus
                            value={editing.value}
                            onChange={(e) => setEditing({ id: item.id, value: e.target.value })}
                            onKeyDown={(e) => e.key === 'Escape' && setEditing(null)}
                            maxLength={kind.maxLength}
                            list={`list-${kind.key}`}
                            className={`${input} flex-1 min-w-0 py-1`}
                          />
                          <button type="submit" disabled={busy} className={iconBtn} title="Lưu">
                            <Check className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => setEditing(null)} className={iconBtn} title="Hủy">
                            <X className="w-4 h-4" />
                          </button>
                        </form>
                      ) : (
                        <>
                          <span className={`flex-1 min-w-0 break-words ${item.active ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                            {item.value}
                            {item.locked && (
                              <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] font-bold text-slate-500 bg-slate-100 rounded-full px-1.5 py-0.5 align-middle" title="Hệ thống tự ghi / dựa vào giá trị này: chỉ sắp xếp được">
                                <Lock className="w-3 h-3" /> hệ thống
                              </span>
                            )}
                          </span>
                          <span className="text-[11px] text-slate-400 shrink-0" title="Số hồ sơ đang dùng">
                            {item.used ? `${item.used} hồ sơ` : 'chưa dùng'}
                          </span>
                        </>
                      )}
                      {canEdit && !isEditing && (
                        <span className="flex items-center shrink-0">
                          <button type="button" disabled={busy || searching || index === 0} onClick={() => move(index, -1)} className={iconBtn} title="Lên">
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button type="button" disabled={busy || searching || index === kind.items.length - 1} onClick={() => move(index, 1)} className={iconBtn} title="Xuống">
                            <ArrowDown className="w-4 h-4" />
                          </button>
                          <button type="button" disabled={busy || item.locked} onClick={() => setEditing({ id: item.id, value: item.value })} className={iconBtn} title={item.locked ? 'Giá trị hệ thống: không đổi tên được' : 'Đổi tên / gộp'}>
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button type="button" disabled={busy || (item.locked && item.active)} onClick={() => toggle(item)} className={iconBtn} title={item.locked ? 'Giá trị hệ thống: không ẩn được' : item.active ? 'Ẩn khỏi ô chọn' : 'Hiện lại'}>
                            {item.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            type="button"
                            disabled={busy || item.used > 0 || item.locked}
                            onClick={() => remove(item)}
                            className={iconBtn}
                            title={item.locked ? 'Giá trị hệ thống: không xóa được' : item.used ? 'Đang được dùng: chỉ ẩn được' : 'Xóa'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </span>
                      )}
                    </li>
                  );
                })}
                {filtered.length === 0 && <li className="px-4 py-6 text-center text-xs text-slate-500">Không có giá trị nào.</li>}
                {filtered.length > SHOWN && (
                  <li className="px-4 py-3 text-center text-xs text-slate-500">
                    Đang hiện {SHOWN}/{filtered.length} giá trị — gõ vào ô tìm để thấy giá trị khác.
                  </li>
                )}
              </ul>
              <datalist id={`list-${kind.key}`}>
                {activeItems.map((i) => (
                  <option key={i.id} value={i.value} />
                ))}
              </datalist>
            </div>

            {kind.unlisted.length > 0 && (
              <div className="bg-white rounded-2xl border border-amber-200">
                <div className="p-4 border-b border-amber-100">
                  <h3 className="font-bold text-sm text-slate-900">Giá trị trong hồ sơ nhưng không có trong danh mục ({kind.unlisted.length})</h3>
                  <p className="text-xs text-slate-500">
                    Được gõ tay, nhập từ dữ liệu cũ, hoặc còn lại sau khi đổi tên. Có thể thay bằng một giá trị của danh mục, hoặc thêm vào danh mục.
                  </p>
                </div>
                <ul className="divide-y divide-slate-100">
                  {kind.unlisted.slice(0, SHOWN).map((u) => (
                    <li key={u.value} className="px-4 py-2 flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
                      <span className="flex-1 min-w-0 break-words text-slate-800">
                        {u.value} <span className="text-[11px] text-slate-400">· {u.used} hồ sơ</span>
                      </span>
                      {canEdit && (
                        <span className="flex flex-wrap items-center gap-2">
                          <select
                            value={replaceWith[u.value] || ''}
                            onChange={(e) => setReplaceWith({ ...replaceWith, [u.value]: e.target.value })}
                            className={`${input} py-1 max-w-[220px]`}
                          >
                            <option value="">Thay bằng…</option>
                            {activeItems.map((i) => (
                              <option key={i.id} value={i.value}>
                                {i.value}
                              </option>
                            ))}
                          </select>
                          <button type="button" disabled={busy || !replaceWith[u.value]} onClick={() => replace(u.value, u.used)} className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer">
                            Thay
                          </button>
                          <button type="button" disabled={busy} onClick={() => add(u.value)} className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-slate-200 text-[#0073C1] hover:bg-blue-50 disabled:opacity-50 cursor-pointer">
                            Thêm vào danh mục
                          </button>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};
