import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminConsole } from '../AdminConsole';
import * as DeskBookingContext from '../../context/DeskBookingContext';
import type { Booking, Desk, Location, User } from '../../types/deskBooking';

vi.mock('../../context/DeskBookingContext', () => ({
  useDeskBooking: vi.fn(),
}));

const adminUser: User = {
  id: 'usr-admin-1',
  name: 'Elena Rostova',
  email: 'elena.rostova@deskination.io',
  role: 'admin',
  department: 'Workplace Operations',
  jobTitle: 'Director of Workplace',
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
      id: 'flr-4',
      locationId: 'loc-london',
      name: 'Level 4 - Engineering',
      level: 4,
      zones: [],
      elements: [],
    },
  ],
};

const sampleDesk: Desk = {
  id: 'desk-1',
  code: 'LDN-401',
  name: 'Desk 401 - Focus Pod',
  locationId: 'loc-london',
  floorId: 'flr-4',
  zoneId: 'zn-1',
  deskType: 'standing',
  allocationType: 'unreserved',
  equipment: ['Dual 4K Displays'],
  status: 'active',
  position: { x: 20, y: 20 },
};

const confirmedBooking: Booking = {
  id: 'bkg-confirmed',
  deskId: 'desk-1',
  deskCode: 'LDN-401',
  deskName: 'Desk 401 - Focus Pod',
  locationId: 'loc-london',
  locationName: 'London HQ (Bishopsgate)',
  floorId: 'flr-4',
  floorName: 'Level 4 - Engineering',
  userId: 'usr-emp-1',
  userName: 'Alex Morgan',
  userEmail: 'alex.morgan@deskination.io',
  userDepartment: 'Engineering',
  date: '2026-11-16',
  slot: 'full_day',
  status: 'confirmed',
  createdAt: '2026-11-12T09:00:00.000Z',
};

const pendingBooking: Booking = {
  id: 'bkg-pending',
  deskId: 'desk-2',
  deskCode: 'LDN-409',
  deskName: 'Desk 409 - Exec Suite',
  locationId: 'loc-london',
  locationName: 'London HQ (Bishopsgate)',
  floorId: 'flr-4',
  floorName: 'Level 4 - Engineering',
  userId: 'usr-emp-2',
  userName: 'Jordan Lee',
  userEmail: 'jordan.lee@deskination.io',
  userDepartment: 'Product Design',
  date: '2026-11-17',
  slot: 'morning',
  status: 'pending_approval',
  createdAt: '2026-11-13T10:00:00.000Z',
  approvalReason: 'Client demo',
};

function createDeskContextMock(
  overrides: Partial<ReturnType<typeof DeskBookingContext.useDeskBooking>> = {}
) {
  return {
    users: [adminUser],
    currentUser: adminUser,
    setCurrentUser: vi.fn(),
    upsertUser: vi.fn(),
    locations: [londonLocation],
    currentLocationId: londonLocation.id,
    setCurrentLocationId: vi.fn(),
    currentFloorId: londonLocation.floors[0].id,
    setCurrentFloorId: vi.fn(),
    desks: [sampleDesk],
    bookings: [confirmedBooking, pendingBooking],
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
    getUserStats: vi.fn(),
    getDeskAvailability: vi.fn(),
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

describe('AdminConsole', () => {
  const mockedUseDeskBooking = vi.mocked(DeskBookingContext.useDeskBooking);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders manager console header, navigation tabs with pending approvals badge count, and master bookings rows', () => {
    mockedUseDeskBooking.mockReturnValue(createDeskContextMock());

    const html = renderToStaticMarkup(<AdminConsole />);

    expect(html).toContain('Office Operations Manager Console');
    expect(html).toContain('Workplace Management Layer');

    // Sub-navigation tabs
    expect(html).toContain('Master Bookings (2)');
    expect(html).toContain('Requests &amp; Approvals');
    expect(html).toContain('animate-pulse">1</span>');
    expect(html).toContain('Desk Inventory (1)');
    expect(html).toContain('Locations &amp; Hubs (1)');
    expect(html).toContain('Floor Map Designer');
    expect(html).toContain('Occupancy Metrics');

    // Master bookings ledger rows
    expect(html).toContain('2026-11-16');
    expect(html).toContain('Alex Morgan');
    expect(html).toContain('Engineering');
    expect(html).toContain('LDN-401');
    expect(html).toContain('Confirmed');

    expect(html).toContain('2026-11-17');
    expect(html).toContain('Jordan Lee');
    expect(html).toContain('Product Design');
    expect(html).toContain('LDN-409');
    expect(html).toContain('Pending Approval');
    expect(html).toContain('Approve');
    expect(html).toContain('Decline');
  });

  it('renders empty state row and omits pending badge when bookings are empty', () => {
    mockedUseDeskBooking.mockReturnValue(
      createDeskContextMock({ bookings: [] })
    );

    const html = renderToStaticMarkup(<AdminConsole />);

    expect(html).toContain('Master Bookings (0)');
    expect(html).not.toContain('animate-pulse');
    expect(html).toContain('No bookings found for the selected criteria.');
  });
});
