import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BookOpen, CalendarDays, Layers, Megaphone, Newspaper, Search } from 'lucide-react';
import { api, isBackendEnabled, Paginated } from '../lib/api';
import { commerceApi, Program } from '../lib/commerce';
import { routePath } from '../lib/routes';
import { courseFields, rank } from '../lib/search';
import { startLine, vnd, priceFor, openIntakes } from '../lib/selling';
import { Article, Course } from '../types';
import type { CampaignCard } from './CampaignPages';

/** Programs, campaigns and articles are loaded once, the first time a visitor uses the search. */
let extrasCache: Promise<{ programs: Program[]; campaigns: CampaignCard[]; articles: Article[] }> | null = null;
const loadExtras = () => {
  if (!isBackendEnabled()) return Promise.resolve({ programs: [], campaigns: [], articles: [] });
  extrasCache ??= Promise.all([
    commerceApi.publicPrograms().catch(() => [] as Program[]),
    api.get<CampaignCard[]>('/public/campaigns/').catch(() => [] as CampaignCard[]),
    api
      .get<Paginated<Article> | Article[]>('/public/articles/')
      .then((r) => (Array.isArray(r) ? r : r.results))
      .catch(() => [] as Article[])
  ]).then(([programs, campaigns, articles]) => ({ programs, campaigns, articles }));
  return extrasCache;
};

interface Suggestion {
  key: string;
  kind: 'course' | 'program' | 'campaign' | 'article';
  title: string;
  meta: string;
  href: string;
  course?: Course;
}

const KIND = {
  course: { label: 'Khóa học', icon: BookOpen },
  program: { label: 'Chương trình', icon: Layers },
  campaign: { label: 'Đang tuyển sinh', icon: Megaphone },
  article: { label: 'Bài viết', icon: Newspaper }
} as const;

interface SiteSearchProps {
  value: string;
  onChange: (query: string) => void;
  /** Enter without a highlighted suggestion: the catalogue filtered by the query. */
  onSubmit: () => void;
  courses: Course[];
  /** Open a course inside the app (otherwise its link loads the page). */
  onOpenCourse?: (course: Course) => void;
  onOpenConsultation?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  inputClassName?: string;
  onDone?: () => void;
}

/**
 * The header search: suggestions while typing (courses with their next intake and price, programs,
 * campaigns, articles), accent-insensitive and aware of banking shorthand (lib/search). Arrow keys
 * move, Enter opens, Escape closes.
 */
