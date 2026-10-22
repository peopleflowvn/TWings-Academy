/** Display helpers for public news pages. */
import { Article } from '../types';

/** dd/mm/yyyy from the API's ISO date-time ('' when missing or unreadable). */
export function articleDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Minutes to read at about 200 words a minute (at least 1). */
export function readingMinutes(article: Pick<Article, 'content'>): number {
  const words = (article.content || '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
