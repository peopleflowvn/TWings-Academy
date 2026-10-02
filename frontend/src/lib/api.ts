/**
 * Thin client for the TWings Django API.
 *
 * Security model: the browser never holds secrets. Authentication uses the Django session cookie
 * (HttpOnly, Secure, SameSite) and every unsafe request carries the CSRF token obtained from
 * /auth/csrf/. VITE_API_BASE_URL is a public URL, not a secret.
 *
 * When VITE_API_BASE_URL is empty (local UI-only development), callers fall back to the bundled
 * demo data and sandbox simulators.
 */

const RAW_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '';
export const API_BASE_URL = RAW_BASE.replace(/\/+$/, '');
export const API_ROOT = API_BASE_URL ? `${API_BASE_URL}/api/v1` : '';

export const isBackendEnabled = (): boolean => API_ROOT !== '';

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

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

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

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
    const detail =
      (isJson && body && typeof body === 'object' && 'detail' in body && String((body as { detail: unknown }).detail)) ||
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
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
