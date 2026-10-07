/** Journey steps 9-10: job referrals to the partner bank, partner HR links, post-placement, outcomes. */
import { api } from './api';

export type PlacementStage = 'shortlisted' | 'submitted' | 'interview' | 'offer' | 'hired' | 'rejected' | 'withdrawn';

export const STAGES: { id: PlacementStage; label: string; style: string }[] = [
  { id: 'shortlisted', label: 'Đề cử', style: 'bg-slate-100 text-slate-700 border-slate-200' },
  { id: 'submitted', label: 'Đã gửi hồ sơ', style: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'interview', label: 'Phỏng vấn', style: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'offer', label: 'Nhận offer', style: 'bg-amber-50 text-amber-800 border-amber-200' },
  { id: 'hired', label: 'Đã nhận việc', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'rejected', label: 'Không đạt', style: 'bg-red-50 text-red-700 border-red-200' },
  { id: 'withdrawn', label: 'Ứng viên rút', style: 'bg-slate-50 text-slate-500 border-slate-200' }
];
export const stageStyle = (s: PlacementStage) => STAGES.find((x) => x.id === s)?.style || '';

/** Steps a referral can move to (mirrors the server's TRANSITIONS; the server decides). */
export const NEXT: Record<PlacementStage, PlacementStage[]> = {
  shortlisted: ['submitted', 'interview', 'rejected', 'withdrawn'],
  submitted: ['interview', 'offer', 'rejected', 'withdrawn'],
  interview: ['interview', 'offer', 'rejected', 'withdrawn'],
  offer: ['hired', 'rejected', 'withdrawn'],
  hired: [],
  rejected: ['shortlisted'],
  withdrawn: ['shortlisted']
};

export interface Placement {
  id: string;
  orderId: string;
  orderCode: string;
  name: string;
  phone: string;
  email: string;
  course: string;
  positionId: string | null;
  position: string;
  employer: string;
  unit: string;
  jobTitle: string;
  stage: PlacementStage;
  stageLabel: string;
  interviewAt: string | null;
  interviewLocation: string;
  feedback: string;
  offerSalary: string;
  startDate: string | null;
  probationEnd: string | null;
  probationResult: '' | 'passed' | 'failed';
  guaranteeUntil: string | null;
  leftAt: string | null;
  leftReason: string;
  rejectionReason: string;
  staff: string;
  certificateCode: string;
  gradePercent: number | null;
  attendanceRate: number | null;
  hasCv: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Candidate {
  orderId: string;
  name: string;
  phone: string;
  email: string;
  course: string;
  cohort: string;
  graduatedAt: string;
  gradePercent: number | null;
  attendanceRate: number | null;
  hasCv: boolean;
  previous: string[];
  rereferral: boolean;
  positions: { id: string; title: string; campaign: string }[];
}

export interface PartnerShare {
  id: string;
  title: string;
  employer: string;
  allowCv: boolean;
  expiresAt: string;
  active: boolean;
  revoked: boolean;
  candidates: number;
  viewCount: number;
  lastViewedAt: string | null;
  createdBy: string;
  createdAt: string;
  url?: string;
}

interface Brief {
  id: string;
  orderId: string;
  name: string;
  employer: string;
  unit: string;
  startDate: string | null;
  probationEnd: string | null;
  guaranteeUntil: string | null;
}

export interface Outcomes {
  courses: {
    course: string;
    graduates: number;
    referred: number;
    interviewed: number;
    hired: number;
    passedProbation: number;
    working: number;
    placementRate: number;
    avgDaysToJob: number | null;
  }[];
  quotas: { campaign: string; position: string; target: number; inProcess: number; hired: number }[];
  funnel: Record<PlacementStage, number>;
  probationDue: Brief[];
  guaranteeEnding: Brief[];
  rereferral: Brief[];
}

export interface MovePayload {
  stage: PlacementStage;
  interviewAt?: string;
  interviewLocation?: string;
  startDate?: string;
  offerSalary?: string;
  reason?: string;
  note?: string;
  notify?: boolean;
}

export const placementApi = {
  list: (params: { stage?: string; order?: string; q?: string } = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString();
    return api.get<Placement[]>(`/staff/placements/${qs ? `?${qs}` : ''}`);
  },
  refer: (data: { orderId: string; positionId?: string; employer?: string; unit?: string; jobTitle?: string }) =>
    api.post<Placement>('/staff/placements/', data),
  move: (id: string, data: MovePayload) => api.post<Placement>(`/staff/placements/${id}/move/`, data),
  outcome: (id: string, data: { probationResult?: string; leftAt?: string; leftReason?: string }) =>
    api.post<Placement>(`/staff/placements/${id}/outcome/`, data),
  candidates: () => api.get<Candidate[]>('/staff/placements/candidates/'),
  outcomes: () => api.get<Outcomes>('/staff/placements/outcomes/'),
  shares: () => api.get<PartnerShare[]>('/staff/placements/shares/'),
  share: (data: { title: string; employer?: string; placementIds: string[]; allowCv: boolean; days: number }) =>
    api.post<PartnerShare>('/staff/placements/shares/', data),
  revoke: (id: string) => api.post<PartnerShare>(`/staff/placements/shares/${id}/revoke/`, {})
};

export const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('vi-VN') : '–');
export const fmtDateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '–';
