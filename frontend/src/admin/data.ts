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
  'privacyConsentAt', 'privacyConsentVersion', 'timelineActivities', 'followupTasks', 'agentResearch'
]);
// Set by the UI when it marks an order paid; the server derives them from the recorded payment.
const PAYMENT_DERIVED = new Set(['status', 'paymentStatusDetail', 'crmStatus', 'paymentDate']);

export function useOrders(enabled: boolean) {
  const [orders, setOrders] = useState<Order[]>([]);
  const ordersRef = useRef<Order[]>([]);
  ordersRef.current = orders;

  const reload = useCallback(async () => {
    const res = await api.get<Paginated<Order>>('/staff/orders/?pageSize=200');
    setOrders(res.results);
  }, []);

  useEffect(() => {
    if (enabled) reload().catch(reportError);
  }, [enabled, reload]);

  const refreshOne = async (id: string, fallback?: Order) => {
    try {
      const fresh = await api.get<Order>(`/staff/orders/${id}/`);
      setOrders((list) => list.map((o) => (o.id === fresh.id ? fresh : o)));
    } catch {
      if (fallback) setOrders((list) => list.map((o) => (o.id === fallback.id ? fallback : o)));
    }
  };

  const updateStatus = async (id: string, status: Order['status']) => {
    try {
      await api.patch(`/staff/orders/${id}/`, { status });
    } catch (err) {
      reportError(err);
    }
    await refreshOne(id);
  };

  /**
   * Persist a CRM edit made anywhere in the CMS: only changed fields are sent, "mark as paid" records
   * a real payment (audit, totals, LMS enrolment), activities and follow-ups use their endpoints, and
   * the order is reloaded from the server afterwards.
   */
  const updateCRM = async (updated: Order) => {
    const previous = ordersRef.current.find((o) => o.id === updated.id);
    setOrders((list) => list.map((o) => (o.id === updated.id ? updated : o)));
    if (!previous) return;
    const prev = previous as unknown as Record<string, unknown>;
    const next = updated as unknown as Record<string, unknown>;
    const changed: Record<string, unknown> = {};
    for (const key of Object.keys(next)) {
      if (!ORDER_READ_ONLY.has(key) && JSON.stringify(next[key]) !== JSON.stringify(prev[key])) changed[key] = next[key];
    }
    const errors: string[] = [];
    const push = (err: unknown) => errors.push(err instanceof Error ? err.message : String(err));
    try {
      if (updated.status === 'paid' && previous.status !== 'paid') {
        PAYMENT_DERIVED.forEach((k) => delete changed[k]);
        const outstanding = (previous.totalReceivable || previous.amount || 0) - (previous.totalPaidAmount || 0);
        if (outstanding > 0) {
          await api.post(`/staff/orders/${updated.id}/confirm-payment/`, {
            amount: outstanding,
            note: 'Xác nhận thanh toán từ CMS'
          });
        } else {
          await api.patch(`/staff/orders/${updated.id}/`, { status: 'paid' });
        }
      }
      if (Object.keys(changed).length) await api.patch(`/staff/orders/${updated.id}/`, changed);

      const knownActivity = new Set((previous.timelineActivities || []).map((a) => a.id));
      for (const a of updated.timelineActivities || []) {
        if (knownActivity.has(a.id) || a.type === 'payment') continue;
        await api.post(`/staff/orders/${updated.id}/activities/`, { type: a.type, title: a.title, content: a.content });
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
        try {
          if (!before) await api.post(`/staff/orders/${updated.id}/followups/`, body);
          else if (JSON.stringify(before) !== JSON.stringify(task))
            await api.patch(`/staff/orders/${updated.id}/followups/${task.id}/`, body);
        } catch (err) {
          push(err);
        }
      }
      for (const taskId of prevTasks.keys()) {
        if (nextTaskIds.has(taskId)) continue;
        try {
          await api.delete(`/staff/orders/${updated.id}/followups/${taskId}/`);
        } catch (err) {
          push(err);
        }
      }
    } catch (err) {
      push(err);
    }
    await refreshOne(updated.id, previous);
    if (errors.length) reportError(new Error(`Chưa lưu được một phần thay đổi: ${errors.join('; ')}`));
  };

  return { orders, reload, updateStatus, updateCRM };
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
