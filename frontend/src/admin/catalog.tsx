/**
 * The catalogue as staff screens pick from it: courses and programs (gói khóa), with what may be
 * chosen where. One source for every course picker of the staff app:
 *   'sellable' new registrations (lead, "register for another course", registration course change):
 *              courses on sale (published) and published programs
 *   'active'   planning (campaign courses, intakes, program composition): everything not archived,
 *              drafts labelled
 *   'all'      filters over existing data (pipeline, campaign list): everything, archived labelled
 */
import React from 'react';
import { Course } from '../types';

export interface ProgramOption {
  id: string;
  title: string;
  isPublished: boolean;
}

export type CatalogScope = 'sellable' | 'active' | 'all';

const COURSE_STATUS: Record<string, string> = {
  draft: 'nháp',
  review: 'chờ duyệt',
  published: '',
  archived: 'đã lưu trữ'
};

export interface CatalogItem {
  /** "c:<id>" for a course, "p:<id>" for a program (one select can hold both). */
  value: string;
  kind: 'course' | 'program';
  id: string;
  title: string;
  /** Shown after the title when the item is not on sale ("nháp", "đã lưu trữ"…). */
  note: string;
}

export function catalogItems(
  courses: Course[],
  programs: ProgramOption[],
  scope: CatalogScope,
  { withPrograms = true }: { withPrograms?: boolean } = {}
): CatalogItem[] {
  const status = (c: Course) => c.status || 'draft';
  const keepCourse = (c: Course) =>
    scope === 'all' || (scope === 'active' ? status(c) !== 'archived' : status(c) === 'published');
  const items: CatalogItem[] = courses
    .filter(keepCourse)
    .map((c) => ({ value: `c:${c.id}`, kind: 'course' as const, id: c.id, title: c.title, note: COURSE_STATUS[status(c)] || '' }))
    .sort((a, b) => a.title.localeCompare(b.title, 'vi'));
  if (withPrograms) {
    items.push(
      ...programs
        .filter((p) => scope !== 'sellable' || p.isPublished)
        .map((p) => ({ value: `p:${p.id}`, kind: 'program' as const, id: p.id, title: p.title, note: p.isPublished ? '' : 'chưa mở bán' }))
        .sort((a, b) => a.title.localeCompare(b.title, 'vi'))
    );
  }
  return items;
}

/** The select value of a registration (its course, else its program). */
export const itemValue = (o: { courseId?: string | null; programId?: string | null }) =>
  o.courseId ? `c:${o.courseId}` : o.programId ? `p:${o.programId}` : '';

/** "c:<id>" / "p:<id>" -> the fields a registration takes. */
export function itemFields(value: string): { courseId: string | null; programId: string | null } {
  if (value.startsWith('p:')) return { courseId: null, programId: value.slice(2) };
  if (value.startsWith('c:')) return { courseId: value.slice(2), programId: null };
  return { courseId: null, programId: null };
}

/** <option>s grouped into courses and programs; `current` keeps a value no longer in the list. */
export const CatalogOptions: React.FC<{ items: CatalogItem[]; current?: { value: string; title: string } }> = ({ items, current }) => {
  const courses = items.filter((i) => i.kind === 'course');
  const programs = items.filter((i) => i.kind === 'program');
  const label = (i: CatalogItem) => (i.note ? `${i.title} (${i.note})` : i.title);
  const missing = current && current.value && !items.some((i) => i.value === current.value);
  return (
    <>
      {missing && <option value={current.value}>{current.title} (không còn mở bán)</option>}
      {courses.length > 0 && (
        <optgroup label="Khóa học">
          {courses.map((i) => <option key={i.value} value={i.value}>{label(i)}</option>)}
        </optgroup>
      )}
      {programs.length > 0 && (
        <optgroup label="Chương trình (gói khóa)">
          {programs.map((i) => <option key={i.value} value={i.value}>{label(i)}</option>)}
        </optgroup>
      )}
    </>
  );
};
