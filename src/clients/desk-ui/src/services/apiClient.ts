import { getCurrentIdToken } from './authService';
import type {
  Booking,
  BookingStatus,
  Desk,
  DeskAllocationType,
  DeskPosition,
  DeskType,
  Floor,
  FloorElement,
  Location,
  Role,
  SlotAvailability,
  SlotType,
  User,
  UserStats,
} from '../types/deskBooking';

export interface ApiRequestOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
  requireAuth?: boolean;
  forceTokenRefresh?: boolean;
}

export interface BookingActionApiResponse {
  success: boolean;
  message: string;
  booking?: Booking;
}

export interface WorkspaceSnapshotApiResponse {
  users: User[];
  locations: Location[];
  desks: Desk[];
  bookings: Booking[];
}

const DEFAULT_API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() ||
  import.meta.env.VITE_BOOKING_API_URL?.trim() ||
  'http://localhost:8080';

function buildQueryString(params?: Record<string, string | undefined>): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      searchParams.set(key, value);
    }
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

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

// --- Users Endpoints (/api/users) ---

export function fetchUsers(params?: {
  search?: string;
  department?: string;
  role?: Role;
}): Promise<User[]> {
  return apiRequest<User[]>(`/api/users${buildQueryString(params)}`);
}

export function fetchCurrentUser(): Promise<User> {
  return apiRequest<User>('/api/users/me');
}

