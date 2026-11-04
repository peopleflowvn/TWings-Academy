/**
 * The stages of a registration (Order.crmStatus): the old CRM's "Trạng thái khách hàng" (sheet "Danh mục",
 * column G). Mirrors backend/apps/crm/stages.py, which is authoritative (the API refuses a wrong move).
 */
import type { CRMStatus } from '../types';

export const POTENTIAL: CRMStatus = '1. Tiềm năng';
export const CONSULTING: CRMStatus = '2. Đang tư vấn';
export const AGREED: CRMStatus = '3. Đồng ý học';
export const TO_PAY: CRMStatus = '4. Cần đóng học phí';
export const PAID: CRMStatus = '5. Đã đóng phí';
export const PART_PAID: CRMStatus = '6. Đã đóng 1 phần học phí';
export const ONBOARD: CRMStatus = '7. Onboard';
export const REFUSED_1: CRMStatus = '0. Từ chối lần 1';
export const REFUSED_2: CRMStatus = '0. Từ chối lần 2';
export const REFUSED_3: CRMStatus = '0. Từ chối lần 3';
export const UNREACHABLE: CRMStatus = '0. Không gọi được';
export const MISTAKEN: CRMStatus = '0. Đăng ký nhầm';
export const TEST: CRMStatus = '0. Test';

/** Kanban order: the way forward, then the refusals. */
export const STAGES: { id: CRMStatus; label: string; dot: string }[] = [
  { id: POTENTIAL, label: '1. Tiềm năng', dot: 'bg-blue-500' },
  { id: CONSULTING, label: '2. Đang tư vấn', dot: 'bg-indigo-500' },
  { id: AGREED, label: '3. Đồng ý học', dot: 'bg-amber-500' },
  { id: TO_PAY, label: '4. Cần đóng học phí', dot: 'bg-orange-500' },
  { id: PAID, label: '5. Đã đóng phí', dot: 'bg-emerald-500' },
  { id: PART_PAID, label: '6. Đã đóng 1 phần học phí', dot: 'bg-teal-500' },
  { id: ONBOARD, label: '7. Onboard', dot: 'bg-green-700' },
  { id: REFUSED_1, label: '0. Từ chối lần 1', dot: 'bg-slate-400' },
  { id: REFUSED_2, label: '0. Từ chối lần 2', dot: 'bg-slate-500' },
  { id: REFUSED_3, label: '0. Từ chối lần 3', dot: 'bg-red-400' },
  { id: UNREACHABLE, label: '0. Không gọi được', dot: 'bg-red-300' },
  { id: MISTAKEN, label: '0. Đăng ký nhầm', dot: 'bg-red-200' },
  { id: TEST, label: '0. Test', dot: 'bg-slate-300' }
];

export const OPEN: CRMStatus[] = [POTENTIAL, CONSULTING, AGREED, TO_PAY];
export const ENROLLED: CRMStatus[] = [PAID, PART_PAID, ONBOARD];
/** Set from the recorded payments, never by moving a card. */
export const FROM_PAYMENTS: CRMStatus[] = [PAID, PART_PAID];
/** A call-back day is asked for (a task is created). */
export const CALL_AGAIN: CRMStatus[] = [REFUSED_1, REFUSED_2];
/** Lost: an unpaid registration is cancelled. */
export const CLOSED: CRMStatus[] = [REFUSED_3, UNREACHABLE, MISTAKEN, TEST];

export const stageOf = (o: { crmStatus?: CRMStatus }): CRMStatus => o.crmStatus || POTENTIAL;

/** Why a card may not go to `next` (null: it may). */
export function blockedMove(o: { learningAccess?: boolean; crmStatus?: CRMStatus }, next: CRMStatus): string | null {
  const current = stageOf(o);
  if (next === current) return null;
  if (FROM_PAYMENTS.includes(next)) return `"${next}" tự chuyển khi ghi nhận thanh toán.`;
  if (next === ONBOARD && !o.learningAccess) return 'Chỉ Onboard được học viên đã đóng phí (đủ hoặc đợt 1).';
  if (o.learningAccess && !ENROLLED.includes(next)) return 'Học viên đã đóng phí: muốn dừng học thì hoàn tiền / kết thúc ghi danh.';
  return null;
}
