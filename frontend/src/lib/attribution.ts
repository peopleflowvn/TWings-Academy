/**
 * Where visitors come from (journey step 3), first-party and cookie-less:
 *
 * - captureAttribution(): on landing, keep the first and the latest marketing touch (utm_*, ?ref=,
 *   referrer from another site, landing page) in this browser's localStorage for 90 days. Sent only with
 *   a form the visitor submits (registration / checkout), so the lead knows its campaign.
 * - trackView(path): +1 on an anonymous daily counter per page and channel (no id, no cookie).
 */
import { api, isBackendEnabled } from './api';

const KEY = 'tw_attr';
const TTL_MS = 90 * 24 * 3600 * 1000;

export interface Touch {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  ref?: string;
  referrer?: string;
  landing?: string;
  at?: string;
}
export interface Attribution {
  first?: Touch;
  last?: Touch;
}

function read(): Attribution {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const data = JSON.parse(raw) as Attribution & { savedAt?: number };
    if (!data.savedAt || Date.now() - data.savedAt > TTL_MS) return {};
    return { first: data.first, last: data.last };
  } catch {
    return {};
  }
}

function currentTouch(): Touch | null {
  const params = new URLSearchParams(window.location.search);
  const touch: Touch = {};
  (['source', 'medium', 'campaign', 'content', 'term'] as const).forEach((k) => {
    const v = params.get(`utm_${k}`);
    if (v) touch[k] = v.slice(0, 200);
  });
  const ref = params.get('ref');
  if (ref) touch.ref = ref.slice(0, 50);
  let external = '';
  try {
    if (document.referrer && new URL(document.referrer).host !== window.location.host) external = document.referrer;
  } catch {
    external = '';
  }
  if (!Object.keys(touch).length && !external) return null; // internal navigation or direct revisit
  if (external) touch.referrer = external.slice(0, 200);
  touch.landing = window.location.pathname.slice(0, 200);
  touch.at = new Date().toISOString();
  return touch;
}

export function captureAttribution(): void {
  const touch = currentTouch();
  if (!touch) return;
  const data = read();
  try {
    localStorage.setItem(KEY, JSON.stringify({ first: data.first || touch, last: touch, savedAt: Date.now() }));
  } catch {
    // storage blocked (private mode): attribution is optional
  }
}

export function getAttribution(): Attribution | undefined {
  const data = read();
  return data.first || data.last ? data : undefined;
}

/** Channel key for the view counter: utm_source, else the referring site family, else direct. */
function channel(): string {
  const last = read().last;
  const touch = currentTouch() || last;
  if (touch?.source) return touch.source.toLowerCase();
  const host = (() => {
    try {
      return touch?.referrer ? new URL(touch.referrer).hostname.replace(/^www\./, '') : '';
    } catch {
      return '';
    }
  })();
  if (!host) return 'direct';
  const families: [RegExp, string][] = [
    [/(^|\.)facebook\.com$|(^|\.)fb\.com$/, 'facebook'],
    [/(^|\.)zalo\.me$/, 'zalo'],
    [/(^|\.)google\./, 'google'],
    [/(^|\.)coccoc\.com$/, 'coccoc'],
    [/(^|\.)bing\.com$/, 'bing'],
    [/(^|\.)youtube\.com$/, 'youtube'],
    [/(^|\.)tiktok\.com$/, 'tiktok'],
    [/(^|\.)linkedin\.com$/, 'linkedin'],
    [/(^|\.)instagram\.com$/, 'instagram']
  ];
  return families.find(([re]) => re.test(host))?.[1] || 'other';
}

let lastTracked = '';
export function trackView(path: string): void {
  if (!isBackendEnabled() || navigator.webdriver || path === lastTracked) return;
  lastTracked = path;
  api.post('/public/track/', { path, source: channel() }).catch(() => undefined);
}
