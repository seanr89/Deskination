import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  DeskBookingProvider,
  useDeskBooking,
  type DeskBookingProviderProps,
} from '../DeskBookingContext';
import type { Booking, Desk, Location, User } from '../../types/deskBooking';

vi.mock('../../services/authService', () => ({
  getCurrentIdToken: vi.fn(async () => null),
  subscribeToAuthChanges: vi.fn(() => () => {}),
}));

vi.mock('../../services/apiClient', () => ({
  fetchUsers: vi.fn(async () => []),
  fetchLocations: vi.fn(async () => []),
  fetchDesks: vi.fn(async () => []),
  fetchBookings: vi.fn(async () => []),
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
  createBookingApi: vi.fn(async () => null),
  cancelBookingApi: vi.fn(async () => null),
  checkInBookingApi: vi.fn(async () => null),
  approveBookingRequestApi: vi.fn(async () => null),
  rejectBookingRequestApi: vi.fn(async () => null),
  resetWorkspaceApi: vi.fn(async () => null),
}));

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

  describe('getDeskAvailability', () => {
    it('returns full availability with default flags for an unbooked unreserved desk', () => {
      const desk = makeDesk();
      const ctx = renderProviderAndCapture({
        initialCurrentUser: employeeUser,
        initialLocations: [londonLocation],
        initialDesks: [desk],
        initialBookings: [],
      });

      expect(ctx.getDeskAvailability(desk.id, '2026-11-15')).toEqual({
        morning: true,
        afternoon: true,
        full_day: true,
        isDesignatedToOther: false,
        designatedUser: undefined,
        requiresApproval: false,
        bookedBy: {},
      });
    });

    it('blocks morning, afternoon, and full_day and populates bookedBy for an active full_day booking', () => {
      const desk = makeDesk();
      const booking = makeBooking({
        slot: 'full_day',
        userName: 'Jordan Lee',
        userDepartment: 'Product Design',
      });
      const ctx = renderProviderAndCapture({
        initialCurrentUser: employeeUser,
        initialDesks: [desk],
        initialBookings: [booking],
      });

      expect(ctx.getDeskAvailability(desk.id, '2026-11-15')).toEqual({
        morning: false,
        afternoon: false,
        full_day: false,
        isDesignatedToOther: false,
        designatedUser: undefined,
        requiresApproval: false,
        bookedBy: {
          morning: { userName: 'Jordan Lee', department: 'Product Design' },
          afternoon: { userName: 'Jordan Lee', department: 'Product Design' },
          full_day: { userName: 'Jordan Lee', department: 'Product Design' },
        },
      });
    });

    it('supports morning and afternoon coexistence and ignores cancelled/rejected bookings', () => {
      const desk = makeDesk();

      const morningOnlyCtx = renderProviderAndCapture({
        initialCurrentUser: employeeUser,
        initialDesks: [desk],
        initialBookings: [
          makeBooking({ id: 'b-m', slot: 'morning', status: 'confirmed' }),
          makeBooking({ id: 'b-c', slot: 'afternoon', status: 'cancelled' }),
          makeBooking({ id: 'b-r', slot: 'afternoon', status: 'rejected' }),
        ],
      });
      expect(morningOnlyCtx.getDeskAvailability(desk.id, '2026-11-15')).toEqual({
        morning: false,
        afternoon: true,
        full_day: false,
        isDesignatedToOther: false,
        designatedUser: undefined,
        requiresApproval: false,
        bookedBy: {
          morning: { userName: otherUser.name, department: otherUser.department },
        },
      });

      const afternoonOnlyCtx = renderProviderAndCapture({
        initialCurrentUser: employeeUser,
        initialDesks: [desk],
        initialBookings: [
          makeBooking({ id: 'b-a', slot: 'afternoon', status: 'checked_in' }),
        ],
      });
      expect(afternoonOnlyCtx.getDeskAvailability(desk.id, '2026-11-15')).toEqual({
        morning: true,
        afternoon: false,
        full_day: false,
        isDesignatedToOther: false,
        designatedUser: undefined,
        requiresApproval: false,
        bookedBy: {
          afternoon: { userName: otherUser.name, department: otherUser.department },
        },
      });

      const bothSlotsCtx = renderProviderAndCapture({
        initialCurrentUser: employeeUser,
        initialDesks: [desk],
        initialBookings: [
          makeBooking({
            id: 'b-m',
            slot: 'morning',
            userId: 'u-1',
            userName: 'Alice',
            userDepartment: 'Finance',
          }),
          makeBooking({
            id: 'b-a',
            slot: 'afternoon',
            userId: 'u-2',
            userName: 'Bob',
            userDepartment: 'Sales',
          }),
        ],
      });
      expect(bothSlotsCtx.getDeskAvailability(desk.id, '2026-11-15')).toEqual({
        morning: false,
        afternoon: false,
        full_day: false,
        isDesignatedToOther: false,
        designatedUser: undefined,
        requiresApproval: false,
        bookedBy: {
          morning: { userName: 'Alice', department: 'Finance' },
          afternoon: { userName: 'Bob', department: 'Sales' },
        },
      });
    });

    it('enforces designated user and designated department restrictions relative to currentUser', () => {
      const userDesignatedDesk = makeDesk({
        id: 'd-user',
        allocationType: 'designated',
        designatedUserId: otherUser.id,
        designatedUserName: otherUser.name,
      });
      const deptDesignatedDesk = makeDesk({
        id: 'd-dept',
        allocationType: 'designated',
        designatedDepartment: 'Executive',
      });
      const myUserDesk = makeDesk({
        id: 'd-mine',
        allocationType: 'designated',
        designatedUserId: employeeUser.id,
        designatedUserName: employeeUser.name,
      });
      const myDeptDesk = makeDesk({
        id: 'd-my-dept',
        allocationType: 'designated',
        designatedDepartment: employeeUser.department,
      });

      const ctx = renderProviderAndCapture({
        initialCurrentUser: employeeUser,
        initialDesks: [userDesignatedDesk, deptDesignatedDesk, myUserDesk, myDeptDesk],
      });

      const otherUserAvail = ctx.getDeskAvailability('d-user', '2026-11-15');
      expect(otherUserAvail.isDesignatedToOther).toBe(true);
      expect(otherUserAvail.designatedUser).toBe(otherUser.name);

      const otherDeptAvail = ctx.getDeskAvailability('d-dept', '2026-11-15');
      expect(otherDeptAvail.isDesignatedToOther).toBe(true);
      expect(otherDeptAvail.designatedUser).toBe('Executive');

      const myUserAvail = ctx.getDeskAvailability('d-mine', '2026-11-15');
      expect(myUserAvail.isDesignatedToOther).toBe(false);
      expect(myUserAvail.designatedUser).toBeUndefined();

      const myDeptAvail = ctx.getDeskAvailability('d-my-dept', '2026-11-15');
      expect(myDeptAvail.isDesignatedToOther).toBe(false);
      expect(myDeptAvail.designatedUser).toBeUndefined();
    });

    it('sets requiresApproval when allocationType is requires_approval or desk.requiresApproval is true', () => {
      const byAllocationType = makeDesk({
        id: 'd-req-alloc',
        allocationType: 'requires_approval',
      });
      const byBooleanFlag = makeDesk({
        id: 'd-req-flag',
        allocationType: 'unreserved',
        requiresApproval: true,
      });

      const ctx = renderProviderAndCapture({
        initialCurrentUser: employeeUser,
        initialDesks: [byAllocationType, byBooleanFlag],
      });

      expect(ctx.getDeskAvailability('d-req-alloc', '2026-11-15').requiresApproval).toBe(true);
      expect(ctx.getDeskAvailability('d-req-flag', '2026-11-15').requiresApproval).toBe(true);
    });
  });

  describe('getLocationOccupancy', () => {
    it('computes total, booked, and rounded rate ignoring maintenance desks and cancelled bookings', () => {
      const desks = [
        makeDesk({ id: 'd-1', locationId: 'loc-london', status: 'active' }),
        makeDesk({ id: 'd-2', locationId: 'loc-london', status: 'active' }),
        makeDesk({ id: 'd-3', locationId: 'loc-london', status: 'active' }),
        makeDesk({ id: 'd-maint', locationId: 'loc-london', status: 'maintenance' }),
        makeDesk({ id: 'd-other-loc', locationId: 'loc-belfast', status: 'active' }),
      ];

      const bookings = [
        // Two split bookings on d-1 should count as 1 booked desk
        makeBooking({ id: 'b-1m', deskId: 'd-1', slot: 'morning', status: 'confirmed' }),
        makeBooking({ id: 'b-1a', deskId: 'd-1', slot: 'afternoon', status: 'checked_in' }),
        // Cancelled booking on d-2 should be ignored
        makeBooking({ id: 'b-2c', deskId: 'd-2', slot: 'full_day', status: 'cancelled' }),
        // Different date should be ignored
        makeBooking({ id: 'b-3d', deskId: 'd-3', date: '2026-11-16', status: 'confirmed' }),
      ];

      const ctx = renderProviderAndCapture({
        initialLocations: [londonLocation],
        initialDesks: desks,
        initialBookings: bookings,
      });

      expect(ctx.getLocationOccupancy('loc-london', '2026-11-15')).toEqual({
        total: 3,
        booked: 1,
        rate: 33,
      });
    });

    it('returns zero totals and rate when a location has no active desks', () => {
      const ctx = renderProviderAndCapture({
        initialLocations: [londonLocation],
        initialDesks: [makeDesk({ id: 'd-maint', locationId: 'loc-london', status: 'maintenance' })],
      });

      expect(ctx.getLocationOccupancy('loc-london', '2026-11-15')).toEqual({
        total: 0,
        booked: 0,
        rate: 0,
      });
      expect(ctx.getLocationOccupancy('loc-missing', '2026-11-15')).toEqual({
        total: 0,
        booked: 0,
        rate: 0,
      });
    });
  });

  describe('getUserStats', () => {
    it('computes booking counts, cancellation rate, most common desk, preferred slot, and days in office this month', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-11-15T12:00:00'));

      const bookings: Booking[] = [
        // Past confirmed -> completed (this month)
        makeBooking({
          id: 'u-1',
          userId: employeeUser.id,
          deskId: 'd-fav',
          deskCode: 'LDN-401',
          deskName: 'Desk 401 - Focus',
          date: '2026-11-10',
          slot: 'morning',
          status: 'confirmed',
        }),
        // Checked-in today -> completed (this month)
        makeBooking({
          id: 'u-2',
          userId: employeeUser.id,
          deskId: 'd-fav',
          deskCode: 'LDN-401',
          deskName: 'Desk 401 - Focus',
          date: '2026-11-15',
          slot: 'morning',
          status: 'checked_in',
        }),
        // Same day as u-2 afternoon confirmed -> upcoming (same day shouldn't double count daysInOfficeThisMonth)
        makeBooking({
          id: 'u-3',
          userId: employeeUser.id,
          deskId: 'd-other',
          deskCode: 'LDN-402',
          deskName: 'Desk 402 - Agile',
          date: '2026-11-15',
          slot: 'afternoon',
          status: 'confirmed',
        }),
        // Future confirmed -> upcoming (this month)
        makeBooking({
          id: 'u-4',
          userId: employeeUser.id,
          deskId: 'd-fav',
          deskCode: 'LDN-401',
          deskName: 'Desk 401 - Focus',
          date: '2026-11-20',
          slot: 'morning',
          status: 'confirmed',
        }),
        // Previous month checked_in -> completed, not counted in daysInOfficeThisMonth
        makeBooking({
          id: 'u-5',
          userId: employeeUser.id,
          deskId: 'd-other',
          deskCode: 'LDN-402',
          deskName: 'Desk 402 - Agile',
          date: '2026-10-22',
          slot: 'full_day',
          status: 'checked_in',
        }),
        // Pending approval -> pendingApprovalsCount, excluded from daysInOfficeThisMonth
        makeBooking({
          id: 'u-6',
          userId: employeeUser.id,
          deskId: 'd-other',
          deskCode: 'LDN-402',
          deskName: 'Desk 402 - Agile',
          date: '2026-11-25',
          slot: 'full_day',
          status: 'pending_approval',
        }),
        // Cancelled -> cancelledCount, excluded from mostCommonDesk, preferredSlot, daysInOfficeThisMonth
        makeBooking({
          id: 'u-7',
          userId: employeeUser.id,
          deskId: 'd-other',
          deskCode: 'LDN-402',
          deskName: 'Desk 402 - Agile',
          date: '2026-11-18',
          slot: 'full_day',
          status: 'cancelled',
        }),
        // Rejected -> included in totalBookings, excluded from mostCommonDesk / daysInOfficeThisMonth
        makeBooking({
          id: 'u-8',
          userId: employeeUser.id,
          deskId: 'd-other',
          deskCode: 'LDN-402',
          deskName: 'Desk 402 - Agile',
          date: '2026-11-19',
          slot: 'full_day',
          status: 'rejected',
        }),
        // Different user's booking -> ignored
        makeBooking({
          id: 'other-1',
          userId: otherUser.id,
          date: '2026-11-15',
          status: 'confirmed',
        }),
      ];

      const ctx = renderProviderAndCapture({ initialBookings: bookings });

      expect(ctx.getUserStats(employeeUser.id)).toEqual({
        totalBookings: 8,
        upcomingCount: 2,
        completedCount: 3,
        cancelledCount: 1,
        pendingApprovalsCount: 1,
        cancellationRate: 13, // Math.round(1/8 * 100)
        mostCommonDesk: {
          deskCode: 'LDN-401',
          deskName: 'Desk 401 - Focus',
          count: 3,
        },
        preferredSlot: 'morning',
        daysInOfficeThisMonth: 3, // Nov 10, Nov 15, Nov 20
      });
    });

    it('determines full_day, afternoon, and balanced preferredSlot variants as well as empty stats', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-11-15T12:00:00'));

      const ctx = renderProviderAndCapture({
        initialBookings: [
          makeBooking({ id: 'f1', userId: 'u-full', slot: 'full_day', status: 'confirmed' }),
          makeBooking({ id: 'f2', userId: 'u-full', slot: 'full_day', status: 'confirmed' }),
          makeBooking({ id: 'f3', userId: 'u-full', slot: 'morning', status: 'confirmed' }),
          makeBooking({ id: 'a1', userId: 'u-aft', slot: 'afternoon', status: 'confirmed' }),
          makeBooking({ id: 'b1', userId: 'u-bal', slot: 'morning', status: 'confirmed' }),
          makeBooking({ id: 'b2', userId: 'u-bal', slot: 'afternoon', status: 'confirmed' }),
        ],
      });

      expect(ctx.getUserStats('u-full').preferredSlot).toBe('full_day');
      expect(ctx.getUserStats('u-aft').preferredSlot).toBe('afternoon');
      expect(ctx.getUserStats('u-bal').preferredSlot).toBe('balanced');
      expect(ctx.getUserStats('u-none')).toEqual({
        totalBookings: 0,
        upcomingCount: 0,
        completedCount: 0,
        cancelledCount: 0,
        pendingApprovalsCount: 0,
        cancellationRate: 0,
        mostCommonDesk: null,
        preferredSlot: 'balanced',
        daysInOfficeThisMonth: 0,
      });
    });
  });

  describe('getColleaguesInOfficeToday', () => {
    it('returns non-cancelled bookings matching the specified locationId and date', () => {
      const bookings = [
        makeBooking({ id: 'c1', locationId: 'loc-london', date: '2026-11-15', status: 'confirmed' }),
        makeBooking({ id: 'c2', locationId: 'loc-london', date: '2026-11-15', status: 'checked_in' }),
        makeBooking({ id: 'c3', locationId: 'loc-london', date: '2026-11-15', status: 'cancelled' }),
        makeBooking({ id: 'c4', locationId: 'loc-london', date: '2026-11-16', status: 'confirmed' }),
        makeBooking({ id: 'c5', locationId: 'loc-belfast', date: '2026-11-15', status: 'confirmed' }),
      ];

      const ctx = renderProviderAndCapture({ initialBookings: bookings });

      const result = ctx.getColleaguesInOfficeToday('loc-london', '2026-11-15');
      expect(result.map(b => b.id)).toEqual(['c1', 'c2']);
    });
  });

  describe('bookDesk & requestDeskBooking', () => {
    it('rejects unknown desk IDs and desks under maintenance', () => {
      const maintDesk = makeDesk({ id: 'd-maint', status: 'maintenance' });
      const ctx = renderProviderAndCapture({
        initialCurrentUser: employeeUser,
        initialLocations: [londonLocation],
        initialDesks: [maintDesk],
      });

      expect(ctx.bookDesk('missing-desk', '2026-11-15', 'full_day')).toEqual({
        success: false,
        message: 'Desk not found.',
      });
      expect(ctx.requestDeskBooking('missing-desk', '2026-11-15', 'full_day', 'Need desk')).toEqual({
        success: false,
        message: 'Desk not found.',
      });

      expect(ctx.bookDesk('d-maint', '2026-11-15', 'full_day')).toEqual({
        success: false,
        message: 'This desk is currently undergoing maintenance and cannot be booked.',
      });
      expect(ctx.requestDeskBooking('d-maint', '2026-11-15', 'full_day', 'Need desk')).toEqual({
        success: false,
        message: 'This desk is currently undergoing maintenance and cannot be requested.',
      });
    });

    it('blocks non-admins from instant-booking designated desks for others, while allowing admins to override', () => {
      const designatedDesk = makeDesk({
        id: 'd-desig',
        code: 'LDN-410',
        allocationType: 'designated',
        designatedUserId: otherUser.id,
        designatedUserName: otherUser.name,
      });

      const employeeCtx = renderProviderAndCapture({
        initialCurrentUser: employeeUser,
        initialLocations: [londonLocation],
        initialDesks: [designatedDesk],
      });
      const blocked = employeeCtx.bookDesk('d-desig', '2026-11-15', 'full_day');
      expect(blocked.success).toBe(false);
      expect(blocked.message).toContain(`designated for ${otherUser.name}`);

      const adminCtx = renderProviderAndCapture({
        initialCurrentUser: adminUser,
        initialLocations: [londonLocation],
        initialDesks: [designatedDesk],
      });
      const override = adminCtx.bookDesk('d-desig', '2026-11-15', 'full_day', 'Admin override');
      expect(override.success).toBe(true);
      expect(override.booking?.status).toBe('confirmed');
      expect(override.booking?.userId).toBe(adminUser.id);
    });

    it('routes requires_approval desks to requestDeskBooking for non-admins and confirms directly for admins', () => {
      const approvalDesk = makeDesk({
        id: 'd-approval',
        code: 'LDN-420',
        allocationType: 'requires_approval',
        requiresApproval: true,
      });

      const employeeCtx = renderProviderAndCapture({
        initialCurrentUser: employeeUser,
        initialLocations: [londonLocation],
        initialDesks: [approvalDesk],
      });
      const routed = employeeCtx.bookDesk('d-approval', '2026-11-15', 'morning', 'Client sprint demo');
      expect(routed.success).toBe(true);
      expect(routed.message).toContain('submitted to office management');
      expect(routed.booking?.status).toBe('pending_approval');
      expect(routed.booking?.approvalReason).toBe('Client sprint demo');

      const adminCtx = renderProviderAndCapture({
        initialCurrentUser: adminUser,
        initialLocations: [londonLocation],
        initialDesks: [approvalDesk],
      });
      const direct = adminCtx.bookDesk('d-approval', '2026-11-15', 'morning', 'Exec setup');
      expect(direct.success).toBe(true);
      expect(direct.booking?.status).toBe('confirmed');
    });

    it('rejects slot conflicts on bookDesk and requestDeskBooking', () => {
      const desk = makeDesk({ id: 'd-open', code: 'LDN-401' });
      const approvalDesk = makeDesk({
        id: 'd-req',
        code: 'LDN-402',
        allocationType: 'requires_approval',
      });
      const existingBookings: Booking[] = [
        makeBooking({ id: 'b-m', deskId: 'd-open', date: '2026-11-15', slot: 'morning' }),
        makeBooking({ id: 'b-a', deskId: 'd-req', date: '2026-11-15', slot: 'afternoon' }),
      ];

      const ctx = renderProviderAndCapture({
        initialCurrentUser: employeeUser,
        initialLocations: [londonLocation],
        initialDesks: [desk, approvalDesk],
        initialBookings: existingBookings,
      });

      expect(ctx.bookDesk('d-open', '2026-11-15', 'morning')).toEqual({
        success: false,
        message: 'Desk is already reserved for the morning period.',
      });
      expect(ctx.bookDesk('d-open', '2026-11-15', 'full_day')).toEqual({
        success: false,
        message: 'Desk is not available for a full day booking.',
      });
      // Afternoon remains available on d-open
      const afternoonRes = ctx.bookDesk('d-open', '2026-11-15', 'afternoon');
      expect(afternoonRes.success).toBe(true);
      expect(afternoonRes.booking?.status).toBe('confirmed');

      expect(ctx.requestDeskBooking('d-req', '2026-11-15', 'afternoon', 'Demo')).toEqual({
        success: false,
        message: 'Desk is already occupied for the afternoon period.',
      });
      expect(ctx.requestDeskBooking('d-req', '2026-11-15', 'full_day', 'Demo')).toEqual({
        success: false,
        message: 'Desk is not available for a full day booking.',
      });
    });

    it('rejects same-user double-booking on conflicting slots on the same date', () => {
      const desk1 = makeDesk({ id: 'd-1', code: 'LDN-401' });
      const desk2 = makeDesk({ id: 'd-2', code: 'LDN-402' });
      const approvalDesk = makeDesk({
        id: 'd-3',
        code: 'LDN-403',
        allocationType: 'requires_approval',
      });

      const ctx = renderProviderAndCapture({
        initialCurrentUser: employeeUser,
        initialLocations: [londonLocation],
        initialDesks: [desk1, desk2, approvalDesk],
        initialBookings: [
          makeBooking({
            id: 'mine-morning',
            deskId: 'd-1',
            deskCode: 'LDN-401',
            userId: employeeUser.id,
            userName: employeeUser.name,
            date: '2026-11-15',
            slot: 'morning',
            status: 'confirmed',
          }),
        ],
      });

      const dupMorning = ctx.bookDesk('d-2', '2026-11-15', 'morning');
      expect(dupMorning.success).toBe(false);
      expect(dupMorning.message).toContain('You already have an active booking on this date (LDN-401 - morning)');

      const dupFullDay = ctx.bookDesk('d-2', '2026-11-15', 'full_day');
      expect(dupFullDay.success).toBe(false);
      expect(dupFullDay.message).toContain('You already have an active booking on this date');

      const dupRequest = ctx.requestDeskBooking('d-3', '2026-11-15', 'morning', 'Need extra desk');
      expect(dupRequest.success).toBe(false);
      expect(dupRequest.message).toContain('You already have an active reservation or pending request on this date (LDN-401)');

      // Non-overlapping afternoon slot on another desk is permitted
      const afternoonBooking = ctx.bookDesk('d-2', '2026-11-15', 'afternoon');
      expect(afternoonBooking.success).toBe(true);
      expect(afternoonBooking.booking?.locationName).toBe(londonLocation.name);
      expect(afternoonBooking.booking?.floorName).toBe(londonLocation.floors[0].name);
    });
  });
});
