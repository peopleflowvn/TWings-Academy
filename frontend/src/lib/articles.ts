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

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function inlineMarkdown(text: string): string {
  return escapeHtml(text)
    .replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/|#|mailto:|tel:)[^)\s]*)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>');
}

/**
 * An older article written as Markdown / plain text (one paragraph per line) -> the HTML the rich text editor
 * works on, so its lines, headings, lists and quotes stay as they were shown on the site.
 */
export function markdownToHtml(content: string): string {
  const out: string[] = [];
  let list: { tag: 'ul' | 'ol'; items: string[] } | null = null;
  const flush = () => {
    if (list) out.push(`<${list.tag}>${list.items.map((i) => `<li><p>${i}</p></li>`).join('')}</${list.tag}>`);
    list = null;
  };
  for (const raw of (content || '').replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    const numbered = line.match(/^\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      const tag = bullet ? 'ul' : 'ol';
      if (!list || list.tag !== tag) {
        flush();
        list = { tag, items: [] };
      }
      list.items.push(inlineMarkdown((bullet || numbered)![1]));
      continue;
    }
    flush();
    if (!line) continue;
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      const level = Math.min(Math.max(heading[1].length, 2), 4);
      out.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
    } else if (line.startsWith('>')) {
      out.push(`<blockquote><p>${inlineMarkdown(line.replace(/^>\s*/, ''))}</p></blockquote>`);
    } else if (/^(-{3,}|\*{3,})$/.test(line)) {
      out.push('<hr>');
    } else {
      out.push(`<p>${inlineMarkdown(line)}</p>`);
    }
  }
  flush();
  return out.join('');
}
