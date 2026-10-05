/**
 * Server-backed lists for CMS tabs that edit a whole array at once (setX(newList)).
 *
 * Live mode: the list is loaded from a DRF endpoint; every update is diffed against the previous list
 * and turned into POST (new items) / PATCH (changed items) / DELETE (removed items), then the list is
 * reloaded from the server, which stays the source of truth. Demo mode: plain local state, unchanged.
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
}

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export async function syncCollection<T extends { id: string }>(
  opts: CollectionOptions<T>,
  previous: T[],
  next: T[]
): Promise<string[]> {
  const errors: string[] = [];
  const prevById = new Map(previous.map((item) => [item.id, item]));
  const nextIds = new Set(next.map((item) => item.id));
  for (const item of next) {
    const before = prevById.get(item.id);
    const payload = opts.toServer(item);
    try {
      if (!before) {
        await api.post(opts.endpoint, payload);
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
  return errors;
}

export function useServerCollection<T extends { id: string }>(opts: CollectionOptions<T>, demoData: T[]) {
  const live = isBackendEnabled();
  const [items, setItems] = useState<T[]>(live ? [] : demoData);
  const [loaded, setLoaded] = useState(!live);
  const current = useRef(items);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const reload = useCallback(async () => {
    const o = optsRef.current;
    const sep = o.endpoint.includes('?') ? '&' : '?';
    const res = await api.get<Paginated<ServerRow> | ServerRow[]>(
      `${o.endpoint}${sep}pageSize=200${o.query ? `&${o.query}` : ''}`
    );
    const rows = Array.isArray(res) ? res : res.results;
    const mapped = rows.map(o.fromServer);
    current.current = mapped;
    setItems(mapped);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (live) reload().catch((err) => window.alert(`Không tải được dữ liệu: ${errorText(err)}`));
  }, [live, reload]);

  const update = useCallback(
    async (next: T[]) => {
      const previous = current.current;
      current.current = next;
      setItems(next);
      if (!live) return;
      const errors = await syncCollection(optsRef.current, previous, next);
      await reload().catch(() => undefined);
      if (errors.length) window.alert(`Chưa lưu được một phần thay đổi: ${errors.join('; ')}`);
    },
    [live, reload]
  );

  return { items, update, reload, live, loaded };
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
