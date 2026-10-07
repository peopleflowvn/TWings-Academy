/**
 * Site identity and per-page metadata for the public site.
 *
 * - applySiteSeo(): favicon from /app → Cài đặt SEO website ('site_seo' config), once at start-up.
 * - applyPageMeta(path): title, description, canonical, robots and share tags of the current page,
 *   from /api/v1/public/seo/ (the same data the server renders for Facebook / Zalo / search bots, which
 *   never run this code; see backend/apps/cms/seo.py).
 */
import { useEffect, useState } from 'react';
import { api, isBackendEnabled } from './api';
import { SiteSEOSettings } from '../types';

let cached: Promise<Partial<SiteSEOSettings> | null> | null = null;

export function loadSiteSeo(): Promise<Partial<SiteSEOSettings> | null> {
  if (!isBackendEnabled()) return Promise.resolve(null);
  cached ??= api
    .get<{ data: Partial<SiteSEOSettings> }>('/public/site-config/site_seo/')
    .then((res) => res.data || null)
    .catch(() => null);
  return cached;
}

function setMeta(attr: 'name' | 'property', key: string, content?: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!content) {
    tag?.remove();
    return;
  }
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.content = content;
}

function setLink(rel: string, href: string) {
  let link = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!link) {
    link = document.createElement('link');
    link.rel = rel;
    document.head.appendChild(link);
  }
  link.href = href;
}

/** Only https URLs (or site-relative paths) are applied. */
const safeUrl = (url?: string) => (url && /^(https:\/\/|\/)/.test(url) ? url : '');

export async function applySiteSeo(): Promise<void> {
  const seo = await loadSiteSeo();
  const favicon = safeUrl(seo?.faviconUrl);
  if (!favicon) return;
  document.head.querySelectorAll('link[rel~="icon"]').forEach((l) => l.remove());
  setLink('icon', favicon);
}

interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  image: string;
  type: string;
  noindex: boolean;
  siteName: string;
}

let latest = '';

export async function applyPageMeta(path: string, fallbackTitle?: string): Promise<void> {
  if (fallbackTitle) {
    document.title = fallbackTitle;
  }
  if (!isBackendEnabled()) return;
  latest = path;
  let meta: PageMeta;
  try {
    meta = await api.get<PageMeta>(`/public/seo/?path=${encodeURIComponent(path)}`);
  } catch {
    return; // unknown page: keep what is there
  }
  if (latest !== path) return; // the visitor already moved on
  document.title = meta.title;
  setMeta('name', 'description', meta.description);
  setMeta('name', 'robots', meta.noindex ? 'noindex' : '');
  setLink('canonical', meta.canonical);
  setMeta('property', 'og:title', meta.title);
  setMeta('property', 'og:description', meta.description);
  setMeta('property', 'og:url', meta.canonical);
  setMeta('property', 'og:type', meta.type);
  setMeta('property', 'og:image', safeUrl(meta.image));
  setMeta('property', 'og:site_name', meta.siteName);
}

/** The SEO settings document (contact details, channels...), or null while loading / offline. */
export function useSiteSeo(): Partial<SiteSEOSettings> | null {
  const [seo, setSeo] = useState<Partial<SiteSEOSettings> | null>(null);
  useEffect(() => {
    loadSiteSeo().then(setSeo);
  }, []);
  return seo;
}

/** Digits of a phone number ("0843 314 382 (Ms. Hường)" -> "0843314382"). */
export const phoneDigits = (text?: string) => (text || '').replace(/\(.*?\)/g, '').replace(/[^\d+]/g, '');

/** zalo.me link from a phone number or an existing Zalo link. */
export function zaloLink(value?: string): string {
  if (!value) return '';
  if (/^https:\/\/(zalo\.me|oa\.zalo\.me)\//.test(value)) return value;
  const digits = phoneDigits(value);
  return digits ? `https://zalo.me/${digits}` : '';
}

export { safeUrl };

/** Uploaded header logo, or '' to keep the built-in TWings wordmark. */
export function useSiteLogo(): string {
  const [logo, setLogo] = useState('');
  useEffect(() => {
    loadSiteSeo().then((seo) => setLogo(safeUrl(seo?.logoUrl)));
  }, []);
  return logo;
}
