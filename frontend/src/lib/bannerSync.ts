import { HeroBannerItem } from '../types';

export const BANNERS_CACHE_KEY = 'twings_public_banners_cache';
export const BANNERS_VERSION_KEY = 'twings_banners_version';
export const BANNERS_CHANNEL_NAME = 'twings_banner_sync';
export const BANNERS_EVENT_NAME = 'twings_banners_updated';

/**
 * Reads cached banners from localStorage if available.
 */
export function getCachedBanners(): HeroBannerItem[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(BANNERS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as HeroBannerItem[]) : null;
  } catch {
    return null;
  }
}

/**
 * Saves and broadcasts updated banners instantly to all tabs/windows and storage.
 * Ensures that changes made in the admin CMS are immediately visible on the homepage.
 */
export function broadcastBannersUpdate(banners: HeroBannerItem[]): void {
  if (typeof window === 'undefined') return;

  const version = Date.now();

  try {
    localStorage.setItem(BANNERS_CACHE_KEY, JSON.stringify(banners));
    localStorage.setItem(BANNERS_VERSION_KEY, String(version));
  } catch {
    // LocalStorage might be restricted or full
  }

  // Update a sync cookie for cache bust tracking if server/proxies inspect cookies
  try {
    document.cookie = `twings_banners_v=${version}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    // Cookies disabled
  }

  // Broadcast to other open browser tabs/windows
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(BANNERS_CHANNEL_NAME);
      channel.postMessage({ type: 'BANNERS_UPDATED', banners, version });
      channel.close();
    }
  } catch {
    // BroadcastChannel unsupported
  }

  // Dispatch custom event in the current window
  try {
    window.dispatchEvent(
      new CustomEvent(BANNERS_EVENT_NAME, {
        detail: { banners, version }
      })
    );
  } catch {
    // Fallback
  }
}

/**
 * Clears old cache/cookies and re-syncs fresh banners.
 */
export function clearBannersCache(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(BANNERS_CACHE_KEY);
    localStorage.removeItem(BANNERS_VERSION_KEY);
  } catch {
    // Ignore
  }

  try {
    // Expire legacy or temporary sync cookies
    document.cookie = 'twings_banners_v=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    document.cookie = `twings_banners_bust=${Date.now()}; path=/; max-age=60; SameSite=Lax`;
  } catch {
    // Ignore
  }
}

/**
 * Subscribes to real-time banner update events across tabs and local windows.
 * Returns an unsubscribe cleanup function.
 */
export function subscribeBannersUpdate(callback: (banners: HeroBannerItem[]) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  // 1. BroadcastChannel listener (cross-tab real-time sync)
  let channel: BroadcastChannel | null = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(BANNERS_CHANNEL_NAME);
      channel.onmessage = (event) => {
        if (event.data?.type === 'BANNERS_UPDATED' && Array.isArray(event.data.banners)) {
          callback(event.data.banners);
        }
      };
    }
  } catch {
    channel = null;
  }

  // 2. Storage event listener (fallback for cross-tab if BroadcastChannel is blocked)
  const onStorage = (e: StorageEvent) => {
    if (e.key === BANNERS_CACHE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (Array.isArray(parsed)) callback(parsed);
      } catch {
        // Ignore JSON parse errors
      }
    }
  };
  window.addEventListener('storage', onStorage);

  // 3. Custom event listener (within same window/SPA transitions)
  const onCustomEvent = (e: Event) => {
    const ce = e as CustomEvent<{ banners: HeroBannerItem[] }>;
    if (ce.detail?.banners && Array.isArray(ce.detail.banners)) {
      callback(ce.detail.banners);
    }
  };
  window.addEventListener(BANNERS_EVENT_NAME, onCustomEvent);

  return () => {
    if (channel) {
      try {
        channel.close();
      } catch {
        // Ignore
      }
    }
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(BANNERS_EVENT_NAME, onCustomEvent);
  };
}
