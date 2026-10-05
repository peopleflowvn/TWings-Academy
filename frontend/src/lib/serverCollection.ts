/**
 * Server-backed lists and documents for CMS tabs that edit a whole array/object at once.
 *
 * Live mode: data is loaded from a DRF endpoint; updates are applied locally at once and saved after a
 * short debounce (tabs often update on every keystroke): the list is diffed against the last saved
 * state and turned into POST (new) / PATCH (changed) / DELETE (removed) calls. New items get their
 * server id immediately (no duplicate POST), and the list is reloaded from the server, the source of
 * truth, unless the user kept editing meanwhile. Demo mode: plain local state, unchanged.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, isBackendEnabled, Paginated } from './api';

/* eslint-disable @typescript-eslint/no-explicit-any */
type ServerRow = Record<string, any>;

export interface CollectionOptions<T> {
  endpoint: string; // e.g. '/staff/cohorts/'
  fromServer: (row: ServerRow) => T;
  toServer: (item: T) => Record<string, unknown>;
  /** Removing an item from the list deletes it on the server (default true). */
  allowDelete?: boolean;
  /** Extra query string for the list request, e.g. 'ordering=sortOrder'. */
  query?: string;
  /** Wait this long after the last change before saving (default 600 ms). */
  debounceMs?: number;
}

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export async function syncCollection<T extends { id: string }>(
  opts: CollectionOptions<T>,
  previous: T[],
  next: T[]
): Promise<{ errors: string[]; created: Map<string, ServerRow> }> {
  const errors: string[] = [];
  const created = new Map<string, ServerRow>();
  const prevById = new Map(previous.map((item) => [item.id, item]));
  const nextIds = new Set(next.map((item) => item.id));
  for (const item of next) {
    const before = prevById.get(item.id);
    const payload = opts.toServer(item);
    try {
      if (!before) {
        created.set(item.id, await api.post<ServerRow>(opts.endpoint, payload));
      } else if (JSON.stringify(payload) !== JSON.stringify(opts.toServer(before))) {
        await api.patch(`${opts.endpoint}${item.id}/`, payload);
      }
    } catch (err) {
      errors.push(errorText(err));
    }
  }
  if (opts.allowDelete !== false) {
    for (const item of previous) {
      if (nextIds.has(item.id)) continue;
      try {
        await api.delete(`${opts.endpoint}${item.id}/`);
      } catch (err) {
        errors.push(errorText(err));
      }
    }
  }
  return { errors, created };
}

export function useServerCollection<T extends { id: string }>(opts: CollectionOptions<T>, demoData: T[]) {
  const live = isBackendEnabled();
  const [items, setItems] = useState<T[]>(live ? [] : demoData);
  const [loaded, setLoaded] = useState(!live);
  const current = useRef<T[]>(items); // what the UI shows
  const saved = useRef<T[]>(items); // what the server has (as far as we know)
  const version = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const reload = useCallback(async () => {
    const o = optsRef.current;
    const sep = o.endpoint.includes('?') ? '&' : '?';
    const res = await api.get<Paginated<ServerRow> | ServerRow[]>(
      `${o.endpoint}${sep}pageSize=200${o.query ? `&${o.query}` : ''}`
    );
    const mapped = (Array.isArray(res) ? res : res.results).map(o.fromServer);
    current.current = mapped;
    saved.current = mapped;
    setItems(mapped);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (live) reload().catch((err) => window.alert(`Không tải được dữ liệu: ${errorText(err)}`));
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [live, reload]);

  const flush = useCallback(async () => {
    const startVersion = version.current;
    const target = current.current;
    const { errors, created } = await syncCollection(optsRef.current, saved.current, target);
    const withIds = (list: T[]) =>
      list.map((item) => (created.has(item.id) ? optsRef.current.fromServer(created.get(item.id)!) : item));
    saved.current = withIds(target);
    if (created.size) {
      current.current = withIds(current.current);
      setItems(current.current);
    }
    if (startVersion === version.current) await reload().catch(() => undefined);
    if (errors.length) window.alert(`Chưa lưu được một phần thay đổi: ${errors.join('; ')}`);
  }, [reload]);

  const update = useCallback(
    (next: T[]) => {
      current.current = next;
      setItems(next);
      version.current += 1;
      if (!live) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, optsRef.current.debounceMs ?? 600);
    },
    [live, flush]
  );

  return { items, update, reload, live, loaded };
}

/** A single JSON document (SiteConfig: homepage sections, site SEO) saved with a debounce. */
export function useServerDocument<T extends object>(key: string, demoData: T, debounceMs = 800) {
  const live = isBackendEnabled();
  const [doc, setDoc] = useState<T>(demoData);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!live) return;
    api
      .get<{ data: Partial<T> }>(`/staff/site-config/${key}/`)
      .then((res) => {
        if (res.data && Object.keys(res.data).length) setDoc({ ...demoData, ...res.data });
      })
      .catch(() => undefined);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, key]);

  const update = useCallback(
    (next: T) => {
      setDoc(next);
      if (!live) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        api
          .patch(`/staff/site-config/${key}/`, { data: next })
          .catch((err) => window.alert(`Chưa lưu được cấu hình: ${errorText(err)}`));
      }, debounceMs);
    },
    [live, key, debounceMs]
  );

  return { doc, update, live };
}

// ---------------------------------------------------------------- date helpers (UI dd/mm/yyyy <-> ISO)
export function viDateToIso(value?: string | null): string | null {
  if (!value) return null;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;
}

export function isoToViDate(value?: string | null): string {
  if (!value) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : value;
}
