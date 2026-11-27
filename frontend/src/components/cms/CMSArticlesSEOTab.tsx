import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, ArrowLeft, CheckCircle2, Copy, Edit, ExternalLink, Eye, EyeOff, FileText, Globe, History, Loader2,
  Plus, RotateCcw, Save, Search, Send, Sparkles, Star, Trash2, X, XCircle
} from 'lucide-react';
import { api, Paginated } from '../../lib/api';
import { useCrmLists, withCurrent } from '../../lib/crmLists';
import { StaffUserContext, useStaffCan } from '../../lib/lms';
import { ArticleBody } from '../ArticleBody';
import { ImageUploadField } from './ImageUploadField';
import { RichTextEditor } from './RichTextEditor';

type Status = 'draft' | 'published' | 'scheduled';

interface Row {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  featuredImage: string;
  category: string;
  author: string;
  status: Status;
  publishedAt: string | null;
  updatedAt: string;
  tags: string[];
  viewsCount: number;
  seoScore: number;
  focusKeyword: string;
  isFeatured: boolean;
  isPublic: boolean;
}

interface Form {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  author: string;
  featuredImage: string;
  featuredImageAlt: string;
  status: Status;
  publishedAt: string; // datetime-local value ('' = none)
  tags: string[];
  isFeatured: boolean;
  metaTitle: string;
  metaDescription: string;
  focusKeyword: string;
  canonicalUrl: string;
}

interface Revision { id: number; title: string; excerpt: string; content: string; status: string; savedBy: string; createdAt: string }

const STATUS_LABEL: Record<Status, string> = { draft: 'Bản nháp', published: 'Đã đăng', scheduled: 'Hẹn giờ' };
const SITE = 'https://twings.edu.vn';

/** "Đào tạo Ngân hàng" -> "dao-tao-ngan-hang" (same rule as the server). */
export const slugify = (s: string) =>
  s.replace(/đ/g, 'd').replace(/Đ/g, 'D').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 200);

const toLocalInput = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
const plain = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const fromServer = (d: Record<string, any>): Form => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
  id: d.id,
  title: d.title || '',
  slug: d.slug || '',
  excerpt: d.excerpt || '',
  content: d.content || '',
  category: d.category || '',
  author: d.author || '',
  featuredImage: d.featuredImage || '',
  featuredImageAlt: d.featuredImageAlt || '',
  status: d.status || 'draft',
  publishedAt: toLocalInput(d.publishedAt),
  tags: d.tags || [],
  isFeatured: Boolean(d.isFeatured),
  metaTitle: d.metaTitle || '',
  metaDescription: d.metaDescription || '',
  focusKeyword: d.focusKeyword || '',
  canonicalUrl: d.canonicalUrl || ''
});

function seoOf(f: Form) {
  const kw = f.focusKeyword.trim().toLowerCase();
  const title = f.metaTitle || f.title;
  const desc = f.metaDescription || f.excerpt;
  const text = plain(f.content).toLowerCase();
  const wordCount = text ? text.split(' ').length : 0;
  const occurrences = kw ? (text.match(new RegExp(escapeRe(kw), 'g')) || []).length : 0;
  const density = wordCount ? Number(((occurrences / wordCount) * 100).toFixed(1)) : 0;
  const checks = {
    titleLength: title.length >= 40 && title.length <= 65,
    metaDescLength: desc.length >= 120 && desc.length <= 165,
    keywordInTitle: Boolean(kw) && title.toLowerCase().includes(kw),
    keywordInMeta: Boolean(kw) && desc.toLowerCase().includes(kw),
    keywordInContent: Boolean(kw) && occurrences > 0,
    wordCountPassed: wordCount >= 300,
    contentWordCount: wordCount,
    keywordDensity: density,
    densityPassed: density >= 0.8 && density <= 3,
    hasHeadings: /<h[234][\s>]/i.test(f.content) || /^#{2,4} /m.test(f.content),
    hasFeaturedImage: Boolean(f.featuredImage.trim()),
    imagesHaveAlt: !/<img(?![^>]*\balt="[^"]+")[^>]*>/i.test(f.content)
  };
  const weights: [boolean, number][] = [
    [checks.titleLength, 15], [checks.metaDescLength, 15], [checks.keywordInTitle, 15], [checks.keywordInMeta, 10],
    [checks.keywordInContent, 10], [checks.wordCountPassed, 10], [checks.densityPassed, 5], [checks.hasHeadings, 10],
    [checks.hasFeaturedImage, 5], [checks.imagesHaveAlt, 5]
  ];
  return { score: weights.reduce((s, [ok, w]) => s + (ok ? w : 0), 0), checks };
}

