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

/** "Khai giảng dd/mm/yyyy · còn N chỗ" of one class (places only when staff show them). */
export function intakeLine(intake: Intake): string {
  const when = intake.startDate ? `Khai giảng ${viDate(intake.startDate)}` : 'Sắp công bố ngày khai giảng';
  return intake.showQuota === false ? `${when} · đang nhận đăng ký` : `${when} · còn ${intake.seatsLeft} chỗ`;
}

/** One line about when the learner can start, for cards and the buy bar. */
export function startLine(course: Course): string {
  const next = openIntakes(course)[0];
  if (next) return `${next.name} · ${intakeLine(next)}`;
  if (!canBuy(course)) return 'Chưa có lịch khai giảng mới';
  return course.deliveryFormat === 'online_external_lms' ? 'Học online, vào học ngay sau khi thanh toán' : '';
}

/** Days left to register (0 = today), or null without a deadline. */
export function daysLeft(intake: Intake, today = new Date()): number | null {
  if (!intake.registrationDeadline) return null;
  const end = new Date(`${intake.registrationDeadline.slice(0, 10)}T00:00:00`).getTime();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.max(Math.round((end - start) / 86400000), 0);
}

/** "Hạn đăng ký dd/mm/yyyy · còn N ngày" (the countdown in the last two weeks), or ''. */
export function deadlineLine(intake: Intake): string {
  const left = daysLeft(intake);
  if (left === null) return '';
  if (left === 0) return `Hạn đăng ký hôm nay (${viDate(intake.registrationDeadline)})`;
  return `Hạn đăng ký ${viDate(intake.registrationDeadline)}${left <= 14 ? ` · còn ${left} ngày` : ''}`;
}

/** The class's link: its course page with the class chosen. */
export const classPath = (course: Course, intake?: Intake) =>
  `/khoa-hoc/${encodeURIComponent(course.slug)}${intake?.slug ? `?lop=${encodeURIComponent(intake.slug)}` : ''}`;

/** Every class taking registrations, one row each: featured first, then the nearest deadline, then start. */
export function recruitingClasses(courses: Course[]): { course: Course; intake: Intake }[] {
  const time = (iso?: string | null) => (iso ? new Date(iso).getTime() : 8e15);
  return courses
    .flatMap((course) => openIntakes(course).map((intake) => ({ course, intake })))
    .sort(
      (a, b) =>
        Number(!!b.intake.isFeatured) - Number(!!a.intake.isFeatured) ||
        time(a.intake.registrationDeadline) - time(b.intake.registrationDeadline) ||
        time(a.intake.startDate) - time(b.intake.startDate)
    );
}

/** The class named in the address (?lop=<slug>: a class's link), if any. */
export const classSlugInUrl = () => new URLSearchParams(window.location.search).get('lop') || '';

/** The class the course page is on: the one in the address while it takes learners, else the next one. */
export const chosenIntake = (course: Course): Intake | undefined => {
  const open = openIntakes(course);
  const slug = classSlugInUrl();
  return (slug && open.find((c) => c.slug === slug)) || open[0];
};
