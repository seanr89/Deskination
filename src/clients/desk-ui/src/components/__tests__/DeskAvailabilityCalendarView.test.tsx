import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DeskAvailabilityCalendarView } from '../DeskAvailabilityCalendarView';
import * as DeskBookingContext from '../../context/DeskBookingContext';
import type { Booking, Desk, Location, User } from '../../types/deskBooking';

vi.mock('../../context/DeskBookingContext', () => ({
  useDeskBooking: vi.fn(),
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

const desks: Desk[] = [
  {
    id: 'd-1',
    code: 'LDN-401',
    name: 'Desk 401',
    locationId: 'loc-london',
    floorId: 'flr-4',
    zoneId: 'zn-1',
    deskType: 'standing',
    equipment: ['Dual 4K'],
    status: 'active',
    position: { x: 20, y: 20 },
  },
  {
    id: 'd-2',
    code: 'LDN-402',
    name: 'Desk 402',
    locationId: 'loc-london',
    floorId: 'flr-4',
    zoneId: 'zn-1',
    deskType: 'standard',
    equipment: ['Monitor'],
    status: 'active',
    position: { x: 40, y: 20 },
  },
];

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
    desks,
    bookings: [],
    selectedDate: '2026-11-16',
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
    getUserStats: vi.fn(),
    getDeskAvailability: vi.fn(() => ({
      morning: true,
      afternoon: true,
      full_day: true,
    })),
    getLocationOccupancy: vi.fn(),
    getColleaguesInOfficeToday: vi.fn(() => []),
    isHydrating: false,
    apiError: null,
    clearApiError: vi.fn(),
    refreshWorkspace: vi.fn(async () => {}),
    resetToDefaults: vi.fn(),
    ...overrides,
  };
}

describe('DeskAvailabilityCalendarView', () => {
  const mockedUseDeskBooking = vi.mocked(DeskBookingContext.useDeskBooking);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-16T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders month header, location details, KPI strip, weekday headers, and Booked / In Review day badges', () => {
    const bookings: Booking[] = [
      {
        id: 'b-booked',
        deskId: 'd-1',
        deskCode: 'LDN-401',
        deskName: 'Desk 401',
        locationId: 'loc-london',
        locationName: londonLocation.name,
        floorId: 'flr-4',
        floorName: 'Level 4 - Engineering',
        userId: employeeUser.id,
        userName: employeeUser.name,
        userEmail: employeeUser.email,
        userDepartment: employeeUser.department,
        date: '2026-11-16',
        slot: 'full_day',
        status: 'confirmed',
        createdAt: '2026-11-10T09:00:00.000Z',
      },
      {
        id: 'b-review',
        deskId: 'd-2',
        deskCode: 'LDN-402',
        deskName: 'Desk 402',
        locationId: 'loc-london',
        locationName: londonLocation.name,
        floorId: 'flr-4',
        floorName: 'Level 4 - Engineering',
        userId: employeeUser.id,
        userName: employeeUser.name,
        userEmail: employeeUser.email,
        userDepartment: employeeUser.department,
        date: '2026-11-18',
        slot: 'morning',
        status: 'pending_approval',
        createdAt: '2026-11-11T09:00:00.000Z',
      },
    ];

    mockedUseDeskBooking.mockReturnValue(
      createDeskContextMock({ bookings, selectedDate: '2026-11-16' })
    );

    const html = renderToStaticMarkup(
      <DeskAvailabilityCalendarView
        location={londonLocation}
        onSelectDateAndSwitchToMap={vi.fn()}
        onSelectDateAndSwitchToGrid={vi.fn()}
      />
    );

    // Month header & location metadata
    expect(html).toContain('November 2026');
    expect(html).toContain('London HQ (Bishopsgate)');
    expect(html).toContain('2 total desks configured');

    // KPI strip
    expect(html).toContain('Period Avg Occupancy');
    expect(html).toContain('Peak Collaboration Day');
    expect(html).toContain('Quiet Focus Opportunity');
    expect(html).toContain('Your Scheduled Days');

    // Weekday headers
    for (const day of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']) {
      expect(html).toContain(`>${day}<`);
    }

    // Day cell status badges & selected day overview
    expect(html).toContain('Booked');
    expect(html).toContain('In Review');
    expect(html).toContain('Selected Day Overview');
    expect(html).toContain('You have reserved LDN-401');
  });
});
