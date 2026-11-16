import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OfficeDirectory } from '../OfficeDirectory';
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
  jobTitle: 'Senior Software Engineer',
  avatarColor: 'bg-indigo-600',
};

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
  floors: [],
};

const sampleDesk: Desk = {
  id: 'desk-1',
  code: 'LDN-401',
  name: 'Desk 401 - Focus Pod',
  locationId: 'loc-london',
  floorId: 'flr-4',
  zoneId: 'zn-1',
  deskType: 'standing',
  equipment: ['Dual 4K Displays'],
  status: 'active',
  position: { x: 20, y: 20 },
};

const inOfficeBooking: Booking = {
  id: 'bkg-1',
  deskId: 'desk-1',
  deskCode: 'LDN-401',
  deskName: 'Desk 401 - Focus Pod',
  locationId: 'loc-london',
  locationName: 'London HQ (Bishopsgate)',
  floorId: 'flr-4',
  floorName: 'Level 4',
  userId: employeeUser.id,
  userName: employeeUser.name,
  userEmail: employeeUser.email,
  userDepartment: employeeUser.department,
  date: '2026-11-15',
  slot: 'full_day',
  status: 'confirmed',
  createdAt: '2026-11-10T09:00:00.000Z',
};

const cancelledBooking: Booking = {
  ...inOfficeBooking,
  id: 'bkg-2',
  userId: adminUser.id,
  userName: adminUser.name,
  userEmail: adminUser.email,
  userDepartment: adminUser.department,
  status: 'cancelled',
};

function createDeskContextMock(
  overrides: Partial<ReturnType<typeof DeskBookingContext.useDeskBooking>> = {}
) {
  return {
    users: [employeeUser, adminUser],
    currentUser: employeeUser,
    setCurrentUser: vi.fn(),
    upsertUser: vi.fn(),
    locations: [londonLocation],
    currentLocationId: londonLocation.id,
    setCurrentLocationId: vi.fn(),
    currentFloorId: '',
    setCurrentFloorId: vi.fn(),
    desks: [sampleDesk],
    bookings: [inOfficeBooking, cancelledBooking],
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

describe('OfficeDirectory', () => {
  const mockedUseDeskBooking = vi.mocked(DeskBookingContext.useDeskBooking);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders directory header, colleague cards with department/jobTitle, Admin badge, and in-office vs remote indicators', () => {
    mockedUseDeskBooking.mockReturnValue(createDeskContextMock());

    const html = renderToStaticMarkup(<OfficeDirectory />);

    expect(html).toContain('Workplace Directory &amp; Colleague Locator');
    expect(html).toContain('Colleagues (2)');
    expect(html).toContain('All Desks (1)');

    // Employee colleague with active booking on selectedDate
    expect(html).toContain('Alex Morgan');
    expect(html).toContain('Senior Software Engineer');
    expect(html).toContain('Engineering');
    expect(html).toContain('In Office (LDN-401 · full day)');

    // Admin colleague with only a cancelled booking -> Remote indicator + Admin badge
    expect(html).toContain('Elena Rostova');
    expect(html).toContain('Director of Workplace');
    expect(html).toContain('Workplace Operations');
    expect(html).toContain('Admin');
    expect(html).toContain('Remote / No desk booked today');
  });
});
