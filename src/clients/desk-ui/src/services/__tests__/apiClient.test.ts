import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ApiError,
  buildAuthHeaders,
  apiRequest,
  fetchUsers,
  fetchCurrentUser,
  upsertCurrentUser,
  createUserApi,
  fetchUserById,
  fetchUserStats,
  fetchLocations,
  fetchLocationById,
  createLocationApi,
  updateLocationApi,
  deleteLocationApi,
  updateFloorElementsApi,
  fetchLocationOccupancy,
  fetchLocationOccupancyRange,
  fetchLocationColleagues,
  fetchDesks,
  fetchDeskById,
  fetchDeskAvailability,
  fetchDesksAvailability,
  createDeskApi,
  updateDeskApi,
  updateDeskAllocationApi,
  updateDeskPositionApi,
  batchUpdateDeskPositionsApi,
  deleteDeskApi,
  fetchBookings,
  fetchBookingById,
  createBookingApi,
  updateBookingApi,
  cancelBookingApi,
  checkInBookingApi,
  approveBookingRequestApi,
  rejectBookingRequestApi,
  resetWorkspaceApi,
} from '../apiClient';
import * as authService from '../authService';
import type { Desk, FloorElement, Location } from '../../types/deskBooking';

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

    it('formats HTTP error status and response body when response is not ok and exposes ApiError metadata', async () => {
      mockedGetCurrentIdToken.mockResolvedValue('jwt-abc');
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        text: async () => 'Desk already booked for full_day',
      });

      await expect(apiRequest('/api/bookings', { method: 'POST' })).rejects.toThrow(
        'API Error (409 Conflict): Desk already booked for full_day'
      );

      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        text: async () => JSON.stringify({ success: false, message: 'Slot already reserved' }),
      });

      try {
        await apiRequest('/api/bookings', { method: 'POST' });
        expect.fail('Expected ApiError to be thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        const apiErr = err as ApiError;
        expect(apiErr.status).toBe(409);
        expect(apiErr.serverMessage).toBe('Slot already reserved');
        expect(apiErr.body).toEqual({ success: false, message: 'Slot already reserved' });
      }
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

    it('fetchUsers calls GET /api/users with and without query parameters', async () => {
      await fetchUsers();
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/users$/),
        expect.any(Object)
      );

      await fetchUsers({ search: 'sarah', department: 'Platform', role: 'employee' });
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.stringMatching(
          /\/api\/users\?search=sarah&department=Platform&role=employee$/
        ),
        expect.any(Object)
      );

      await fetchUsers({ search: '', department: 'Ops', role: undefined });
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.stringMatching(/\/api\/users\?department=Ops$/),
        expect.any(Object)
      );
    });

    it('fetchCurrentUser calls GET /api/users/me', async () => {
      await fetchCurrentUser();
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/users\/me$/),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
        })
      );
    });

    it('createUserApi calls POST /api/users with JSON payload', async () => {
      const payload = {
        id: 'usr-new',
        name: 'Jordan Lee',
        email: 'jordan.lee@acme-corp.internal',
        role: 'employee' as const,
        department: 'Design',
        jobTitle: 'Product Designer',
        avatarColor: 'bg-teal-600',
      };

      await createUserApi(payload);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/users$/),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(payload),
        })
      );
    });

    it('fetchUserById calls GET /api/users/:id with URL encoding', async () => {
      await fetchUserById('usr/special 1');
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/users\/usr%2Fspecial%201$/),
        expect.any(Object)
      );
    });

    it('fetchUserStats calls GET /api/users/:id/stats with and without query parameters', async () => {
      await fetchUserStats('usr-1');
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/users\/usr-1\/stats$/),
        expect.any(Object)
      );

      await fetchUserStats('usr-1', { referenceDate: '2026-11-15', month: '2026-11' });
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.stringMatching(
          /\/api\/users\/usr-1\/stats\?referenceDate=2026-11-15&month=2026-11$/
        ),
        expect.any(Object)
      );
    });

    it('fetchLocationById calls GET /api/locations/:id', async () => {
      await fetchLocationById('loc-london');
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/locations\/loc-london$/),
        expect.any(Object)
      );
    });

    it('createLocationApi calls POST /api/locations with JSON payload', async () => {
      const payload: Omit<Location, 'id'> = {
        name: 'Edinburgh Hub',
        city: 'Edinburgh',
        country: 'UK',
        address: '10 Princes Street',
        timezone: 'Europe/London',
        floors: [],
        advanceBookingDaysLimit: 30,
        openingHours: '08:00 - 19:00',
        description: 'Scottish engineering office',
      };

      await createLocationApi(payload);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/locations$/),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(payload),
        })
      );
    });

    it('updateLocationApi calls PUT /api/locations/:id with JSON payload', async () => {
      const location: Location = {
        id: 'loc-london',
        name: 'London HQ',
        city: 'London',
        country: 'UK',
        address: '22 Bishopsgate',
        timezone: 'Europe/London',
        floors: [],
        advanceBookingDaysLimit: 30,
        openingHours: '07:30 - 20:00',
        description: 'Main hub',
      };

      await updateLocationApi(location);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/locations\/loc-london$/),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(location),
        })
      );
    });

    it('deleteLocationApi calls DELETE /api/locations/:id', async () => {
      fetchMock.mockResolvedValueOnce({ ok: true, status: 204 });

      await expect(deleteLocationApi('loc-temp')).resolves.toBeUndefined();
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/locations\/loc-temp$/),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('updateFloorElementsApi calls PUT /api/locations/:locationId/floors/:floorId/elements', async () => {
      const elements: FloorElement[] = [
        {
          id: 'el-1',
          name: 'Focus Room A',
          type: 'room',
          x: 10,
          y: 20,
          width: 15,
          height: 12,
          label: 'Focus A',
        },
      ];

      await updateFloorElementsApi('loc-london', 'flr-4', elements);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/locations\/loc-london\/floors\/flr-4\/elements$/),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ elements }),
        })
      );
    });

    it('fetchLocationOccupancy calls GET /api/locations/:id/occupancy with date query', async () => {
      await fetchLocationOccupancy('loc-belfast', '2026-11-15');
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/locations\/loc-belfast\/occupancy\?date=2026-11-15$/),
        expect.any(Object)
      );
    });

    it('fetchLocationOccupancyRange calls GET /api/locations/:id/occupancy/range with startDate and endDate', async () => {
      await fetchLocationOccupancyRange('loc-london', '2026-11-15', '2026-11-20');
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(
          /\/api\/locations\/loc-london\/occupancy\/range\?startDate=2026-11-15&endDate=2026-11-20$/
        ),
        expect.any(Object)
      );
    });

    it('fetchLocationColleagues calls GET /api/locations/:id/colleagues with date query', async () => {
      await fetchLocationColleagues('loc-dubai', '2026-11-15');
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/locations\/loc-dubai\/colleagues\?date=2026-11-15$/),
        expect.any(Object)
      );
    });

    it('fetchDeskById calls GET /api/desks/:id', async () => {
      await fetchDeskById('d-401');
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/desks\/d-401$/),
        expect.any(Object)
      );
    });

    it('fetchDeskAvailability calls GET /api/desks/:id/availability with date query', async () => {
      await fetchDeskAvailability('d-401', '2026-11-15');
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/desks\/d-401\/availability\?date=2026-11-15$/),
        expect.any(Object)
      );
    });

    it('fetchDesksAvailability calls GET /api/desks/availability with optional query params', async () => {
      await fetchDesksAvailability({ date: '2026-11-15', locationId: 'loc-london', floorId: 'flr-4' });
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(
          /\/api\/desks\/availability\?date=2026-11-15&locationId=loc-london&floorId=flr-4$/
        ),
        expect.any(Object)
      );
    });

    it('createDeskApi calls POST /api/desks with JSON payload', async () => {
      const payload: Omit<Desk, 'id'> = {
        code: 'LDN-499',
        name: 'Desk 499 - Standing',
        locationId: 'loc-london',
        floorId: 'flr-4',
        zoneId: 'zn-north',
        deskType: 'standing',
        allocationType: 'unreserved',
        equipment: ['Dual Monitor', 'USB-C Dock'],
        status: 'active',
        position: { x: 45, y: 55 },
        rotation: 90,
      };

      await createDeskApi(payload);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/desks$/),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(payload),
        })
      );
    });

    it('updateDeskApi calls PUT /api/desks/:id with JSON payload', async () => {
      const desk: Desk = {
        id: 'd-401',
        code: 'LDN-401',
        name: 'Desk 401 - Ultrawide',
        locationId: 'loc-london',
        floorId: 'flr-4',
        zoneId: 'zn-north',
        deskType: 'ultrawide',
        allocationType: 'unreserved',
        equipment: ['Ultrawide Monitor'],
        status: 'active',
        position: { x: 25, y: 35 },
      };

      await updateDeskApi(desk);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/desks\/d-401$/),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(desk),
        })
      );
    });

    it('updateDeskAllocationApi calls PATCH /api/desks/:id/allocation with JSON payload', async () => {
      const payload = {
        allocationType: 'designated' as const,
        designatedUserId: 'usr-sarah',
        designatedUserName: 'Sarah Chen',
        designatedDepartment: 'Platform Engineering',
        requiresApproval: false,
      };

      await updateDeskAllocationApi('d-401', payload);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/desks\/d-401\/allocation$/),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
      );
    });

    it('updateDeskPositionApi calls PATCH /api/desks/:id/position', async () => {
      await updateDeskPositionApi('d-401', { x: 60, y: 40 }, 180);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/desks\/d-401\/position$/),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ position: { x: 60, y: 40 }, rotation: 180 }),
        })
      );
    });

    it('batchUpdateDeskPositionsApi calls PATCH /api/desks/positions', async () => {
      const updates = [
        { id: 'd-401', position: { x: 10, y: 20 }, rotation: 0 },
        { id: 'd-402', position: { x: 30, y: 40 }, rotation: 90 },
      ];

      await batchUpdateDeskPositionsApi(updates);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/desks\/positions$/),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ updates }),
        })
      );
    });

    it('deleteDeskApi calls DELETE /api/desks/:id', async () => {
      fetchMock.mockResolvedValueOnce({ ok: true, status: 204 });

      await expect(deleteDeskApi('d-401')).resolves.toBeUndefined();
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/desks\/d-401$/),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('fetchBookingById calls GET /api/bookings/:id', async () => {
      await fetchBookingById('bkg-99');
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/bookings\/bkg-99$/),
        expect.any(Object)
      );
    });

    it('updateBookingApi calls PUT /api/bookings/:id with JSON payload', async () => {
      const payload = { slot: 'afternoon' as const, notes: 'Moved to afternoon' };

      await updateBookingApi('bkg-99', payload);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/bookings\/bkg-99$/),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(payload),
        })
      );
    });
  });
});
