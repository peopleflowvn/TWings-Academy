/**
 * Selling beyond single courses: programs (bundles), installment plans, refunds, the learner account.
 * Amounts always come from the server; the browser only displays them.
 */
import { api } from './api';

export interface ProgramCourseSummary {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  thumbnail: string;
  duration: string;
  level: string;
  price: number;
  deliveryFormat: string;
}

export interface Program {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  thumbnail: string;
  highlights: string[];
  price: number;
  originalPrice: number;
  installmentCount: number;
  installmentIntervalDays: number;
  courses: ProgramCourseSummary[];
  coursesTotalPrice: number;
  /** Staff only */
  isPublished?: boolean;
  sortOrder?: number;
  ordersCount?: number;
}

export interface InstallmentRow {
  sequence: number;
  amount: number;
  dueDate: string;
  paidAt: string | null;
  overdue: boolean;
}

export interface PaymentInstructions {
  orderCode: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  transferContent: string;
  qrImageUrl: string;
}

export interface OrderBilling {
  orderCode: string;
  status: 'pending' | 'paid' | 'cancelled' | 'refunded';
  statusLabel: string;
  amount: number;
  totalPaid: number;
  refunded: number;
  refundable: number;
  amountDueNow: number;
  installmentCount: number;
  installments: InstallmentRow[];
  learningAccess: boolean;
  payment: PaymentInstructions | null;
  // staff only
  payments?: { amount: number; source: string; note: string; at: string }[];
  refunds?: { amount: number; reason: string; reference: string; by: string; at: string }[];
  parentCode?: string;
  components?: { id: string; orderCode: string; courseTitle: string; status: string; cohort: string }[];
}

export interface AccountCourse {
  title: string;
  cohortName: string;
  startDate: string | null;
  lmsStatus: string | null;
  lmsStatusLabel: string;
  progress: number | null;
  completedAt: string | null;
  certificate: { code: string; url: string } | null;
  orderCode: string;
  canReview: boolean;
  review: { rating: number; comment: string; status: 'pending' | 'approved' | 'rejected' } | null;
}

export interface AccountOrder extends OrderBilling {
  title: string;
  kind: 'course' | 'program';
  createdAt: string;
  courses: AccountCourse[];
  refundRequested: boolean;
}

export type Account =
  | { authenticated: false }
  | { authenticated: true; email: string; name: string; learnUrl: string; orders: AccountOrder[] };

export const commerceApi = {
  publicPrograms: () => api.get<Program[]>('/public/programs/'),
  publicProgram: (slug: string) => api.get<Program>(`/public/programs/${encodeURIComponent(slug)}/`),

  staffPrograms: () => api.get<Program[]>('/staff/programs/'),
  saveProgram: (program: Partial<Program> & { courseIds: string[] }) =>
    program.id
      ? api.patch<Program>(`/staff/programs/${program.id}/`, program)
      : api.post<Program>('/staff/programs/', program),
  deleteProgram: (id: string) => api.delete<void>(`/staff/programs/${id}/`),

  billing: (orderId: string) => api.get<OrderBilling>(`/staff/orders/${orderId}/billing/`),
  refund: (orderId: string, body: { amount: number; reason: string; reference: string; revokeAccess: boolean }) =>
    api.post<OrderBilling>(`/staff/orders/${orderId}/refund/`, body),

  account: () => api.get<Account>('/public/account/'),
  sendCode: (email: string) => api.post<{ sent: boolean }>('/public/account/send-code/', { email }),
  verify: (email: string, code: string) => api.post<{ authenticated: boolean }>('/public/account/verify/', { email, code }),
  logout: () => api.post<{ authenticated: boolean }>('/public/account/logout/'),
  review: (body: { orderCode: string; rating: number; comment: string; displayName: string; role: string; consent: boolean }) =>
    api.post<AccountCourse>('/public/account/reviews/', body),
  requestRefund: (orderCode: string, reason: string) =>
    api.post<AccountOrder>(`/public/account/orders/${orderCode}/refund-request/`, { reason })
};

export const formatVND = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + ' ₫';

export const formatDate = (iso: string | null | undefined) =>
  iso ? new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString('vi-VN') : '';

/** Same split as the server (crm.services.installment_amounts): equal parts, the first carries the remainder. */
export function installmentPreview(amount: number, count: number): number[] {
  if (count <= 1 || amount <= 0) return [amount];
  const base = Math.floor(amount / count / 1000) * 1000;
  return [amount - base * (count - 1), ...Array(count - 1).fill(base)];
}
