import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EmployeeDashboard } from '../EmployeeDashboard';
import * as DeskBookingContext from '../../context/DeskBookingContext';
import type { Booking, Desk, Location, User, UserStats } from '../../types/deskBooking';

vi.mock('../../context/DeskBookingContext', () => ({
  useDeskBooking: vi.fn(),
}));

const employeeUser: User = {
  id: 'usr-emp-1',
  name: 'Alex Morgan',
  email: 'alex.morgan@deskination.io',
  role: 'employee',
  department: 'Engineering',
  jobTitle: 'Senior Software Engineer',
  avatarColor: 'bg-indigo-600',
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
  description: 'Main UK office',
  floors: [
    {
      id: 'flr-4',
      locationId: 'loc-london',
      name: 'Level 4 - Engineering',
      level: 4,
      zones: [],
      elements: [],
    },
  ],
};

const favoriteDesk: Desk = {
  id: 'desk-fav',
  code: 'LDN-401',
  name: 'Desk 401 - Focus Pod',
  locationId: 'loc-london',
  floorId: 'flr-4',
  zoneId: 'zn-1',
  deskType: 'standing',
  allocationType: 'unreserved',
  equipment: ['Dual 4K Monitor'],
  status: 'active',
  position: { x: 25, y: 30 },
};

const defaultStats: UserStats = {
  totalBookings: 14,
  upcomingCount: 2,
  completedCount: 10,
  cancelledCount: 1,
  pendingApprovalsCount: 1,
  cancellationRate: 7,
  mostCommonDesk: {
    deskCode: 'LDN-401',
    deskName: 'Desk 401 - Focus Pod',
    count: 6,
  },
  preferredSlot: 'full_day',
  daysInOfficeThisMonth: 5,
};

function createDeskContextMock(
  overrides: Partial<ReturnType<typeof DeskBookingContext.useDeskBooking>> = {}
) {
  return {
    users: [employeeUser],
    currentUser: employeeUser,
    setCurrentUser: vi.fn(),
    upsertUser: vi.fn(),
    locations: [londonLocation],
    currentLocationId: londonLocation.id,
    setCurrentLocationId: vi.fn(),
    currentFloorId: londonLocation.floors[0].id,
    setCurrentFloorId: vi.fn(),
    desks: [favoriteDesk],
    bookings: [],
    selectedDate: '2026-11-15',
    setSelectedDate: vi.fn(),
    selectedSlot: 'full_day' as const,
    setSelectedSlot: vi.fn(),
    bookDesk: vi.fn(),
    requestDeskBooking: vi.fn(),
    cancelBooking: vi.fn(),
    checkInBooking: vi.fn(),
    approveBookingRequest: vi.fn(),
    rejectBookingRequest: vi.fn(),
    updateDeskAllocation: vi.fn(),
    addLocation: vi.fn(),
    updateLocation: vi.fn(),
    deleteLocation: vi.fn(),
    addDesk: vi.fn(),
    updateDesk: vi.fn(),
    deleteDesk: vi.fn(),
    updateDeskPosition: vi.fn(),
    batchUpdateDeskPositions: vi.fn(),
    updateFloorElements: vi.fn(),
    getUserStats: vi.fn(() => defaultStats),
    getDeskAvailability: vi.fn(() => ({
      morning: true,
      afternoon: true,
      full_day: true,
      isDesignatedToOther: false,
      requiresApproval: false,
      bookedBy: {},
    })),
    getLocationOccupancy: vi.fn(() => ({ total: 10, booked: 4, rate: 40 })),
    getColleaguesInOfficeToday: vi.fn(() => []),
    isHydrating: false,
    apiError: null,
    clearApiError: vi.fn(),
    refreshWorkspace: vi.fn(async () => {}),
    resetToDefaults: vi.fn(),
    ...overrides,
  };
}

