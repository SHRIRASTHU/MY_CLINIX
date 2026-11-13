function normalizeApiBaseUrl(raw?: string): string {
  if (!raw || !raw.trim()) {
    return '/api/v1';
  }
  let cleaned = raw.trim();
  // Strip trailing slashes
  while (cleaned.endsWith('/')) {
    cleaned = cleaned.slice(0, -1);
  }
  // If the user specified host without /api/v1, append it automatically
  if (!cleaned.endsWith('/api/v1')) {
    cleaned = `${cleaned}/api/v1`;
  }
  return cleaned;
}

export const API_BASE = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('myclinix_token');
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${cleanEndpoint}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (netErr: any) {
    throw new ApiError(
      0,
      `Cannot connect to backend server at ${url}. Please verify Render service is running.`,
      netErr
    );
  }

  if (response.status === 204) {
    return {} as T;
  }

  let data: any;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = await response.text();
    }
  } else {
    data = await response.text();
  }

  // Detect accidental SPA HTML fallthrough (e.g. Vercel rewriting /api requests to index.html)
  if (typeof data === 'string' && data.trim().toLowerCase().startsWith('<!doctype html')) {
    throw new ApiError(
      502,
      'Received an HTML response instead of JSON. Ensure VITE_API_BASE_URL is configured on Vercel to point to your live Render backend URL (e.g. https://your-backend.onrender.com/api/v1).',
      data
    );
  }

  if (!response.ok) {
    if (response.status === 401) {
      // Clear token if expired/unauthorized
      localStorage.removeItem('myclinix_token');
      localStorage.removeItem('myclinix_user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }

    let message = response.statusText || 'Request failed';
    if (typeof data === 'object' && data !== null) {
      if (typeof data.detail === 'string') {
        message = data.detail;
      } else if (Array.isArray(data.detail)) {
        message = data.detail.map((errItem: any) => errItem.msg || JSON.stringify(errItem)).join(', ');
      }
    }

    throw new ApiError(response.status, message, data);
  }

  return data as T;
}
