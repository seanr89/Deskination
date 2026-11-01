import { getCurrentIdToken } from './authService';

export interface ApiRequestOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
  requireAuth?: boolean;
  forceTokenRefresh?: boolean;
}

const DEFAULT_API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() ||
  import.meta.env.VITE_BOOKING_API_URL?.trim() ||
  'http://localhost:8080';

/**
 * Builds standard HTTP headers including the Firebase Authentication Bearer JWT
 * when a user is signed in.
 */
export async function buildAuthHeaders(
  customHeaders: Record<string, string> = {},
  forceTokenRefresh = false
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  const token = await getCurrentIdToken(forceTokenRefresh);
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Executes an HTTP request against the Deskination booking-api service,
 * automatically injecting the Firebase Auth ID token in the Authorization header.
 */
export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const {
    headers: customHeaders = {},
    requireAuth = false,
    forceTokenRefresh = false,
    ...fetchOptions
  } = options;

  const headers = await buildAuthHeaders(customHeaders, forceTokenRefresh);

  if (requireAuth && !headers.Authorization) {
    throw new Error('Authentication required: No active Firebase ID token available.');
  }

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${DEFAULT_API_BASE_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(
      `API Error (${response.status} ${response.statusText})${errorBody ? `: ${errorBody}` : ''}`
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
