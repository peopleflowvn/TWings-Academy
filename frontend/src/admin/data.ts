/**
 * Shared data for the staff app: orders (CRM), courses and the homepage document, always from the API.
 * Logic moved from the public App so the CMS no longer depends on the public site's state.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, Paginated } from '../lib/api';
import { CMSSectionsConfig, Course, Order } from '../types';
import { DEFAULT_CMS_SECTIONS } from '../data/coursesData';

const reportError = (err: unknown) =>
  window.alert(err instanceof Error ? err.message : 'Thao tác thất bại, vui lòng thử lại.');

// Fields the server owns or that have their own endpoints: never sent in a PATCH.
const ORDER_READ_ONLY = new Set([
  'id', 'orderCode', 'totalPaidAmount', 'paidAt', 'isDuplicate', 'duplicateCount', 'createdAt', 'updatedAt',
  'privacyConsentAt', 'privacyConsentVersion', 'timelineActivities', 'followupTasks', 'learnerProfile',
  'responseDueAt', 'firstResponseAt', 'learnerId', 'learnerCode', 'relatedOrders'
]);
// Derived by the server from recorded payments (confirm-payment, bank webhook): never sent in a PATCH.
const PAYMENT_DERIVED = new Set(['status', 'learningAccess', 'refundedAmount', 'paidAt']);

/** Leads for screens that only read a few of them (e-mail previews): the 200 newest. */
export function useOrders(enabled: boolean) {
  const [orders, setOrders] = useState<Order[]>([]);
  const reload = useCallback(async () => {
    const res = await api.get<Paginated<Order>>('/staff/orders/?pageSize=200');
    setOrders(res.results);
  }, []);
  useEffect(() => {
    if (enabled) reload().catch(reportError);
  }, [enabled, reload]);
  return { orders, reload };
}

/** One lead in full (the list leaves out identity documents and bank accounts). */
export const loadOrder = (id: string) => api.get<Order>(`/staff/orders/${id}/`);

/** Finance: record money received outside the bank webhook (audited on the server); the order as now stored. */
export async function confirmOrderPayment(id: string, amount: number): Promise<Order | null> {
  try {
    await api.post(`/staff/orders/${id}/confirm-payment/`, { amount, note: 'Xác nhận thủ công từ CRM (đã đối soát)' });
  } catch (err) {
    reportError(err);
  }
  return loadOrder(id).catch(() => null);
}

/**
 * Save a lead edited in the CMS against the version it was loaded as: only changed fields are PATCHed
 * (never payment state: payments go through confirmOrderPayment), new activities and follow-ups go to
 * their endpoints. Resolves to the order as stored on the server; failures are reported, not thrown.
 */
export async function saveOrderChanges(previous: Order, updated: Order): Promise<Order> {
  const prev = previous as unknown as Record<string, unknown>;
  const next = updated as unknown as Record<string, unknown>;
  const changed: Record<string, unknown> = {};
  for (const key of Object.keys(next)) {
    if (!ORDER_READ_ONLY.has(key) && !PAYMENT_DERIVED.has(key) && JSON.stringify(next[key]) !== JSON.stringify(prev[key])) changed[key] = next[key];
  }
  const errors: string[] = [];
  const push = (err: unknown) => errors.push(err instanceof Error ? err.message : String(err));
  if (Object.keys(changed).length) await api.patch(`/staff/orders/${updated.id}/`, changed).catch(push);

  const knownActivity = new Set((previous.timelineActivities || []).map((a) => a.id));
  for (const a of updated.timelineActivities || []) {
    if (knownActivity.has(a.id) || a.type === 'payment') continue;
    await api.post(`/staff/orders/${updated.id}/activities/`, { type: a.type, title: a.title, content: a.content }).catch(push);
  }

  const prevTasks = new Map((previous.followupTasks || []).map((t) => [t.id, t]));
  const nextTaskIds = new Set((updated.followupTasks || []).map((t) => t.id));
  for (const task of updated.followupTasks || []) {
    const before = prevTasks.get(task.id);
    const body = {
      title: task.title,
      dueDate: /^\d{4}-\d{2}-\d{2}/.test(task.dueDate) ? task.dueDate.slice(0, 10) : null,
      priority: task.priority,
      isCompleted: task.isCompleted,
      assignedTo: task.assignedTo
    };
    if (!before) await api.post(`/staff/orders/${updated.id}/followups/`, body).catch(push);
    else if (JSON.stringify(before) !== JSON.stringify(task))
      await api.patch(`/staff/orders/${updated.id}/followups/${task.id}/`, body).catch(push);
  }
  for (const taskId of prevTasks.keys()) {
    if (!nextTaskIds.has(taskId)) await api.delete(`/staff/orders/${updated.id}/followups/${taskId}/`).catch(push);
  }

  if (errors.length) reportError(new Error(`Chưa lưu được một phần thay đổi: ${errors.join('; ')}`));
  return loadOrder(updated.id).catch(() => previous);
}

/** Programs (gói khóa) for course pickers: id, title and whether they are on sale. */
export function usePrograms(enabled = true) {
  const [programs, setPrograms] = useState<{ id: string; title: string; isPublished: boolean }[]>([]);
  useEffect(() => {
    if (!enabled) return;
    api
      .get<{ id: string; title: string; isPublished: boolean }[] | Paginated<{ id: string; title: string; isPublished: boolean }>>('/staff/programs/')
      .then((res) => setPrograms((Array.isArray(res) ? res : res.results).map((p) => ({ id: p.id, title: p.title, isPublished: p.isPublished }))))
      .catch(() => setPrograms([]));
  }, [enabled]);
  return programs;
}

export function useCourses(enabled: boolean) {
  const [courses, setCourses] = useState<Course[]>([]);

  const reload = useCallback(async () => {
    const res = await api.get<Paginated<Course> | Course[]>('/staff/courses/?pageSize=200');
    setCourses(Array.isArray(res) ? res : res.results);
  }, []);

  useEffect(() => {
    if (enabled) reload().catch(reportError);
  }, [enabled, reload]);

  const add = async (course: Course) => {
    try {
      const saved = await api.post<Course>('/staff/courses/', course);
      setCourses((list) => [saved, ...list]);
    } catch (err) {
      reportError(err);
    }
  };
  const update = async (course: Course) => {
    try {
      const saved = await api.patch<Course>(`/staff/courses/${course.id}/`, course);
      setCourses((list) => list.map((c) => (c.id === saved.id ? saved : c)));
    } catch (err) {
      reportError(err);
    }
  };
  const remove = async (id: string) => {
    try {
      await api.delete(`/staff/courses/${id}/`);
      setCourses((list) => list.filter((c) => c.id !== id));
    } catch (err) {
      reportError(err);
    }
  };
  return { courses, reload, add, update, remove };
}

/** Homepage content, section toggles and homepage partners: the 'homepage_sections' document. */
export function useHomepageSections(enabled: boolean) {
  const [sections, setSections] = useState<CMSSectionsConfig>(DEFAULT_CMS_SECTIONS);
  const [loaded, setLoaded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    api
      .get<{ data: Partial<CMSSectionsConfig> }>('/staff/site-config/homepage_sections/')
      .then((res) => {
        if (res.data && Object.keys(res.data).length) setSections({ ...DEFAULT_CMS_SECTIONS, ...res.data });
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [enabled]);

  const update = (next: CMSSectionsConfig) => {
    setSections(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      api.patch('/staff/site-config/homepage_sections/', { data: next }).catch(reportError);
    }, 800);
  };
  return { sections, update, loaded };
}