export const SiteSearch: React.FC<SiteSearchProps> = ({
  value,
  onChange,
  onSubmit,
  courses,
  onOpenCourse,
  onOpenConsultation,
  placeholder = 'Bạn muốn học gì? (VD: QHKH doanh nghiệp, tín dụng…)',
  autoFocus,
  inputClassName = '',
  onDone
}) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [extras, setExtras] = useState<{ programs: Program[]; campaigns: CampaignCard[]; articles: Article[] }>({
    programs: [],
    campaigns: [],
    articles: []
  });
  const box = useRef<HTMLDivElement>(null);

  const warmUp = () => {
    setOpen(true);
    loadExtras().then(setExtras);
  };

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const query = value.trim();
  const suggestions: Suggestion[] = useMemo(() => {
    const courseRows = (query ? rank(courses, query, courseFields) : courses).slice(0, query ? 5 : 4).map((c) => ({
      key: `c-${c.id}`,
      kind: 'course' as const,
      title: c.title,
      meta: [startLine(c), vnd(priceFor(c, openIntakes(c)[0]))].filter(Boolean).join(' · '),
      href: routePath('course-detail', c.slug),
      course: c
    }));
    if (!query) return courseRows;
    const programs = rank(extras.programs, query, (p) => [
      { text: p.title, weight: 3 },
      { text: p.subtitle, weight: 2 },
      { text: p.courses.map((c) => c.title).join(' '), weight: 1 }
    ])
      .slice(0, 2)
      .map((p) => ({
        key: `p-${p.slug}`,
        kind: 'program' as const,
        title: p.title,
        meta: `${p.courses.length} khóa học · ${vnd(p.price)}`,
        href: `/chuong-trinh/${p.slug}`
      }));
    const campaigns = rank(extras.campaigns, query, (c) => [
      { text: c.name, weight: 3 },
      { text: c.summary, weight: 2 },
      { text: c.courses.map((x) => x.title).join(' '), weight: 1 }
    ])
      .slice(0, 2)
      .map((c) => ({
        key: `t-${c.slug}`,
        kind: 'campaign' as const,
        title: c.name,
        meta: c.daysLeft != null ? `Còn ${c.daysLeft} ngày nhận hồ sơ` : 'Đang nhận hồ sơ',
        href: routePath('campaign-detail', c.slug)
      }));
    const articles = rank(extras.articles, query, (a) => [
      { text: a.title, weight: 3 },
      { text: a.excerpt, weight: 2 },
      { text: (a.tags || []).join(' '), weight: 2 }
    ])
      .slice(0, 2)
      .map((a) => ({
        key: `a-${a.slug}`,
        kind: 'article' as const,
        title: a.title,
        meta: a.category || 'Bài viết',
        href: routePath('article-detail', a.slug)
      }));
    return [...courseRows, ...programs, ...campaigns, ...articles];
  }, [query, courses, extras]);

  useEffect(() => setActive(-1), [query]);

  const openSuggestion = (s: Suggestion, e?: React.MouseEvent) => {
    if (e && (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0)) return; // new tab
    if (s.course && onOpenCourse) {
      e?.preventDefault();
      onOpenCourse(s.course);
    } else if (!e) {
      window.location.href = s.href;
    }
    setOpen(false);
    onDone?.();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      const n = suggestions.length;
      if (n) setActive((i) => (e.key === 'ArrowDown' ? (i + 1) % n : (i - 1 + n) % n));
    } else if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'Enter' && active >= 0 && suggestions[active]) {
      e.preventDefault();
      openSuggestion(suggestions[active]);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setOpen(false);
    onSubmit();
    onDone?.();
  };

  return (
    <div ref={box} className="relative w-full">
      <form onSubmit={submit} role="search" className="relative flex items-center">
        <input
          type="search"
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={warmUp}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label="Tìm khóa học"
          aria-expanded={open}
          aria-autocomplete="list"
          className={`w-full pl-4 pr-11 py-2 text-sm bg-white border border-slate-300 rounded-full focus:outline-none focus:border-[#0073C1] focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400 text-slate-800 [&::-webkit-search-cancel-button]:hidden ${inputClassName}`}
        />
        <button type="submit" className="absolute right-1.5 p-2 bg-[#0073C1] hover:bg-[#005FA0] text-white rounded-full cursor-pointer" title="Tìm kiếm">
          <Search className="w-3.5 h-3.5" />
        </button>
      </form>

      {open && (
        <div className="absolute left-0 right-0 mt-2 z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden text-left">
          {!query && <div className="px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">Khóa học đang mở</div>}
          {suggestions.length > 0 ? (
            <ul role="listbox" className="max-h-[60vh] overflow-y-auto py-1">
              {suggestions.map((s, i) => {
                const Icon = s.kind === 'course' && s.meta.startsWith('Khai giảng') ? CalendarDays : KIND[s.kind].icon;
                return (
                  <li key={s.key} role="option" aria-selected={i === active}>
                    <a
                      href={s.href}
                      onClick={(e) => openSuggestion(s, e)}
                      onMouseEnter={() => setActive(i)}
                      className={`flex items-start gap-3 px-4 py-2.5 ${i === active ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                    >
                      <Icon className="w-4 h-4 mt-0.5 text-[#0073C1] shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-slate-900 truncate">{s.title}</span>
                        <span className="block text-[11px] text-slate-500 truncate">
                          {query && <span className="font-semibold text-slate-600">{KIND[s.kind].label} · </span>}
                          {s.meta}
                        </span>
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-4 py-4 text-sm text-slate-600 space-y-2">
              <div>
                Chưa có kết quả cho <b>“{query}”</b>. Thử “tín dụng”, “QHKH”, “giao dịch viên”.
              </div>
              {onOpenConsultation && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onOpenConsultation();
                  }}
                  className="text-[#0073C1] font-bold hover:underline cursor-pointer"
                >
                  Nhờ tư vấn viên gợi ý khóa phù hợp →
                </button>
              )}
            </div>
          )}
          {query && suggestions.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onSubmit();
                onDone?.();
              }}
              className="w-full flex items-center justify-between px-4 py-2.5 border-t border-slate-100 text-sm font-bold text-[#0073C1] hover:bg-slate-50 cursor-pointer"
            >
              Xem tất cả khóa học cho “{query}” <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
