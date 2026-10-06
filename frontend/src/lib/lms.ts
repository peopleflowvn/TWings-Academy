/**
 * CMS (/app) access to the Moodle LMS through the Django API (/api/v1/staff/lms/...).
 * Moodle itself is served at /learn on the same origin, so its links are relative.
 */
import { createContext, useContext } from 'react';
import { api } from './api';
import { AdminUser } from '../types';
import { checkUserHasPermission } from '../utils/rbac';

export interface MoodleLinks {
  home?: string;
  course?: string;
  participants?: string;
  grades?: string;
  completion?: string;
  profile?: string;
  userCourse?: string;
}

export interface LmsCourseProgress {
  id: number;
  fullname: string;
  shortname: string;
  progress: number | null;
  completed: boolean;
  lastaccess: number | null;
  grade: string | null;
  links: MoodleLinks;
}

export interface OrderLearning {
  orderId: string;
  paid: boolean;
  email: string;
  enrollment: {
    status: 'pending' | 'waiting' | 'done' | 'failed' | 'skipped' | 'removed';
    statusLabel: string;
    lastError: string;
    attempts: number;
    moodleUserId: number | null;
    moodleCourseId: number | null;
    enrolledAt: string | null;
    accessEmailedAt: string | null;
    cohortName: string;
    progress: number | null;
    completedAt: string | null;
    certificate: { code: string; url: string; revoked: boolean } | null;
  } | null;
  user: {
    id: number;
    fullname: string;
    email: string;
    suspended: boolean;
    firstaccess: number | null;
    lastaccess: number | null;
    links: MoodleLinks;
  } | null;
  courses: LmsCourseProgress[];
}

export interface MoodleCourseRef {
  id: number;
  fullname: string;
  visible: boolean;
  students: number;
  links: MoodleLinks;
}

export interface LmsIntakeRow {
  id: string;
  name: string;
  status: string;
  startDate: string | null;
  capacity: number;
  paidOrders: number;
  moodle: MoodleCourseRef | null;
}

export interface LmsCatalogRow {
  courseId: string;
  title: string;
  slug: string;
  paidOrders: number;
  waitingForIntake: number;
  /** The course's template Moodle course (also where self-paced learners study). */
  moodle: MoodleCourseRef | null;
  cohorts: LmsIntakeRow[];
}

export interface LmsLearner {
  moodleUserId: number;
  fullname: string;
  email: string;
  suspended: boolean;
  progress: number | null;
  completed: boolean;
  lastCourseAccess: number | null;
  inactive: boolean;
  order: { id: string; orderCode: string; phone: string; crmStatus: string } | null;
  links: MoodleLinks;
}

export type LmsAction = 'enroll' | 'unenroll' | 'suspend' | 'unsuspend' | 'send_access_email';

export const lmsApi = {
  order: (orderId: string) => api.get<OrderLearning>(`/staff/lms/orders/${orderId}/`),
  act: (orderId: string, action: LmsAction) =>
    api.post<OrderLearning>(`/staff/lms/orders/${orderId}/actions/`, { action }),
  catalog: () => api.get<LmsCatalogRow[]>('/staff/lms/courses/'),
  learners: (moodleCourseId: number) => api.get<LmsLearner[]>(`/staff/lms/courses/${moodleCourseId}/learners/`),
  provisionCohort: (cohortId: string) =>
    api.post<{ moodleCourseId: number; teachers: number; enrolled: number }>(`/staff/lms/cohorts/${cohortId}/provision/`, {}),
  prepareStaffAccess: () => api.post<{ moodleUserId: number; manager: boolean }>('/staff/lms/open/', {}),
};

/**
 * Open a Moodle page in a new tab. The tab is opened synchronously (popup blockers), then pointed at
 * Moodle once the staff member's Moodle account/role is ready. Moodle asks them to sign in once with
 * "Đăng nhập bằng TWings", which reuses the CMS session.
 */
export async function openInMoodle(path: string = '/learn/my/'): Promise<void> {
  const tab = window.open('about:blank', '_blank');
  try {
    await lmsApi.prepareStaffAccess();
  } finally {
    if (tab) {
      tab.opener = null;
      tab.location.href = path;
    } else {
      window.location.href = path;
    }
  }
}

export function formatMoodleTime(ts: number | null): string {
  if (!ts) return 'Chưa truy cập';
  const days = Math.floor((Date.now() / 1000 - ts) / 86400);
  const date = new Date(ts * 1000).toLocaleDateString('vi-VN');
  return days <= 0 ? `Hôm nay (${date})` : `${days} ngày trước (${date})`;
}

/** The signed-in CMS user (live mode), so deep components can check permissions. */
export const StaffUserContext = createContext<AdminUser | undefined>(undefined);

export function useStaffCan(code: string): boolean {
  const user = useContext(StaffUserContext);
  if (!user) return false;
  if (user.permissions?.length) return user.role === 'super_admin' || user.permissions.includes(code);
  return checkUserHasPermission(user, code);
}
