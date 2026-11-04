/**
 * The stages of a registration (Order.crmStatus holds the stage's fixed code). Their names, kanban order and
 * the stages added since are a list edited in /app → Hệ thống → Danh mục ("Giai đoạn CRM"), read with the
 * other lists (GET /staff/crm/lists/ → stages; useStages in crmLists.ts). What a stage does comes from its group. Mirrors
 * backend/apps/crm/stages.py, which is authoritative (the API refuses a wrong move).
 */
import type { CRMStatus } from '../types';

export type StageGroup = 'open' | 'paid' | 'onboard' | 'call_again' | 'closed';

export interface StageDef {
  code: CRMStatus;
  name: string;
  group: StageGroup;
  active: boolean;
  builtin: boolean;
}

export const POTENTIAL: CRMStatus = 'potential';
export const CONSULTING: CRMStatus = 'consulting';
export const AGREED: CRMStatus = 'agreed';
export const TO_PAY: CRMStatus = 'to_pay';
export const PAID: CRMStatus = 'paid';
export const PART_PAID: CRMStatus = 'part_paid';
export const ONBOARD: CRMStatus = 'onboard';
export const REFUSED_1: CRMStatus = 'refused_1';
export const REFUSED_2: CRMStatus = 'refused_2';
export const REFUSED_3: CRMStatus = 'refused_3';
export const UNREACHABLE: CRMStatus = 'unreachable';
export const MISTAKEN: CRMStatus = 'mistaken';
export const TEST: CRMStatus = 'test';

export const GROUP_LABELS: Record<StageGroup, string> = {
  open: 'Đang chăm sóc',
  paid: 'Đã đóng phí (theo thanh toán)',
  onboard: 'Đang học',
  call_again: 'Từ chối – hẹn gọi lại',
  closed: 'Đóng (mất lead)'
};

const builtin = (code: CRMStatus, name: string, group: StageGroup): StageDef => ({ code, name, group, active: true, builtin: true });

/** Used until the list answers (the system's stages under their first names). */
export const DEFAULT_STAGES: StageDef[] = [
  builtin(POTENTIAL, '1. Tiềm năng', 'open'),
  builtin(CONSULTING, '2. Đang tư vấn', 'open'),
  builtin(AGREED, '3. Đồng ý học', 'open'),
  builtin(TO_PAY, '4. Cần đóng học phí', 'open'),
  builtin(PAID, '5. Đã đóng phí', 'paid'),
  builtin(PART_PAID, '6. Đã đóng 1 phần học phí', 'paid'),
  builtin(ONBOARD, '7. Onboard', 'onboard'),
  builtin(REFUSED_1, '0. Từ chối lần 1', 'call_again'),
  builtin(REFUSED_2, '0. Từ chối lần 2', 'call_again'),
  builtin(REFUSED_3, '0. Từ chối lần 3', 'closed'),
  builtin(UNREACHABLE, '0. Không gọi được', 'closed'),
  builtin(MISTAKEN, '0. Đăng ký nhầm', 'closed'),
  builtin(TEST, '0. Test', 'closed')
];

export const ENROLLED: CRMStatus[] = [PAID, PART_PAID, ONBOARD];
/** Set from the recorded payments, never by moving a card. */
export const FROM_PAYMENTS: CRMStatus[] = [PAID, PART_PAID];

const DOTS: Record<string, string> = {
  [POTENTIAL]: 'bg-blue-500',
  [CONSULTING]: 'bg-indigo-500',
  [AGREED]: 'bg-amber-500',
  [TO_PAY]: 'bg-orange-500',
  [PAID]: 'bg-emerald-500',
  [PART_PAID]: 'bg-teal-500',
  [ONBOARD]: 'bg-green-700',
  [REFUSED_1]: 'bg-slate-400',
  [REFUSED_2]: 'bg-slate-500',
  [REFUSED_3]: 'bg-red-400',
  [UNREACHABLE]: 'bg-red-300',
  [MISTAKEN]: 'bg-red-200',
  [TEST]: 'bg-slate-300'
};
const GROUP_DOTS: Record<StageGroup, string> = {
  open: 'bg-sky-400',
  paid: 'bg-emerald-500',
  onboard: 'bg-green-700',
  call_again: 'bg-slate-400',
  closed: 'bg-rose-300'
};

/** A stage as the screens show it: id (the code), label (its name), dot colour and group. */
export interface Stage {
  id: CRMStatus;
  label: string;
  dot: string;
  group: StageGroup;
  active: boolean;
}

export interface Stages {
  /** Every stage in kanban order, hidden ones included. */
  all: Stage[];
  /** The stages offered for a move (not hidden). */
  offered: Stage[];
  name: (code?: string | null) => string;
  group: (code?: string | null) => StageGroup;
  isOpen: (code?: string | null) => boolean;
  isClosed: (code?: string | null) => boolean;
  isCallAgain: (code?: string | null) => boolean;
}

export function stagesFrom(list: StageDef[]): Stages {
  const all: Stage[] = list.map((s) => ({
    id: s.code,
    label: s.name,
    dot: DOTS[s.code] || GROUP_DOTS[s.group] || 'bg-slate-300',
    group: s.group,
    active: s.active
  }));
  const by = new Map(all.map((s) => [s.id, s]));
  const group = (code?: string | null): StageGroup => by.get(code || POTENTIAL)?.group || 'open';
  return {
    all,
    offered: all.filter((s) => s.active),
    name: (code) => (code ? by.get(code)?.label || code : ''),
    group,
    isOpen: (code) => group(code) === 'open',
    isClosed: (code) => group(code) === 'closed',
    isCallAgain: (code) => group(code) === 'call_again'
  };
}

export const stageOf = (o: { crmStatus?: CRMStatus }): CRMStatus => o.crmStatus || POTENTIAL;

/** Why a card may not go to `next` (null: it may). */
export function blockedMove(o: { learningAccess?: boolean; crmStatus?: CRMStatus }, next: CRMStatus, name: (c: string) => string = (c) => c): string | null {
  const current = stageOf(o);
  if (next === current) return null;
  if (FROM_PAYMENTS.includes(next)) return `"${name(next)}" tự chuyển khi ghi nhận thanh toán.`;
  if (next === ONBOARD && !o.learningAccess) return `Chỉ chuyển "${name(ONBOARD)}" được học viên đã đóng phí (đủ hoặc đợt 1).`;
  if (o.learningAccess && !ENROLLED.includes(next)) return 'Học viên đã đóng phí: muốn dừng học thì hoàn tiền / kết thúc ghi danh.';
  return null;
}
