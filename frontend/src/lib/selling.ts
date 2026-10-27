/**
 * What a buyer needs to decide, computed the same way on the course card, the course page and the
 * mobile buy bar: the intake to join, today's price (early bird included), the installment plan.
 */
import { Course } from '../types';
import { installmentPreview } from './commerce';

export type Intake = NonNullable<Course['upcomingCohorts']>[number];

export const vnd = (n: number) => `${new Intl.NumberFormat('vi-VN').format(n)} ₫`;

/** dd/mm/yyyy from an ISO date (the public API sends intake dates as ISO). */
export const viDate = (iso?: string | null) =>
  iso ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

/** Intakes still taking learners, earliest first. */
export const openIntakes = (course: Course): Intake[] => (course.upcomingCohorts || []).filter((c) => c.seatsLeft > 0);

/** Whether the course can be bought online now (server rule; older payloads: yes). */
export const canBuy = (course: Course) => course.checkoutOpen !== false;

export const priceFor = (course: Course, intake?: Intake) => intake?.price ?? course.price;

/** "Trả góp 2 kỳ · kỳ đầu 3.800.000 ₫", or '' when the course is paid in full only. */
export function installmentLine(course: Course, price: number): string {
  const n = course.installmentCount || 1;
  if (n <= 1 || price <= 0) return '';
  return `Trả góp ${n} kỳ · kỳ đầu ${vnd(installmentPreview(price, n)[0])}`;
}

/** One line about when the learner can start, for cards and the buy bar. */
export function startLine(course: Course): string {
  const next = openIntakes(course)[0];
  if (next) {
    const when = next.startDate ? `Khai giảng ${viDate(next.startDate)}` : `${next.name} · sắp công bố ngày`;
    return next.showQuota === false ? `${when} · đang nhận đăng ký` : `${when} · còn ${next.seatsLeft} chỗ`;
  }
  if (!canBuy(course)) return 'Chưa có lịch khai giảng mới';
  return course.deliveryFormat === 'online_external_lms' ? 'Học online, vào học ngay sau khi thanh toán' : '';
}
