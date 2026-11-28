import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  DeskBookingProvider,
  useDeskBooking,
  type DeskBookingProviderProps,
} from '../DeskBookingContext';
import { loadWorkspaceAnalyticsSnapshot } from '../../hooks/useWorkspaceAnalytics';
import { getCurrentIdToken } from '../../services/authService';
import {
  ApiError,
  createBookingApi,
  approveBookingRequestApi,
  deleteDeskApi,
  fetchDesksAvailability,
  fetchLocationOccupancyRange,
  fetchLocationColleagues,
  fetchUserStats,
} from '../../services/apiClient';
import type { Booking, Desk, Location, User } from '../../types/deskBooking';

let activeStateCells: unknown[] | null = null;
let stateCursor = 0;

vi.mock('react', async importOriginal => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useState: <T,>(initial: T | (() => T)) => {
      if (!activeStateCells) {
        return actual.useState(initial);
      }
      const idx = stateCursor++;
      if (idx >= activeStateCells.length) {
        activeStateCells.push(
          typeof initial === 'function' ? (initial as () => T)() : initial
        );
      }
      const setState = (updater: T | ((prev: T) => T)) => {
        if (!activeStateCells) return;
        const current = activeStateCells[idx] as T;
        activeStateCells[idx] =
          typeof updater === 'function'
            ? (updater as (prev: T) => T)(current)
            : updater;
      };
      return [activeStateCells[idx] as T, setState] as const;
    },
  };
});

vi.mock('../../services/authService', () => ({
  getCurrentIdToken: vi.fn(async () => null),
  subscribeToAuthChanges: vi.fn(() => () => {}),
}));

vi.mock('../../services/apiClient', async importOriginal => {
  const actual = await importOriginal<typeof import('../../services/apiClient')>();
  return {
    ...actual,
    fetchUsers: vi.fn(async () => []),
    fetchLocations: vi.fn(async () => []),
    fetchDesks: vi.fn(async () => []),
    fetchBookings: vi.fn(async () => []),
    fetchDesksAvailability: vi.fn(async () => ({})),
    fetchLocationOccupancy: vi.fn(async () => ({ total: 0, booked: 0, rate: 0 })),
    fetchLocationOccupancyRange: vi.fn(async () => ({})),
    fetchLocationColleagues: vi.fn(async () => []),
    fetchUserStats: vi.fn(async () => ({
      totalBookings: 0,
      upcomingCount: 0,
      completedCount: 0,
      cancelledCount: 0,
      pendingApprovalsCount: 0,
      cancellationRate: 0,
      mostCommonDesk: null,
      preferredSlot: 'balanced' as const,
      daysInOfficeThisMonth: 0,
    })),
    upsertCurrentUser: vi.fn(async () => null),
    createUserApi: vi.fn(async () => null),
    createLocationApi: vi.fn(async () => null),
    updateLocationApi: vi.fn(async () => null),
    deleteLocationApi: vi.fn(async () => {}),
    updateFloorElementsApi: vi.fn(async () => null),
    createDeskApi: vi.fn(async () => null),
    updateDeskApi: vi.fn(async () => null),
    updateDeskAllocationApi: vi.fn(async () => null),
    updateDeskPositionApi: vi.fn(async () => null),
    batchUpdateDeskPositionsApi: vi.fn(async () => {}),
    deleteDeskApi: vi.fn(async () => {}),
    createBookingApi: vi.fn(async () => ({ success: false, message: 'Not configured' })),
    cancelBookingApi: vi.fn(async () => null),
    checkInBookingApi: vi.fn(async () => null),
    approveBookingRequestApi: vi.fn(async () => null),
    rejectBookingRequestApi: vi.fn(async () => null),
    resetWorkspaceApi: vi.fn(async () => null),
  };
});

const employeeUser: User = {
  id: 'usr-emp-1',
  name: 'Alex Morgan',
  email: 'alex.morgan@deskination.io',
  role: 'employee',
  department: 'Engineering',
  jobTitle: 'Software Engineer',
  avatarColor: 'bg-indigo-600',
};

