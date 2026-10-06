/**
 * Site identity edited in /app → Cài đặt SEO website ('site_seo' config): favicon, logo, default title,
 * description and share image, applied to every public page at start-up.
 *
 * Limits: social networks (Facebook, Zalo) read the share card from the HTML without running scripts,
 * so for them index.html's own og: tags still apply; Google renders scripts and sees these values.
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
  if (!content) return;
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.content = content;
}

/** Only https URLs (or site-relative paths) are applied. */
const safeUrl = (url?: string) => (url && /^(https:\/\/|\/)/.test(url) ? url : '');

export async function applySiteSeo(): Promise<void> {
  const seo = await loadSiteSeo();
  if (!seo) return;
  const favicon = safeUrl(seo.faviconUrl);
  if (favicon) {
    document.head.querySelectorAll('link[rel~="icon"]').forEach((l) => l.remove());
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = favicon;
    document.head.appendChild(link);
  }
  // Pages that set their own title (programs, account...) keep it; the homepage gets the default.
  if (seo.defaultMetaTitle && window.location.pathname === '/') document.title = seo.defaultMetaTitle;
  setMeta('name', 'description', seo.defaultMetaDescription);
  setMeta('property', 'og:title', seo.defaultMetaTitle);
  setMeta('property', 'og:description', seo.defaultMetaDescription);
  setMeta('property', 'og:image', safeUrl(seo.ogImageUrl));
  setMeta('property', 'og:site_name', seo.siteName);
}

/** Uploaded header logo, or '' to keep the built-in TWings wordmark. */
export function useSiteLogo(): string {
  const [logo, setLogo] = useState('');
  useEffect(() => {
    loadSiteSeo().then((seo) => setLogo(safeUrl(seo?.logoUrl)));
  }, []);
  return logo;
}