const toServer = (f: Form, status: Status) => {
  const seo = seoOf(f);
  return {
    title: f.title.trim(),
    slug: f.slug.trim(),
    excerpt: f.excerpt,
    content: f.content,
    category: f.category,
    author: f.author,
    featuredImage: f.featuredImage.trim(),
    featuredImageAlt: f.featuredImageAlt.trim(),
    status,
    publishedAt: status === 'scheduled' && f.publishedAt ? new Date(f.publishedAt).toISOString() : status === 'draft' ? null : undefined,
    tags: f.tags,
    isFeatured: f.isFeatured,
    metaTitle: f.metaTitle,
    metaDescription: f.metaDescription,
    focusKeyword: f.focusKeyword,
    canonicalUrl: f.canonicalUrl.trim(),
    seoScore: seo.score,
    seoChecks: seo.checks
  };
};

const statusBadge = (r: { status: Status; isPublic?: boolean; publishedAt?: string | null }) => {
  const cls =
    r.status === 'published' ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : r.status === 'scheduled' ? 'bg-violet-100 text-violet-800 border-violet-200'
        : 'bg-slate-100 text-slate-700 border-slate-200';
  return (
    <span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold whitespace-nowrap ${cls}`}>
      {r.status === 'scheduled' ? (r.isPublic ? 'Đã đăng (hẹn giờ)' : `Hẹn ${fmt(r.publishedAt)}`) : STATUS_LABEL[r.status]}
    </span>
  );
};

/** /app/content/articles: the list and the editor. */
export const CMSArticlesSEOTab: React.FC = () => {
  const [editing, setEditing] = useState<Form | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const canPublish = useStaffCan('articles.publish');
  const canEdit = useStaffCan('articles.create_edit');
  const me = useContext(StaffUserContext);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const all: Row[] = [];
      let page = 1;
      for (;;) {
        const res = await api.get<Paginated<Row>>(`/staff/articles/?pageSize=200&ordering=-updated_at&page=${page}`);
        all.push(...res.results);
        if (!res.next) break;
        page += 1;
      }
      setRows(all);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được danh sách bài viết.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openArticle = async (id: string) => {
    try {
      setEditing(fromServer(await api.get(`/staff/articles/${id}/`)));
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Không mở được bài viết.');
    }
  };

  const newArticle = () =>
    setEditing({
      title: '', slug: '', excerpt: '', content: '', category: '', author: me?.name || 'Ban Biên Tập TWINGS', featuredImage: '',
      featuredImageAlt: '', status: 'draft', publishedAt: '', tags: [], isFeatured: false, metaTitle: '', metaDescription: '',
      focusKeyword: '', canonicalUrl: ''
    });

  if (editing) {
    return (
      <ArticleEditor
        initial={editing}
        canPublish={canPublish}
        canEdit={canEdit}
        onClose={() => {
          setEditing(null);
          load();
        }}
      />
    );
  }
  return <ArticleList rows={rows} loading={loading} error={error} canPublish={canPublish} canEdit={canEdit} reload={load} onOpen={openArticle} onNew={newArticle} />;
};

// ---------------------------------------------------------------- list
const ArticleList: React.FC<{
  rows: Row[]; loading: boolean; error: string; canPublish: boolean; canEdit: boolean;
  reload: () => void; onOpen: (id: string) => void; onNew: () => void;
}> = ({ rows, loading, error, canPublish, canEdit, reload, onOpen, onNew }) => {
  const [tab, setTab] = useState<'all' | Status>('all');
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [notice, setNotice] = useState('');

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length, published: 0, scheduled: 0, draft: 0 };
    rows.forEach((r) => (c[r.status] += 1));
    return c;
  }, [rows]);
  const categories = useMemo(() => Array.from(new Set(rows.map((r) => r.category).filter(Boolean))).sort(), [rows]);
  const shown = rows.filter((r) => {
    if (tab !== 'all' && r.status !== tab) return false;
    if (category && r.category !== category) return false;
    const text = `${r.title} ${r.slug} ${r.author} ${r.tags.join(' ')}`.toLowerCase();
    return !q.trim() || text.includes(q.trim().toLowerCase());
  });

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setNotice('');
    try {
      await fn();
      setNotice(done);
      reload();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Không thực hiện được.');
    }
  };
  const togglePublic = (r: Row) => {
    const live = r.status !== 'draft';
    if (!window.confirm(live ? `Gỡ "${r.title}" khỏi website (chuyển về bản nháp)?` : `Đăng "${r.title}" lên website ngay?`)) return;
    run(() => api.patch(`/staff/articles/${r.id}/`, { status: live ? 'draft' : 'published' }), live ? 'Đã gỡ bài khỏi website.' : 'Đã đăng bài.');
  };
  const duplicate = (r: Row) =>
    run(async () => {
      const full = await api.get<Record<string, unknown>>(`/staff/articles/${r.id}/`);
      const copy = toServer({ ...fromServer(full), title: `${r.title} (bản sao)`, slug: '', isFeatured: false }, 'draft');
      await api.post('/staff/articles/', copy);
    }, 'Đã tạo bản sao (bản nháp).');
  const remove = (r: Row) => {
    if (!window.confirm(`Xóa hẳn bài "${r.title}"? Không hoàn tác được.${r.isPublic ? '\nBài đang hiển thị trên website.' : ''}`)) return;
    run(() => api.delete(`/staff/articles/${r.id}/`), 'Đã xóa bài viết.');
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><FileText className="w-5 h-5 text-[#0073C1]" /> Bài viết & tin tức</h2>
          <p className="text-xs text-slate-500 mt-1">
            Soạn thảo kiểu Word, ảnh lưu trên kho ảnh TWings (R2), bản nháp, hẹn giờ đăng, gỡ bài, lịch sử phiên bản và chấm điểm SEO.
          </p>
        </div>
        {canEdit && (
          <button onClick={onNew} className="px-4 py-2 bg-[#0073C1] hover:bg-[#005FA0] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
            <Plus className="w-4 h-4" /> Viết bài mới
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-3 border-b border-slate-100 flex flex-wrap items-center gap-2">
          {(['all', 'published', 'scheduled', 'draft'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${tab === t ? 'bg-[#0073C1] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
              {t === 'all' ? 'Tất cả' : STATUS_LABEL[t]} ({counts[t]})
            </button>
          ))}
          <div className="relative ml-auto w-full sm:w-64">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm tiêu đề, đường dẫn, tác giả, thẻ…"
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white" />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="text-xs border border-slate-300 rounded-xl px-2 py-1.5 bg-white">
            <option value="">Mọi chuyên mục</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {notice && <p className="px-4 py-2 text-xs font-bold text-[#0073C1] bg-blue-50 border-b border-blue-100">{notice}</p>}
        {error && <p className="px-4 py-2 text-xs font-bold text-red-600">{error}</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3">Bài viết</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3">Chuyên mục</th>
                <th className="p-3">SEO</th>
                <th className="p-3">Lượt đọc</th>
                <th className="p-3">Cập nhật</th>
                <th className="p-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr><td colSpan={7} className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400 inline" /></td></tr>
              )}
              {!loading && shown.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-slate-500">Chưa có bài viết nào{tab !== 'all' || q || category ? ' khớp bộ lọc' : ''}.</td></tr>
              )}
              {shown.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80">
                  <td className="p-3">
                    <button type="button" onClick={() => onOpen(r.id)} className="flex items-center gap-3 text-left cursor-pointer">
                      {r.featuredImage ? (
                        <img src={r.featuredImage} alt="" className="w-14 h-10 rounded-lg object-cover border border-slate-200 shrink-0" />
                      ) : (
                        <div className="w-14 h-10 rounded-lg bg-slate-100 border border-slate-200 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 max-w-md truncate flex items-center gap-1">
                          {r.isFeatured && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />}
                          {r.title || '(chưa có tiêu đề)'}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-md">/tin-tuc/{r.slug} · {r.author}</div>
                      </div>
                    </button>
                  </td>
                  <td className="p-3">{statusBadge(r)}</td>
                  <td className="p-3">{r.category && <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#0073C1] font-bold text-[11px]">{r.category}</span>}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold font-mono border ${r.seoScore >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : r.seoScore >= 60 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                      {r.seoScore}/100
                    </span>
                  </td>
                  <td className="p-3 font-mono">{r.viewsCount.toLocaleString('vi-VN')}</td>
                  <td className="p-3 text-slate-500 whitespace-nowrap">{fmt(r.updatedAt)}</td>
                  <td className="p-3 text-right whitespace-nowrap">
                    {r.isPublic && (
                      <a href={`/tin-tuc/${r.slug}`} target="_blank" rel="noreferrer" title="Xem trên website" className="p-1.5 inline-block hover:bg-slate-100 rounded-lg text-slate-600">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    {canPublish && (
                      <button onClick={() => togglePublic(r)} title={r.status === 'draft' ? 'Đăng ngay' : 'Gỡ khỏi website'} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 cursor-pointer">
                        {r.status === 'draft' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    )}
                    {canEdit && (
                      <>
                        <button onClick={() => run(() => api.patch(`/staff/articles/${r.id}/`, { isFeatured: !r.isFeatured }), r.isFeatured ? 'Đã bỏ nổi bật.' : 'Đã đặt nổi bật.')}
                          title={r.isFeatured ? 'Bỏ nổi bật' : 'Đặt nổi bật (lên đầu trang tin tức)'} className="p-1.5 hover:bg-amber-50 rounded-lg text-amber-600 cursor-pointer">
                          <Star className={`w-4 h-4 ${r.isFeatured ? 'fill-amber-400' : ''}`} />
                        </button>
                        <button onClick={() => onOpen(r.id)} title="Sửa" className="p-1.5 hover:bg-blue-50 rounded-lg text-[#0073C1] cursor-pointer"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => duplicate(r)} title="Nhân bản (tạo bản nháp)" className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 cursor-pointer"><Copy className="w-4 h-4" /></button>
                        <button onClick={() => remove(r)} title="Xóa" className="p-1.5 hover:bg-red-50 rounded-lg text-red-600 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- editor
const ArticleEditor: React.FC<{ initial: Form; canPublish: boolean; canEdit: boolean; onClose: () => void }> = ({ initial, canPublish, canEdit, onClose }) => {
  const lists = useCrmLists();
  const [form, setForm] = useState<Form>(initial);
  const [saved, setSaved] = useState<Form>(initial);
  // What the server shows the public (the status chosen in the form applies on save).
  const [serverStatus, setServerStatus] = useState<Status>(initial.status);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState('');
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id));
  const [preview, setPreview] = useState(false);
  const [revisions, setRevisions] = useState<Revision[] | null>(null);
  const [tagText, setTagText] = useState('');
  const [backup, setBackup] = useState<{ form: Form; at: number } | null>(null);
  const backupKey = `twings:article-backup:${form.id || 'new'}`;

  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const seo = useMemo(() => seoOf(form), [form]);
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  // An unsaved version left on this computer (closed tab, lost connection): offer it back.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(backupKey);
      if (!raw) return;
      const b = JSON.parse(raw) as { form: Form; at: number };
      if (JSON.stringify(b.form) !== JSON.stringify(initial)) setBackup(b);
      else localStorage.removeItem(backupKey);
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep a copy on this computer while there are unsaved changes; warn before leaving the page.
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => localStorage.setItem(backupKey, JSON.stringify({ form, at: Date.now() })), 800);
    const leave = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', leave);
    return () => {
      clearTimeout(t);
      window.removeEventListener('beforeunload', leave);
    };
  }, [form, dirty, backupKey]);

  const save = useCallback(
    async (status: Status, quiet = false) => {
      if (!form.title.trim()) {
        if (!quiet) setError('Nhập tiêu đề bài viết.');
        return false;
      }
      if (status === 'scheduled' && !form.publishedAt) {
        setError('Chọn thời điểm đăng bài.');
        return false;
      }
      setSaving(true);
      setError('');
      try {
        const payload = toServer(form, status);
        // Published now (also a scheduled article published early): dated now.
        if (status === 'published' && serverStatus !== 'published') payload.publishedAt = new Date().toISOString();
        const res = form.id
          ? await api.patch<Record<string, unknown>>(`/staff/articles/${form.id}/`, payload)
          : await api.post<Record<string, unknown>>('/staff/articles/', payload);
        const fresh = fromServer(res);
        localStorage.removeItem(backupKey);
        // Keep what was typed meanwhile (autosave); take the server's id, slug, status and date.
        setForm((f) => ({ ...f, id: fresh.id, slug: fresh.slug, status: fresh.status, publishedAt: fresh.publishedAt }));
        setSaved({ ...form, id: fresh.id, slug: fresh.slug, status: fresh.status, publishedAt: fresh.publishedAt });
        setServerStatus(fresh.status);
        setSlugTouched(true);
        setSavedAt(new Date());
        if (revisions) setRevisions(null);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Không lưu được bài viết.');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [form, backupKey, revisions, serverStatus]
  );

  // A draft saves itself 20 s after the last change (a published article only when asked).
  const autosave = useRef(save);
  autosave.current = save;
  useEffect(() => {
    if (!dirty || serverStatus !== 'draft' || form.status !== 'draft' || !form.title.trim() || !canEdit) return;
    const t = setTimeout(() => autosave.current('draft', true), 20000);
    return () => clearTimeout(t);
  }, [form, dirty, serverStatus, canEdit]);

  const close = () => {
    if (dirty && !window.confirm('Có thay đổi chưa lưu. Thoát mà không lưu?')) return;
    if (dirty) localStorage.removeItem(backupKey);
    onClose();
  };

  const primary = async () => {
    const status = form.status;
    if (status === 'published' && serverStatus !== 'published' && !window.confirm('Đăng bài lên website ngay?')) return;
    await save(status);
  };
  const unpublish = async () => {
    if (!window.confirm('Gỡ bài khỏi website (chuyển về bản nháp)? Người đọc sẽ không xem được nữa.')) return;
    set('status', 'draft');
    await save('draft');
  };

  const loadRevisions = async () => {
    if (!form.id) return;
    try {
      setRevisions(await api.get<Revision[]>(`/staff/articles/${form.id}/revisions/`));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được lịch sử.');
    }
  };
  const restore = (r: Revision) => {
    if (!window.confirm(`Khôi phục tiêu đề, tóm tắt và nội dung về phiên bản lúc ${fmt(r.createdAt)}? (Chưa lưu cho đến khi bấm Lưu.)`)) return;
    setForm((f) => ({ ...f, title: r.title, excerpt: r.excerpt, content: r.content }));
  };

  const addTags = (text: string) => {
    const add = text.split(',').map((t) => t.trim()).filter(Boolean);
    if (add.length) set('tags', Array.from(new Set([...form.tags, ...add])).slice(0, 20));
    setTagText('');
  };

  const primaryLabel =
    form.status === 'draft' ? 'Lưu nháp' : form.status === 'scheduled' ? 'Lưu & hẹn giờ' : serverStatus === 'published' ? 'Cập nhật bài' : 'Đăng bài';
  const statusLocked = !canPublish;
  const publicUrl = `${SITE}/tin-tuc/${form.slug || slugify(form.title) || 'bai-viet'}`;
  const ok = (pass: boolean, label: string, detail?: string) => (
    <div className="flex items-start justify-between gap-2">
      <span className="text-slate-600">{label}</span>
      <span className={`font-bold flex items-center gap-1 shrink-0 ${pass ? 'text-emerald-600' : 'text-amber-600'}`}>
        {pass ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
        {detail}
      </span>
    </div>
  );
  const card = 'bg-white p-4 rounded-2xl border border-slate-200 space-y-3 text-xs';
  const input = 'w-full p-2.5 border border-slate-300 rounded-xl';

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-30 bg-slate-900 text-white p-3 rounded-2xl flex flex-wrap items-center gap-2">
        <button type="button" onClick={close} className="p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer" title="Về danh sách"><ArrowLeft className="w-4 h-4" /></button>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-sm truncate">{form.id ? form.title || 'Bài viết' : 'Bài viết mới'}</div>
          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            {statusBadge({ status: serverStatus, publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : null })}
            {saving ? 'Đang lưu…' : dirty ? <span className="text-amber-300 font-bold">Có thay đổi chưa lưu</span> : savedAt ? `Đã lưu lúc ${savedAt.toLocaleTimeString('vi-VN')}` : 'Đã lưu'}
            {serverStatus === 'draft' && <span className="hidden sm:inline">· bản nháp tự lưu sau 20 giây</span>}
          </div>
        </div>
        <button type="button" onClick={() => setPreview(true)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer">
          <Eye className="w-3.5 h-3.5" /> Xem trước
        </button>
        {canPublish && serverStatus !== 'draft' && (
          <button type="button" onClick={unpublish} disabled={saving} className="px-3 py-1.5 bg-slate-800 hover:bg-red-700 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
            <EyeOff className="w-3.5 h-3.5" /> Gỡ bài
          </button>
        )}
        {canEdit && (
          <button type="button" onClick={primary} disabled={saving}
            className={`px-4 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${form.status === 'draft' ? 'bg-slate-600 hover:bg-slate-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : form.status === 'draft' ? <Save className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
            {primaryLabel}
          </button>
        )}
      </div>

      {error && <p className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl p-3">{error}</p>}
      {backup && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex flex-wrap items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>Có bản đang soạn chưa lưu trên máy này lúc {new Date(backup.at).toLocaleString('vi-VN')}.</span>
          <button type="button" onClick={() => { setForm(backup.form); setBackup(null); }} className="px-2 py-1 rounded-lg bg-amber-600 text-white font-bold cursor-pointer">Khôi phục</button>
          <button type="button" onClick={() => { localStorage.removeItem(backupKey); setBackup(null); }} className="px-2 py-1 rounded-lg border border-amber-300 font-bold cursor-pointer">Bỏ</button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-8 space-y-4">
          <div className={card}>
            <input
              value={form.title}
              onChange={(e) => {
                const title = e.target.value;
                setForm((f) => ({ ...f, title, slug: slugTouched ? f.slug : slugify(title) }));
              }}
              placeholder="Tiêu đề bài viết"
              className="w-full text-2xl font-black text-slate-900 border-0 border-b border-slate-200 focus:border-[#0073C1] focus:outline-none pb-2"
            />
            <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-500">
              <Globe className="w-3.5 h-3.5" /> {SITE}/tin-tuc/
              <input
                value={form.slug}
                onChange={(e) => { setSlugTouched(true); set('slug', e.target.value); }}
                onBlur={() => set('slug', slugify(form.slug))}
                placeholder="tu-dong-theo-tieu-de"
                className="font-mono border border-slate-200 rounded-md px-1.5 py-0.5 min-w-[220px] flex-1"
              />
              {serverStatus !== 'draft' && form.slug !== saved.slug && (
                <span className="text-amber-700 font-bold">Đổi đường dẫn bài đã đăng làm hỏng các liên kết cũ.</span>
              )}
            </div>
          </div>

          <RichTextEditor value={form.content} onChange={(html) => set('content', html)} />

          <div className={card}>
            <label className="font-bold text-slate-800 block">Tóm tắt (hiện ở danh sách tin, đầu bài và khi chia sẻ)</label>
            <textarea rows={3} value={form.excerpt} onChange={(e) => set('excerpt', e.target.value)} maxLength={500}
              placeholder="1–2 câu nêu nội dung chính của bài…" className={input} />
            <div className="text-right text-[11px] text-slate-400">{form.excerpt.length}/500</div>
          </div>
        </div>

        <div className="xl:col-span-4 space-y-4">
          <div className={card}>
            <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Xuất bản</div>
            {(['draft', 'published', 'scheduled'] as const).map((s) => (
              <label key={s} className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer ${form.status === s ? 'border-[#0073C1] bg-blue-50' : 'border-slate-200'} ${statusLocked && s !== form.status ? 'opacity-40 cursor-not-allowed' : ''}`}>
                <input type="radio" checked={form.status === s} disabled={statusLocked} onChange={() => set('status', s)} />
                <span className="font-bold">{s === 'draft' ? 'Bản nháp (không hiển thị)' : s === 'published' ? 'Đăng công khai' : 'Hẹn giờ đăng'}</span>
              </label>
            ))}
            {form.status === 'scheduled' && (
              <input type="datetime-local" value={form.publishedAt} disabled={statusLocked} onChange={(e) => set('publishedAt', e.target.value)} className={input} />
            )}
            {statusLocked && <p className="text-[11px] text-slate-500">Bạn chỉ lưu được bản nháp: người có quyền "Xuất bản bài viết" sẽ đăng bài.</p>}
            <label className="flex items-center gap-2 font-bold cursor-pointer">
              <input type="checkbox" checked={form.isFeatured} onChange={(e) => set('isFeatured', e.target.checked)} />
              <Star className="w-3.5 h-3.5 text-amber-500" /> Bài nổi bật (lên đầu trang Tin tức)
            </label>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Tác giả</label>
              <input value={form.author} onChange={(e) => set('author', e.target.value)} className={input} />
            </div>
          </div>

          <div className={card}>
            <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Ảnh đại diện</div>
            <ImageUploadField
              label="Tải ảnh lên (lưu trên kho ảnh R2 của TWings) hoặc dán liên kết"
              value={form.featuredImage}
              onChange={(url) => set('featuredImage', url)}
              previewClassName="w-full h-40 object-cover rounded-xl"
              layout="stacked"
              hint="Nên dùng ảnh ngang 1200×630 (đẹp khi chia sẻ Facebook / Zalo)."
            />
            <ForeignImageNote url={form.featuredImage} onCopied={(url) => set('featuredImage', url)} />
            <input value={form.featuredImageAlt} onChange={(e) => set('featuredImageAlt', e.target.value)} maxLength={250}
              placeholder="Mô tả ảnh (alt) – tốt cho SEO" className={input} />
          </div>

          <div className={card}>
            <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Chuyên mục & thẻ</div>
            <select value={form.category} onChange={(e) => set('category', e.target.value)} className={`${input} bg-white font-bold`}>
              <option value="">– Chọn chuyên mục –</option>
              {withCurrent(lists.courseCategories, form.category).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="flex flex-wrap gap-1">
              {form.tags.map((t) => (
                <span key={t} className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center gap-1">
                  #{t}
                  <button type="button" onClick={() => set('tags', form.tags.filter((x) => x !== t))} className="cursor-pointer" aria-label={`Bỏ thẻ ${t}`}><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
            <input value={tagText} onChange={(e) => setTagText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTags(tagText); } }}
              onBlur={() => addTags(tagText)} placeholder="Thêm thẻ, Enter để thêm" className={input} />
          </div>

          <div className={card}>
            <div className="flex items-center justify-between">
              <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-amber-500" /> SEO</div>
              <span className={`text-xl font-black font-mono ${seo.score >= 80 ? 'text-emerald-600' : seo.score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{seo.score}/100</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div className={`h-full ${seo.score >= 80 ? 'bg-emerald-500' : seo.score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${seo.score}%` }} />
            </div>
            <input value={form.focusKeyword} onChange={(e) => set('focusKeyword', e.target.value)} placeholder="Từ khóa chính, VD: QHKH doanh nghiệp"
              className={`${input} border-blue-300 bg-blue-50/40 font-bold`} />
            <div>
              <label className="font-bold text-slate-700 block mb-1">Tiêu đề SEO <span className="font-normal text-slate-400">({(form.metaTitle || form.title).length}/65)</span></label>
              <input value={form.metaTitle} onChange={(e) => set('metaTitle', e.target.value)} placeholder={form.title || 'Mặc định: tiêu đề bài'} maxLength={200} className={input} />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Mô tả SEO <span className="font-normal text-slate-400">({(form.metaDescription || form.excerpt).length}/165)</span></label>
              <textarea rows={3} value={form.metaDescription} onChange={(e) => set('metaDescription', e.target.value)} placeholder={form.excerpt || 'Mặc định: tóm tắt'} maxLength={320} className={input} />
            </div>
            <div className="space-y-1.5 pt-2 border-t border-slate-100 text-[11px]">
              {ok(seo.checks.titleLength, 'Tiêu đề 40–65 ký tự', String((form.metaTitle || form.title).length))}
              {ok(seo.checks.metaDescLength, 'Mô tả 120–165 ký tự', String((form.metaDescription || form.excerpt).length))}
              {ok(seo.checks.keywordInTitle, 'Từ khóa trong tiêu đề', seo.checks.keywordInTitle ? 'Có' : 'Thiếu')}
              {ok(seo.checks.keywordInMeta, 'Từ khóa trong mô tả', seo.checks.keywordInMeta ? 'Có' : 'Thiếu')}
              {ok(seo.checks.keywordInContent, 'Từ khóa trong nội dung', seo.checks.keywordInContent ? 'Có' : 'Thiếu')}
              {ok(seo.checks.densityPassed, 'Mật độ từ khóa 0,8–3%', `${seo.checks.keywordDensity}%`)}
              {ok(seo.checks.wordCountPassed, 'Từ 300 từ trở lên', `${seo.checks.contentWordCount} từ`)}
              {ok(seo.checks.hasHeadings, 'Có tiêu đề con (H2/H3)', seo.checks.hasHeadings ? 'Có' : 'Chưa có')}
              {ok(seo.checks.hasFeaturedImage, 'Có ảnh đại diện', seo.checks.hasFeaturedImage ? 'Có' : 'Chưa có')}
              {ok(seo.checks.imagesHaveAlt, 'Ảnh trong bài có mô tả (alt)', seo.checks.imagesHaveAlt ? 'Đủ' : 'Thiếu')}
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-0.5">
              <div className="text-[11px] text-slate-600 truncate">{publicUrl.replace('https://', '').replace(/\//g, ' › ')}</div>
              <div className="text-sm font-semibold text-[#1a0dab] truncate">{form.metaTitle || form.title || 'Tiêu đề trên Google'}</div>
              <div className="text-xs text-slate-600 line-clamp-2">{form.metaDescription || form.excerpt || 'Mô tả hiển thị trên kết quả tìm kiếm…'}</div>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">URL chuẩn (canonical) – để trống nếu bài gốc ở đây</label>
              <input value={form.canonicalUrl} onChange={(e) => set('canonicalUrl', e.target.value)} placeholder="https://…" className={`${input} font-mono`} />
            </div>
          </div>

          {form.id && (
            <div className={card}>
              <div className="flex items-center justify-between">
                <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> Lịch sử phiên bản</div>
                <button type="button" onClick={loadRevisions} className="text-[#0073C1] font-bold cursor-pointer">{revisions ? 'Tải lại' : 'Xem'}</button>
              </div>
              {revisions && revisions.length === 0 && <p className="text-slate-500">Chưa có phiên bản cũ.</p>}
              {revisions?.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2 border-b border-slate-100 last:border-0 py-1.5">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800 truncate">{r.title}</div>
                    <div className="text-[11px] text-slate-500">{fmt(r.createdAt)} · {r.savedBy || '–'} · {plain(r.content).split(' ').filter(Boolean).length} từ</div>
                  </div>
                  <button type="button" onClick={() => restore(r)} className="px-2 py-1 rounded-lg border border-slate-200 font-bold flex items-center gap-1 cursor-pointer hover:bg-slate-50 shrink-0">
                    <RotateCcw className="w-3 h-3" /> Khôi phục
                  </button>
                </div>
              ))}
              <p className="text-[11px] text-slate-400">Mỗi lần sửa (theo phiên làm việc) giữ lại bản trước đó; tối đa 30 bản.</p>
            </div>
          )}
        </div>
      </div>

      {preview && (
        <div className="fixed inset-0 z-[95] bg-slate-900/60 flex items-start justify-center p-0 sm:p-6 overflow-y-auto" onClick={() => setPreview(false)}>
          <div className="bg-slate-50 w-full max-w-4xl sm:rounded-3xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between sm:rounded-t-3xl">
              <span className="text-xs font-bold text-slate-600 flex items-center gap-2"><Eye className="w-4 h-4" /> Xem trước – hiển thị như trên website</span>
              <button type="button" onClick={() => setPreview(false)} className="p-1 cursor-pointer" aria-label="Đóng"><X className="w-5 h-5" /></button>
            </div>
            <article className="p-5 sm:p-10 space-y-6">
              {form.category && <span className="px-2.5 py-1 rounded-full bg-blue-50 text-[#0073C1] font-bold text-xs">{form.category}</span>}
              <h1 className="text-2xl sm:text-4xl font-black text-slate-900 leading-tight">{form.title || '(Chưa có tiêu đề)'}</h1>
              <div className="text-xs text-slate-500">{form.author}</div>
              {form.featuredImage && <img src={form.featuredImage} alt={form.featuredImageAlt || form.title} className="w-full max-h-[460px] object-cover rounded-3xl" />}
              {form.excerpt && <div className="p-5 bg-blue-50/80 rounded-2xl border-l-4 border-[#0073C1] text-sm italic text-slate-800">"{form.excerpt}"</div>}
              <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200"><ArticleBody content={form.content} /></div>
            </article>
          </div>
        </div>
      )}
    </div>
  );
};

/** The featured image is a link to another site: copy it to our storage (R2) in one click. */
const ForeignImageNote: React.FC<{ url: string; onCopied: (url: string) => void }> = ({ url, onCopied }) => {
  const [base, setBase] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    api.get<{ base: string }>('/staff/uploads/images/import/').then((r) => setBase(r.base)).catch(() => setBase(''));
  }, []);
  if (!url || base === null || !/^https?:\/\//.test(url) || (base && url.startsWith(base))) return null;
  const copy = async () => {
    setBusy(true);
    setError('');
    try {
      onCopied((await api.post<{ url: string }>('/staff/uploads/images/import/', { url })).url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không chuyển được ảnh.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-2 text-[11px] text-amber-900 space-y-1">
      <div className="flex items-center gap-1 font-bold"><XCircle className="w-3.5 h-3.5" /> Ảnh đang nằm trên trang khác: có thể mất khi trang đó xóa.</div>
      <button type="button" disabled={busy} onClick={copy} className="px-2 py-1 rounded-lg bg-amber-600 text-white font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1">
        {busy && <Loader2 className="w-3 h-3 animate-spin" />} Chuyển ảnh về kho ảnh R2
      </button>
      {error && <div className="text-red-600 font-bold">{error}</div>}
    </div>
  );
};