export function upsertCurrentUser(payload: {
  id?: string;
  name: string;
  email: string;
  department?: string;
  jobTitle?: string;
  avatarColor?: string;
  role?: Role;
}): Promise<User> {
  return apiRequest<User>('/api/users/me', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function createUserApi(payload: {
  id?: string;
  name: string;
  email: string;
  role?: Role;
  department?: string;
  jobTitle?: string;
  avatarColor?: string;
}): Promise<User> {
  return apiRequest<User>('/api/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchUserById(id: string): Promise<User> {
  return apiRequest<User>(`/api/users/${encodeURIComponent(id)}`);
}

export function fetchUserStats(
  id: string,
  params?: { referenceDate?: string; month?: string }
): Promise<UserStats> {
  return apiRequest<UserStats>(
    `/api/users/${encodeURIComponent(id)}/stats${buildQueryString(params)}`
  );
}

// --- Locations Endpoints (/api/locations) ---

export function fetchLocations(): Promise<Location[]> {
  return apiRequest<Location[]>('/api/locations');
}

export function fetchLocationById(id: string): Promise<Location> {
  return apiRequest<Location>(`/api/locations/${encodeURIComponent(id)}`);
}

export function createLocationApi(
  payload: Omit<Location, 'id'> & { id?: string }
): Promise<Location> {
  return apiRequest<Location>('/api/locations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateLocationApi(location: Location): Promise<Location> {
  return apiRequest<Location>(`/api/locations/${encodeURIComponent(location.id)}`, {
    method: 'PUT',
    body: JSON.stringify(location),
  });
}

export function deleteLocationApi(id: string): Promise<void> {
  return apiRequest<void>(`/api/locations/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function updateFloorElementsApi(
  locationId: string,
  floorId: string,
  elements: FloorElement[]
): Promise<Floor> {
  return apiRequest<Floor>(
    `/api/locations/${encodeURIComponent(locationId)}/floors/${encodeURIComponent(floorId)}/elements`,
    {
      method: 'PUT',
      body: JSON.stringify({ elements }),
    }
  );
}

export function fetchLocationOccupancy(
  locationId: string,
  date: string
): Promise<{ total: number; booked: number; rate: number }> {
  return apiRequest<{ total: number; booked: number; rate: number }>(
    `/api/locations/${encodeURIComponent(locationId)}/occupancy${buildQueryString({ date })}`
  );
}

export function fetchLocationColleagues(
  locationId: string,
  date: string
): Promise<Booking[]> {
  return apiRequest<Booking[]>(
    `/api/locations/${encodeURIComponent(locationId)}/colleagues${buildQueryString({ date })}`
  );
}

// --- Desks Endpoints (/api/desks) ---

export function fetchDesks(params?: {
  locationId?: string;
  floorId?: string;
  zoneId?: string;
  deskType?: DeskType;
  allocationType?: DeskAllocationType;
  status?: 'active' | 'maintenance';
  search?: string;
}): Promise<Desk[]> {
  return apiRequest<Desk[]>(`/api/desks${buildQueryString(params)}`);
}

export function fetchDeskById(id: string): Promise<Desk> {
  return apiRequest<Desk>(`/api/desks/${encodeURIComponent(id)}`);
}

export function fetchDeskAvailability(
  deskId: string,
  date: string
): Promise<SlotAvailability> {
  return apiRequest<SlotAvailability>(
    `/api/desks/${encodeURIComponent(deskId)}/availability${buildQueryString({ date })}`
  );
}

export function createDeskApi(
  payload: Omit<Desk, 'id'> & { id?: string }
): Promise<Desk> {
  return apiRequest<Desk>('/api/desks', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateDeskApi(desk: Desk): Promise<Desk> {
  return apiRequest<Desk>(`/api/desks/${encodeURIComponent(desk.id)}`, {
    method: 'PUT',
    body: JSON.stringify(desk),
  });
}

export function updateDeskAllocationApi(
  deskId: string,
  payload: {
    allocationType: DeskAllocationType;
    designatedUserId?: string;
    designatedUserName?: string;
    designatedDepartment?: string;
    requiresApproval?: boolean;
  }
): Promise<Desk> {
  return apiRequest<Desk>(`/api/desks/${encodeURIComponent(deskId)}/allocation`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function updateDeskPositionApi(
  deskId: string,
  position: DeskPosition,
  rotation?: number
): Promise<Desk> {
  return apiRequest<Desk>(`/api/desks/${encodeURIComponent(deskId)}/position`, {
    method: 'PATCH',
    body: JSON.stringify({ position, rotation }),
  });
}

export function batchUpdateDeskPositionsApi(
  updates: { id: string; position: DeskPosition; rotation?: number }[]
): Promise<Desk[]> {
  return apiRequest<Desk[]>('/api/desks/positions', {
    method: 'PATCH',
    body: JSON.stringify({ updates }),
  });
}

export function deleteDeskApi(id: string): Promise<void> {
  return apiRequest<void>(`/api/desks/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

// --- Bookings Endpoints (/api/bookings) ---

export function fetchBookings(params?: {
  locationId?: string;
  floorId?: string;
  deskId?: string;
  userId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  status?: BookingStatus;
  slot?: SlotType;
  search?: string;
}): Promise<Booking[]> {
  return apiRequest<Booking[]>(`/api/bookings${buildQueryString(params)}`);
}

export function fetchBookingById(id: string): Promise<Booking> {
  return apiRequest<Booking>(`/api/bookings/${encodeURIComponent(id)}`);
}

export function createBookingApi(payload: {
  deskId: string;
  date: string;
  slot: SlotType;
  notes?: string;
  approvalReason?: string;
  isApprovalRequest?: boolean;
}): Promise<BookingActionApiResponse> {
  return apiRequest<BookingActionApiResponse>('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateBookingApi(
  id: string,
  payload: { slot?: SlotType; notes?: string }
): Promise<Booking> {
  return apiRequest<Booking>(`/api/bookings/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function cancelBookingApi(id: string, reason?: string): Promise<Booking> {
  return apiRequest<Booking>(`/api/bookings/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function checkInBookingApi(id: string): Promise<Booking> {
  return apiRequest<Booking>(`/api/bookings/${encodeURIComponent(id)}/check-in`, {
    method: 'POST',
  });
}

export function approveBookingRequestApi(
  id: string,
  note?: string
): Promise<Booking> {
  return apiRequest<Booking>(`/api/bookings/${encodeURIComponent(id)}/approve`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}

export function rejectBookingRequestApi(
  id: string,
  reason: string
): Promise<Booking> {
  return apiRequest<Booking>(`/api/bookings/${encodeURIComponent(id)}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

// --- Workspace Endpoints (/api/workspace) ---

export function resetWorkspaceApi(): Promise<WorkspaceSnapshotApiResponse> {
  return apiRequest<WorkspaceSnapshotApiResponse>('/api/workspace/reset', {
    method: 'POST',
  });
}

