/**
 * The option lists (danh mục) — sources, interest levels, provinces, schools, MSB units, course categories… —
 * one set for every /app form, kept in the database and edited in /app → Hệ thống → Danh mục (apps/crm/lists.py,
 * GET /staff/crm/lists/), loaded once per page. The short lists below are used until it answers (or when it
 * cannot).
 */
import { useEffect, useState } from 'react';
import { api } from './api';

export interface CrmLists {
  sources: string[];
  interestLevels: string[];
  genders: string[];
  educationLevels: string[];
  provinces: string[];
  lostReasons: string[];
  trainingStatuses: string[];
  universities: string[];
  msbUnits: string[];
  courseCategories: string[];
  courseLevels: string[];
  pics: string[];
}

export const DEFAULT_LISTS: CrmLists = {
  sources: ['Website', 'Facebook ads', 'Zalo', 'TikTok', 'Giới thiệu nội bộ (GTNB)', 'TNEX', 'Email marketing', 'SMS marketing', 'Hotline', 'Hội thảo / Roadshow', 'Sự kiện', 'Học viên cũ quay lại', 'Nhập tay'],
  interestLevels: ['Cao', 'Trung bình', 'Thấp'],
  genders: ['Nam', 'Nữ', 'Khác'],
  educationLevels: ['Trung cấp', 'Cao đẳng', 'Đại học', 'Cao học', 'Khác'],
  provinces: ['Hà Nội', 'TP. Hồ Chí Minh'],
  lostReasons: ['Không có nhu cầu', 'Học phí cao', 'Chưa sắp xếp được thời gian', 'Ở xa / khu vực chưa mở lớp', 'Đã học / chọn nơi khác', 'Không liên lạc được', 'Khóa học chưa phù hợp nhu cầu', 'Đăng ký trùng / nhầm'],
  trainingStatuses: ['Chưa khai giảng', 'Đang học', 'Chờ xét tốt nghiệp', 'Hoàn thành', 'Không đạt', 'Bảo lưu', 'Dừng chương trình'],
  universities: [],
  msbUnits: [],
  courseCategories: [],
  courseLevels: [],
  pics: []
};

let loading: Promise<CrmLists> | null = null;

/** After a list was edited: the next form opened reads the lists again. */
export function reloadCrmLists() {
  loading = null;
}

export function useCrmLists(): CrmLists {
  const [lists, setLists] = useState<CrmLists>(DEFAULT_LISTS);
  useEffect(() => {
    let live = true;
    loading ??= api.get<CrmLists>('/staff/crm/lists/').catch(() => {
      loading = null; // try again next time
      return DEFAULT_LISTS;
    });
    loading.then((value) => live && setLists({ ...DEFAULT_LISTS, ...value }));
    return () => {
      live = false;
    };
  }, []);
  return lists;
}

export interface PublicLists {
  provinces: string[];
  educationLevels: string[];
  genders: string[];
  universities: string[];
}

let loadingPublic: Promise<PublicLists> | null = null;

/** The lists the website's forms offer (registration, the learner's enrolment file): GET /public/lists/. */
export function usePublicLists(): PublicLists {
  const fallback: PublicLists = {
    provinces: DEFAULT_LISTS.provinces,
    educationLevels: DEFAULT_LISTS.educationLevels,
    genders: DEFAULT_LISTS.genders,
    universities: []
  };
  const [lists, setLists] = useState<PublicLists>(fallback);
  useEffect(() => {
    let live = true;
    loadingPublic ??= api.get<PublicLists>('/public/lists/').catch(() => {
      loadingPublic = null;
      return fallback;
    });
    loadingPublic.then((value) => live && setLists({ ...fallback, ...value }));
    return () => {
      live = false;
    };
  }, []);
  return lists;
}

/** A select's options: the list, plus the stored value when it is not in it (older data stays visible). */
export const withCurrent = (list: string[], current?: string | null): string[] =>
  current && !list.includes(current) ? [...list, current] : list;