const otherUser: User = {
  id: 'usr-emp-2',
  name: 'Jordan Lee',
  email: 'jordan.lee@deskination.io',
  role: 'employee',
  department: 'Product Design',
  jobTitle: 'Product Designer',
  avatarColor: 'bg-emerald-600',
};

const adminUser: User = {
  id: 'usr-admin-1',
  name: 'Elena Rostova',
  email: 'elena.rostova@deskination.io',
  role: 'admin',
  department: 'Workplace Operations',
  jobTitle: 'Office Operations Manager',
  avatarColor: 'bg-blue-700',
};

const londonLocation: Location = {
  id: 'loc-london',
  name: 'London HQ (Bishopsgate)',
  city: 'London',
  country: 'United Kingdom',
  address: '100 Bishopsgate',
  timezone: 'Europe/London',
  advanceBookingDaysLimit: 30,
  openingHours: '08:00 - 19:00',
  description: 'Primary UK office',
  floors: [
    {
      id: 'flr-ldn-4',
      locationId: 'loc-london',
      name: 'Level 4 - Engineering',
      level: 4,
      zones: [],
      elements: [],
    },
  ],
};

function makeDesk(overrides: Partial<Desk> = {}): Desk {
  return {
    id: 'desk-1',
    code: 'LDN-401',
    name: 'Desk 401',
    locationId: 'loc-london',
    floorId: 'flr-ldn-4',
    zoneId: 'zn-1',
    deskType: 'standing',
    allocationType: 'unreserved',
    equipment: ['Dual 27" 4K Displays'],
    status: 'active',
    position: { x: 25, y: 30 },
    ...overrides,
  };
}

function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: 'bkg-1',
    deskId: 'desk-1',
    deskCode: 'LDN-401',
    deskName: 'Desk 401',
    locationId: 'loc-london',
    locationName: 'London HQ (Bishopsgate)',
    floorId: 'flr-ldn-4',
    floorName: 'Level 4 - Engineering',
    userId: otherUser.id,
    userName: otherUser.name,
    userEmail: otherUser.email,
    userDepartment: otherUser.department,
    date: '2026-11-15',
    slot: 'full_day',
    status: 'confirmed',
    createdAt: '2026-11-10T09:00:00.000Z',
    ...overrides,
  };
}

function renderProviderAndCapture(
  props: Omit<DeskBookingProviderProps, 'children'> = {}
) {
  let captured: ReturnType<typeof useDeskBooking> | undefined;

  function Consumer() {
    captured = useDeskBooking();
    return <div>ok</div>;
  }

  renderToStaticMarkup(
    <DeskBookingProvider {...props}>
      <Consumer />
    </DeskBookingProvider>
  );

  if (!captured) {
    throw new Error('Failed to capture DeskBookingContext value');
  }

  return captured;
}

