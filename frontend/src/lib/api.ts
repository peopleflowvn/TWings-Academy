/**
 * Thin client for the TWings Django API.
 *
 * Security model: the browser never holds secrets. Authentication uses the Django session cookie
 * (HttpOnly, Secure, SameSite) and every unsafe request carries the CSRF token obtained from
 * /auth/csrf/. VITE_API_BASE_URL is a public URL, not a secret.
 *
 * VITE_API_BASE_URL="same-origin" (production): the API is reached at /api on whichever host serves
 * the site, so every published domain works without CORS and the session cookie stays first-party.
 * When VITE_API_BASE_URL is empty (local UI-only development), callers fall back to the bundled
 * demo data and sandbox simulators.
 */

const RAW_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '';
const SAME_ORIGIN = RAW_BASE === 'same-origin';
export const API_BASE_URL = SAME_ORIGIN ? '' : RAW_BASE.replace(/\/+$/, '');
export const API_ROOT = SAME_ORIGIN ? '/api/v1' : API_BASE_URL ? `${API_BASE_URL}/api/v1` : '';

export const isBackendEnabled = (): boolean => API_ROOT !== '';

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Fired on window whenever the API answers 401 (session missing or expired). */
export const SESSION_EXPIRED_EVENT = 'twings:session-expired';

let csrfToken: string | null = null;

async function ensureCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  const res = await fetch(`${API_ROOT}/auth/csrf/`, { credentials: 'include' });
  if (!res.ok) throw new ApiError(res.status, 'Không lấy được CSRF token');
  const data = (await res.json()) as { csrfToken: string };
  csrfToken = data.csrfToken;
  return csrfToken;
}

/** Drop the cached CSRF token (Django rotates it on login/logout). */
export function resetCsrfToken(): void {
  csrfToken = null;
}

/** DRF validation errors come as {field: [messages]}; surface the first one instead of a bare status. */
function fieldErrorMessage(body: unknown): string {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return '';
  for (const [field, value] of Object.entries(body as Record<string, unknown>)) {
    const msg = Array.isArray(value) ? value[0] : value;
    if (typeof msg === 'string' && msg) return field === 'nonFieldErrors' ? msg : `${field}: ${msg}`;
  }
  return '';
}

const UNSAFE_METHODS =new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!isBackendEnabled()) {
    throw new ApiError(0, 'Backend API chưa được cấu hình (VITE_API_BASE_URL).');
  }
  const method = (init.method || 'GET').toUpperCase();
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (UNSAFE_METHODS.has(method)) {
    headers.set('X-CSRFToken', await ensureCsrfToken());
  }

  const res = await fetch(`${API_ROOT}${path}`, { ...init, method, headers, credentials: 'include' });
  if (res.status === 204) return undefined as T;

  const isJson = (res.headers.get('Content-Type') || '').includes('application/json');
  const body = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    if (res.status === 403) resetCsrfToken();
    // No (or an expired) session: let the login gate take over instead of every screen showing toasts.
    if (res.status === 401 && typeof window !== 'undefined') window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    const detail =
      (isJson && body && typeof body === 'object' && 'detail' in body && String((body as { detail: unknown }).detail)) ||
      (isJson && fieldErrorMessage(body)) ||
      `Lỗi máy chủ (${res.status})`;
    throw new ApiError(res.status, detail, body);
  }
  return body as T;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, data?: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: data === undefined ? undefined : JSON.stringify(data) }),
  patch: <T>(path: string, data: unknown) => apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(data) }),
  put: <T>(path: string, data: unknown) => apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(data) }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