describe('EmployeeDashboard', () => {
  const mockedUseDeskBooking = vi.mocked(DeskBookingContext.useDeskBooking);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-15T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('renders welcome banner, recommended quick book card, 4 metric cards, and empty upcoming reservations state', () => {
    mockedUseDeskBooking.mockReturnValue(createDeskContextMock());

    const html = renderToStaticMarkup(
      <EmployeeDashboard onNavigateToBooking={vi.fn()} />
    );

    // Welcome banner
    expect(html).toContain('Welcome back, Alex Morgan');
    expect(html).toContain('Senior Software Engineer');
    expect(html).toContain('Engineering');
    expect(html).toContain('Book Next Desk');

    // Quick Book Workstation (unbooked today with recommended desk)
    expect(html).toContain('Quick Book Workstation');
    expect(html).toContain('Your Favorite Station');
    expect(html).toContain('1-Click Book Today (full day)');
    expect(html).toContain('LDN-401');

    // 4 Metric cards
    expect(html).toContain('Total Bookings Made');
    expect(html).toContain('Most Common Desk');
    expect(html).toContain('Focus Pod (6x)');
    expect(html).toContain('Cancellations &amp; Rate');
    expect(html).toContain('7%');
    expect(html).toContain('Today&#x27;s Office Status');
    expect(html).toContain('40%');

    // Pending approvals hidden when none exist, upcoming empty state shown
    expect(html).not.toContain('Pending Manager Approvals');
    expect(html).toContain('Upcoming Confirmed Reservations');
    expect(html).toContain('No upcoming confirmed reservations');
    expect(html).toContain('Browse Available Desks');
  });

  it('renders booked-today state, pending manager approvals, and upcoming confirmed reservations list', () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'loc-london'),
      setItem: vi.fn(),
    });

    const todayConfirmedBooking: Booking = {
      id: 'bkg-today',
      deskId: 'desk-fav',
      deskCode: 'LDN-401',
      deskName: 'Desk 401 - Focus Pod',
      locationId: 'loc-london',
      locationName: 'London HQ (Bishopsgate)',
      floorId: 'flr-4',
      floorName: 'Level 4 - Engineering',
      userId: employeeUser.id,
      userName: employeeUser.name,
      userEmail: employeeUser.email,
      userDepartment: employeeUser.department,
      date: '2026-11-15',
      slot: 'full_day',
      status: 'confirmed',
      createdAt: '2026-11-10T09:00:00.000Z',
    };

    const pendingBooking: Booking = {
      id: 'bkg-pending',
      deskId: 'desk-exec',
      deskCode: 'LDN-499',
      deskName: 'Desk 499 - Executive Suite',
      locationId: 'loc-london',
      locationName: 'London HQ (Bishopsgate)',
      floorId: 'flr-4',
      floorName: 'Level 4 - Engineering',
      userId: employeeUser.id,
      userName: employeeUser.name,
      userEmail: employeeUser.email,
      userDepartment: employeeUser.department,
      date: '2026-11-18',
      slot: 'morning',
      status: 'pending_approval',
      createdAt: '2026-11-14T10:00:00.000Z',
      approvalReason: 'Hosting architecture review with external stakeholders',
    };

    mockedUseDeskBooking.mockReturnValue(
      createDeskContextMock({
        bookings: [todayConfirmedBooking, pendingBooking],
      })
    );

    const html = renderToStaticMarkup(
      <EmployeeDashboard onNavigateToBooking={vi.fn()} />
    );

    // Quick book today card switches to Booked state
    expect(html).toContain('Workstation confirmed');
    expect(html).toContain('Calendar (.ics)');

    // Pending approvals section
    expect(html).toContain('Pending Manager Approvals (1)');
    expect(html).toContain('LDN-499');
    expect(html).toContain('Hosting architecture review with external stakeholders');
    expect(html).toContain('Withdraw Request');

    // Upcoming confirmed reservations list
    expect(html).toContain('1 Confirmed');
    expect(html).toContain('Check In');
    expect(html).not.toContain('No upcoming confirmed reservations');
  });
});