describe('DeskBookingContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    activeStateCells = null;
    stateCursor = 0;
  });

  describe('Provider & Hook Guard', () => {
    it('throws an explicit error when useDeskBooking is called outside DeskBookingProvider', () => {
      function OutsideConsumer() {
        useDeskBooking();
        return null;
      }

      expect(() => renderToStaticMarkup(<OutsideConsumer />)).toThrow(
        'useDeskBooking must be used within a DeskBookingProvider'
      );
    });

    it('initializes empty default state when no initial props are passed and selects first location/floor when provided', () => {
      const emptyCtx = renderProviderAndCapture();
      expect(emptyCtx.users).toEqual([]);
      expect(emptyCtx.locations).toEqual([]);
      expect(emptyCtx.desks).toEqual([]);
      expect(emptyCtx.bookings).toEqual([]);
      expect(emptyCtx.currentLocationId).toBe('');
      expect(emptyCtx.currentFloorId).toBe('');
      expect(emptyCtx.currentUser.id).toBe('');
      expect(emptyCtx.getDeskAvailability('desk-1', '2026-11-15')).toEqual({
        morning: true,
        afternoon: true,
        full_day: true,
        isDesignatedToOther: false,
        requiresApproval: false,
        bookedBy: {},
      });
      expect(emptyCtx.getLocationOccupancy('loc-london', '2026-11-15')).toEqual({
        total: 0,
        booked: 0,
        rate: 0,
      });
      expect(emptyCtx.getColleaguesInOfficeToday('loc-london', '2026-11-15')).toEqual([]);

      const hydratedCtx = renderProviderAndCapture({
        initialUsers: [employeeUser],
        initialCurrentUser: employeeUser,
        initialLocations: [londonLocation],
        initialDesks: [makeDesk()],
        initialBookings: [],
      });
      expect(hydratedCtx.currentLocationId).toBe('loc-london');
      expect(hydratedCtx.currentFloorId).toBe('flr-ldn-4');
      expect(hydratedCtx.currentUser).toEqual(employeeUser);
    });
  });

  describe('loadWorkspaceAnalyticsSnapshot (backend-sourced domain rules)', () => {
    it('returns null when unauthenticated', async () => {
      vi.mocked(getCurrentIdToken).mockResolvedValueOnce(null);

      const snapshot = await loadWorkspaceAnalyticsSnapshot({
        currentLocationId: 'loc-london',
        advanceBookingDaysLimit: 30,
        selectedDate: '2026-11-15',
        currentUserId: employeeUser.id,
      });

      expect(snapshot).toBeNull();
      expect(fetchDesksAvailability).not.toHaveBeenCalled();
    });

    it('fetches batch desk availability, occupancy range, colleagues, and user stats from booking-api', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-11-15T12:00:00'));

      vi.mocked(getCurrentIdToken).mockResolvedValueOnce('jwt-token');
      vi.mocked(fetchDesksAvailability).mockResolvedValue({
        'desk-1': {
          morning: false,
          afternoon: true,
          full_day: false,
          isDesignatedToOther: false,
          requiresApproval: false,
          bookedBy: {
            morning: { userName: 'Jordan Lee', department: 'Product Design' },
          },
        },
      });
      vi.mocked(fetchLocationOccupancyRange).mockResolvedValue({
        '2026-11-15': { total: 10, booked: 4, rate: 40 },
        '2026-11-16': { total: 10, booked: 2, rate: 20 },
      });
      vi.mocked(fetchLocationColleagues).mockResolvedValue([makeBooking()]);
      vi.mocked(fetchUserStats).mockResolvedValue({
        totalBookings: 5,
        upcomingCount: 2,
        completedCount: 3,
        cancelledCount: 0,
        pendingApprovalsCount: 0,
        cancellationRate: 0,
        mostCommonDesk: { deskCode: 'LDN-401', deskName: 'Desk 401', count: 4 },
        preferredSlot: 'full_day',
        daysInOfficeThisMonth: 3,
      });

      const snapshot = await loadWorkspaceAnalyticsSnapshot({
        currentLocationId: 'loc-london',
        advanceBookingDaysLimit: 30,
        selectedDate: '2026-11-15',
        currentUserId: employeeUser.id,
      });

      expect(snapshot).not.toBeNull();
      // selectedDate === todayIso ('2026-11-15'), so availability is queried for today & tomorrow (2 calls)
      expect(fetchDesksAvailability).toHaveBeenCalledTimes(2);
      expect(fetchLocationOccupancyRange).toHaveBeenCalledWith(
        'loc-london',
        '2026-11-15',
        '2026-12-14'
      );
      expect(fetchUserStats).toHaveBeenCalledWith(employeeUser.id);
      expect(snapshot!.availabilityByKey['2026-11-15:desk-1'].morning).toBe(false);
      expect(snapshot!.occupancyByKey['loc-london:2026-11-15']).toEqual({
        total: 10,
        booked: 4,
        rate: 40,
      });
      expect(snapshot!.colleaguesByKey['loc-london:2026-11-15']).toHaveLength(1);
      expect(snapshot!.userStatsByUserId[employeeUser.id].totalBookings).toBe(5);
    });
  });

  describe('async bookDesk & requestDeskBooking (backend authoritative)', () => {
    function createStatefulHarness(props: Omit<DeskBookingProviderProps, 'children'>) {
      activeStateCells = [];
      const renderPass = () => {
        stateCursor = 0;
        return renderProviderAndCapture(props);
      };
      return { renderPass };
    }

    it('rejects when unauthenticated without invoking createBookingApi', async () => {
      vi.mocked(getCurrentIdToken).mockResolvedValue(null);
      const harness = createStatefulHarness({
        initialCurrentUser: employeeUser,
        initialLocations: [londonLocation],
      });

      const ctx = harness.renderPass();
      const res = await ctx.bookDesk('desk-1', '2026-11-20', 'full_day');

      expect(res).toEqual({
        success: false,
        message: 'Authentication required to book a desk.',
      });
      expect(createBookingApi).not.toHaveBeenCalled();
    });

    it('delegates bookDesk and requestDeskBooking to POST /api/bookings and updates state on 201', async () => {
      vi.mocked(getCurrentIdToken).mockResolvedValue('mock-jwt-token');
      const confirmedBooking = makeBooking({
        id: 'bkg-server-1',
        userId: employeeUser.id,
        date: '2026-11-20',
        slot: 'morning',
        status: 'confirmed',
      });
      const pendingBooking = makeBooking({
        id: 'req-server-2',
        deskId: 'desk-2',
        userId: employeeUser.id,
        date: '2026-11-21',
        slot: 'full_day',
        status: 'pending_approval',
        approvalReason: 'Client demo',
      });

      vi.mocked(createBookingApi)
        .mockResolvedValueOnce({
          success: true,
          message: 'Successfully booked LDN-401 for morning!',
          booking: confirmedBooking,
        })
        .mockResolvedValueOnce({
          success: true,
          message: 'Reservation request submitted!',
          booking: pendingBooking,
        });

      const harness = createStatefulHarness({
        initialCurrentUser: employeeUser,
        initialLocations: [londonLocation],
      });

      let ctx = harness.renderPass();
      const bookRes = await ctx.bookDesk('desk-1', '2026-11-20', 'morning', 'Focus');
      expect(bookRes).toEqual({
        success: true,
        message: 'Successfully booked LDN-401 for morning!',
        booking: confirmedBooking,
      });
      expect(createBookingApi).toHaveBeenNthCalledWith(1, {
        deskId: 'desk-1',
        date: '2026-11-20',
        slot: 'morning',
        notes: 'Focus',
        approvalReason: undefined,
        isApprovalRequest: false,
      });

      ctx = harness.renderPass();
      const reqRes = await ctx.requestDeskBooking('desk-2', '2026-11-21', 'full_day', 'Client demo');
      expect(reqRes).toEqual({
        success: true,
        message: 'Reservation request submitted!',
        booking: pendingBooking,
      });
      expect(createBookingApi).toHaveBeenNthCalledWith(2, {
        deskId: 'desk-2',
        date: '2026-11-21',
        slot: 'full_day',
        notes: 'Client demo',
        approvalReason: 'Client demo',
        isApprovalRequest: true,
      });

      ctx = harness.renderPass();
      expect(ctx.bookings.map(b => b.id)).toEqual(['req-server-2', 'bkg-server-1']);
      expect(ctx.apiError).toBeNull();
    });

    it('surfaces backend ApiError message and leaves bookings unchanged on 409/403 failure', async () => {
      vi.mocked(getCurrentIdToken).mockResolvedValue('mock-jwt-token');
      vi.mocked(createBookingApi).mockRejectedValueOnce(
        new ApiError(
          409,
          'Conflict',
          '{"success":false,"message":"Desk is already reserved for the full day booking."}',
          { success: false, message: 'Desk is already reserved for the full day booking.' },
          'Desk is already reserved for the full day booking.'
        )
      );

      const harness = createStatefulHarness({
        initialCurrentUser: employeeUser,
        initialLocations: [londonLocation],
        initialBookings: [],
      });

      let ctx = harness.renderPass();
      const res = await ctx.bookDesk('desk-1', '2026-11-20', 'full_day');

      expect(res).toEqual({
        success: false,
        message: 'Desk is already reserved for the full day booking.',
      });

      ctx = harness.renderPass();
      expect(ctx.bookings).toEqual([]);
      expect(ctx.apiError).toBe('Desk is already reserved for the full day booking.');
    });
  });

  describe('optimistic mutation rollback & desk deletion cascade', () => {
    function createStatefulHarness(props: Omit<DeskBookingProviderProps, 'children'>) {
      activeStateCells = [];
      const renderPass = () => {
        stateCursor = 0;
        return renderProviderAndCapture(props);
      };
      return { renderPass };
    }

    it('rolls back optimistic approveBookingRequest mutation when the API fails', async () => {
      vi.mocked(getCurrentIdToken).mockResolvedValue('mock-jwt-token');
      vi.mocked(approveBookingRequestApi).mockRejectedValueOnce(
        new ApiError(409, 'Conflict', undefined, undefined, 'Approval conflict')
      );

      const pendingBooking = makeBooking({
        id: 'req-pending-1',
        deskId: 'd-2',
        status: 'pending_approval',
      });

      const harness = createStatefulHarness({
        initialCurrentUser: adminUser,
        initialLocations: [londonLocation],
        initialBookings: [pendingBooking],
      });

      let ctx = harness.renderPass();
      ctx.approveBookingRequest('req-pending-1', 'Try approve');
      await new Promise(resolve => setTimeout(resolve, 0));

      ctx = harness.renderPass();
      expect(ctx.bookings[0].status).toBe('pending_approval');
      expect(ctx.apiError).toBe('Approval conflict');
    });

    it('cascades booking removal on deleteDesk and restores both desk and bookings if deleteDeskApi fails', async () => {
      vi.mocked(getCurrentIdToken).mockResolvedValue('mock-jwt-token');
      vi.mocked(deleteDeskApi).mockRejectedValueOnce(new Error('500 Delete failed'));

      const desk1 = makeDesk({ id: 'd-1', code: 'LDN-401' });
      const desk2 = makeDesk({ id: 'd-2', code: 'LDN-402' });
      const bookingOnDesk1 = makeBooking({ id: 'b-d1', deskId: 'd-1' });
      const bookingOnDesk2 = makeBooking({ id: 'b-d2', deskId: 'd-2' });

      const harness = createStatefulHarness({
        initialCurrentUser: adminUser,
        initialLocations: [londonLocation],
        initialDesks: [desk1, desk2],
        initialBookings: [bookingOnDesk1, bookingOnDesk2],
      });

      let ctx = harness.renderPass();
      ctx.deleteDesk('d-1');
      await new Promise(resolve => setTimeout(resolve, 0));
      ctx = harness.renderPass();
      expect(ctx.desks.map(d => d.id)).toEqual(['d-1', 'd-2']);
      expect(ctx.bookings.map(b => b.id)).toEqual(['b-d1', 'b-d2']);
      expect(ctx.apiError).toBe('500 Delete failed');

      vi.mocked(deleteDeskApi).mockResolvedValueOnce(undefined);
      ctx.deleteDesk('d-1');
      await new Promise(resolve => setTimeout(resolve, 0));
      ctx = harness.renderPass();
      expect(ctx.desks.map(d => d.id)).toEqual(['d-2']);
      expect(ctx.bookings.map(b => b.id)).toEqual(['b-d2']);
      expect(ctx.apiError).toBeNull();
    });
  });
});
