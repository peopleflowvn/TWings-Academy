/**
 * Site search: what a Vietnamese visitor types finds the course.
 *  - accents and case do not matter ("tin dung" = "Tín dụng", đ = d);
 *  - banking shorthand is understood ("QHKH", "KHDN", "RM", "SME", "BCTC"…);
 *  - a word being typed matches the start of a word ("doanh ngh");
 *  - one typo in a longer word is forgiven ("tham dinhh");
 *  - every word must match; title matches rank first.
 */

import type { Course } from '../types';

/** Lower case without Vietnamese accents. */
export const fold = (text: string) =>
  (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

const words = (text: string) => fold(text).split(/[^a-z0-9]+/).filter(Boolean);

/** Shorthand used in Vietnamese banking, folded. A query word may stand for a phrase. */
const SHORTHAND: Record<string, string[]> = {
  qhkh: ['quan he khach hang'],
  rm: ['quan he khach hang', 'relationship manager'],
  cbqhkh: ['quan he khach hang'],
  khcn: ['khach hang ca nhan', 'ca nhan'],
  khdn: ['khach hang doanh nghiep', 'doanh nghiep'],
  kh: ['khach hang'],
  dn: ['doanh nghiep'],
  sme: ['doanh nghiep', 'sme'],
  td: ['tin dung'],
  tdtd: ['tham dinh tin dung'],
  gdv: ['giao dich vien'],
  bctc: ['bao cao tai chinh'],
  nh: ['ngan hang'],
  nhtm: ['ngan hang thuong mai'],
  ai: ['tri tue nhan tao', 'ai'],
  retail: ['ca nhan', 'retail'],
  corporate: ['doanh nghiep', 'corporate'],
  fresher: ['moi', 'fresher'],
  online: ['online', 'truc tuyen'],
  offline: ['truc tiep', 'offline']
};

function editDistanceAtMostOne(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/** One query word against one field: 3 exact word, 2 word start / phrase, 1 typo, 0 none. */
function wordScore(term: string, fieldWords: string[], fieldText: string): number {
  const options = SHORTHAND[term] || [];
  if (fieldWords.includes(term)) return 3;
  if (options.some((phrase) => fieldText.includes(phrase))) return 3;
  if (fieldWords.some((w) => w.startsWith(term))) return 2;
  if (term.length >= 5 && fieldWords.some((w) => w.length >= 4 && editDistanceAtMostOne(term, w))) return 1;
  return 0;
}

export interface SearchField {
  text: string | undefined | null;
  /** Title 3, summary 2, other 1. */
  weight: number;
}

/**
 * Relevance of a record for a query (0 = not a match). Every query word must be found in some field.
 */
export function relevance(query: string, fields: SearchField[]): number {
  const terms = words(query);
  if (!terms.length) return 1;
  const prepared = fields
    .filter((f) => f.text)
    .map((f) => ({ weight: f.weight, text: ` ${words(f.text!).join(' ')} `, list: words(f.text!) }));
  let total = 0;
  for (const term of terms) {
    let best = 0;
    for (const f of prepared) best = Math.max(best, wordScore(term, f.list, f.text) * f.weight);
    if (!best) return 0;
    total += best;
  }
  // The whole query as a phrase in the title ranks first.
  const phrase = words(query).join(' ');
  if (prepared.some((f) => f.weight >= 3 && f.text.includes(` ${phrase}`))) total += 10;
  return total;
}

/** Records matching the query, best first (stable for equal scores). */
export function rank<T>(items: T[], query: string, fieldsOf: (item: T) => SearchField[]): T[] {
  if (!words(query).length) return items;
  return items
    .map((item, i) => ({ item, i, score: relevance(query, fieldsOf(item)) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map((r) => r.item);
}

/** What a course is found by: title first, then subtitle and skills, then the rest. */
export const courseFields = (c: Course): SearchField[] => [
  { text: c.title, weight: 3 },
  { text: c.subtitle, weight: 2 },
  { text: (c.skills || []).join(' '), weight: 2 },
  { text: [c.level, c.category, c.careerRole, c.partner?.name, c.locationText].filter(Boolean).join(' '), weight: 1 },
  { text: [c.overview, c.description, ...(c.learningObjectives || []), ...(c.objectives || [])].filter(Boolean).join(' '), weight: 1 },
  {
    text: c.deliveryFormat === 'offline' ? 'truc tiep offline' : c.deliveryFormat === 'hybrid' ? 'ket hop hybrid' : c.deliveryFormat ? 'online truc tuyen' : '',
    weight: 1
  }
];
