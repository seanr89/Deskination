import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildAuthHeaders,
  apiRequest,
  fetchLocations,
  fetchDesks,
  fetchBookings,
  createBookingApi,
  cancelBookingApi,
  checkInBookingApi,
  approveBookingRequestApi,
  rejectBookingRequestApi,
  upsertCurrentUser,
  resetWorkspaceApi,
} from '../apiClient';
import * as authService from '../authService';

vi.mock('../authService', () => ({
  getCurrentIdToken: vi.fn(),
}));

describe('apiClient', () => {
  const mockedGetCurrentIdToken = vi.mocked(authService.getCurrentIdToken);
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('buildAuthHeaders', () => {
    it('builds default Content-Type header without Authorization when no token is present', async () => {
      mockedGetCurrentIdToken.mockResolvedValue(null);

      const headers = await buildAuthHeaders({ 'X-Custom': 'val' });

      expect(mockedGetCurrentIdToken).toHaveBeenCalledWith(false);
      expect(headers).toEqual({
        'Content-Type': 'application/json',
        'X-Custom': 'val',
      });
      expect(headers.Authorization).toBeUndefined();
    });

    it('injects Authorization Bearer header when a Firebase ID token is available', async () => {
      mockedGetCurrentIdToken.mockResolvedValue('firebase-jwt-token-123');

      const headers = await buildAuthHeaders({}, true);

      expect(mockedGetCurrentIdToken).toHaveBeenCalledWith(true);
      expect(headers).toEqual({
        'Content-Type': 'application/json',
        Authorization: 'Bearer firebase-jwt-token-123',
      });
    });
  });

  describe('apiRequest', () => {
    it('sends request with Authorization Bearer header and parses JSON response', async () => {
      mockedGetCurrentIdToken.mockResolvedValue('jwt-abc');
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ hello: 'world' }),
      });

      const result = await apiRequest<{ hello: string }>('/api/test');

      expect(result).toEqual({ hello: 'world' });
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/test$/),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer jwt-abc',
          },
        })
      );
    });

    it('throws an error when requireAuth is true and no Firebase ID token is available', async () => {
      mockedGetCurrentIdToken.mockResolvedValue(null);

      await expect(
        apiRequest('/api/protected', { requireAuth: true })
      ).rejects.toThrow('Authentication required: No active Firebase ID token available.');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('formats HTTP error status and response body when response is not ok', async () => {
      mockedGetCurrentIdToken.mockResolvedValue('jwt-abc');
      fetchMock.mockResolvedValue({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        text: async () => 'Desk already booked for full_day',
      });

      await expect(apiRequest('/api/bookings', { method: 'POST' })).rejects.toThrow(
        'API Error (409 Conflict): Desk already booked for full_day'
      );
    });

    it('returns undefined when response status is 204 No Content', async () => {
      mockedGetCurrentIdToken.mockResolvedValue('jwt-abc');
      fetchMock.mockResolvedValue({
        ok: true,
        status: 204,
      });

      const result = await apiRequest<void>('/api/desks/desk-1', { method: 'DELETE' });
      expect(result).toBeUndefined();
    });
  });

  describe('Endpoint wrappers', () => {
    beforeEach(() => {
      mockedGetCurrentIdToken.mockResolvedValue('test-token');
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      });
    });

    it('fetchLocations calls GET /api/locations', async () => {
      await fetchLocations();
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/locations$/),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
        })
      );
    });

    it('fetchDesks calls GET /api/desks with query parameters', async () => {
      await fetchDesks({ locationId: 'loc-london', floorId: 'flr-1', status: 'active' });
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/desks\?locationId=loc-london&floorId=flr-1&status=active$/),
        expect.any(Object)
      );
    });

    it('fetchBookings calls GET /api/bookings with query parameters', async () => {
      await fetchBookings({ date: '2026-11-07', slot: 'morning' });
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/bookings\?date=2026-11-07&slot=morning$/),
        expect.any(Object)
      );
    });

    it('createBookingApi calls POST /api/bookings with JSON payload', async () => {
      const payload = {
        deskId: 'd-101',
        date: '2026-11-07',
        slot: 'full_day' as const,
        notes: 'Near window',
        isApprovalRequest: false,
      };
      await createBookingApi(payload);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/bookings$/),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(payload),
        })
      );
    });

    it('cancelBookingApi calls POST /api/bookings/:id/cancel', async () => {
      await cancelBookingApi('bkg-42', 'Working remotely');
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/bookings\/bkg-42\/cancel$/),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ reason: 'Working remotely' }),
        })
      );
    });

    it('checkInBookingApi calls POST /api/bookings/:id/check-in', async () => {
      await checkInBookingApi('bkg-42');
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/bookings\/bkg-42\/check-in$/),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('approveBookingRequestApi calls POST /api/bookings/:id/approve', async () => {
      await approveBookingRequestApi('req-10', 'Approved by admin');
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/bookings\/req-10\/approve$/),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ note: 'Approved by admin' }),
        })
      );
    });

    it('rejectBookingRequestApi calls POST /api/bookings/:id/reject', async () => {
      await rejectBookingRequestApi('req-10', 'Reserved for visiting team');
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/bookings\/req-10\/reject$/),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ reason: 'Reserved for visiting team' }),
        })
      );
    });

    it('upsertCurrentUser calls PUT /api/users/me', async () => {
      const payload = {
        id: 'usr-1',
        name: 'Alex Morgan',
        email: 'alex.morgan@deskination.io',
        department: 'Workplace Ops',
        jobTitle: 'Director',
        role: 'admin' as const,
      };
      await upsertCurrentUser(payload);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/users\/me$/),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(payload),
        })
      );
    });

    it('resetWorkspaceApi calls POST /api/workspace/reset', async () => {
      await resetWorkspaceApi();
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/workspace\/reset$/),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });
});
