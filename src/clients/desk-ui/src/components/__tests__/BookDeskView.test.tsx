import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookDeskView } from '../BookDeskView';
import * as DeskBookingContext from '../../context/DeskBookingContext';
import type { Location, User } from '../../types/deskBooking';

vi.mock('../../context/DeskBookingContext', () => ({
  useDeskBooking: vi.fn(),
}));

const mockUser: User = {
  id: 'usr-1',
  name: 'Alex Morgan',
  email: 'alex@deskination.io',
  role: 'employee',
  department: 'Engineering',
  jobTitle: 'Software Engineer',
  avatarColor: 'bg-indigo-600',
};

const mockLocation: Location = {
  id: 'loc-1',
  name: 'London HQ',
  city: 'London',
  country: 'UK',
  address: '100 Bishopsgate',
  timezone: 'Europe/London',
  advanceBookingDaysLimit: 14,
  openingHours: '08:00 - 19:00',
  description: 'Main UK office',
  floors: [
    {
      id: 'flr-1',
      locationId: 'loc-1',
      name: 'Level 4 - Engineering',
      level: 4,
      zones: [],
      elements: [],
    },
  ],
};

function createContextMock(overrides: Partial<ReturnType<typeof DeskBookingContext.useDeskBooking>> = {}) {
  return {
    users: [mockUser],
    currentUser: mockUser,
    setCurrentUser: vi.fn(),
    upsertUser: vi.fn(),
    locations: [],
    currentLocationId: '',
    setCurrentLocationId: vi.fn(),
    currentFloorId: '',
    setCurrentFloorId: vi.fn(),
    desks: [],
    bookings: [],
    selectedDate: '2026-11-13',
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
    getLocationOccupancy: vi.fn(() => ({ total: 0, booked: 0, rate: 0 })),
    getColleaguesInOfficeToday: vi.fn(() => []),
    isHydrating: false,
    apiError: null,
    clearApiError: vi.fn(),
    refreshWorkspace: vi.fn(async () => {}),
    resetToDefaults: vi.fn(),
    ...overrides,
  };
}

describe('BookDeskView', () => {
  const mockedUseDeskBooking = vi.mocked(DeskBookingContext.useDeskBooking);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty locations state without throwing when locations is empty and not hydrating', () => {
    mockedUseDeskBooking.mockReturnValue(
      createContextMock({
        locations: [],
        isHydrating: false,
      })
    );

    const html = renderToStaticMarkup(<BookDeskView />);
    expect(html).toContain('No Office Locations Available');
    expect(html).toContain('Retry Loading Locations');
  });

  it('renders loading state with indeterminate progress element when locations is empty and hydrating', () => {
    mockedUseDeskBooking.mockReturnValue(
      createContextMock({
        locations: [],
        isHydrating: true,
      })
    );

    const html = renderToStaticMarkup(<BookDeskView />);
    expect(html).toContain('Loading Office Locations...');
    expect(html).toContain('<progress aria-label="Loading office locations"');
  });

  it('renders no floors configured message without throwing when currentLocation has empty floors', () => {
    const locationWithoutFloors: Location = {
      ...mockLocation,
      floors: [],
    };
    mockedUseDeskBooking.mockReturnValue(
      createContextMock({
        locations: [locationWithoutFloors],
        currentLocationId: locationWithoutFloors.id,
      })
    );

    const html = renderToStaticMarkup(<BookDeskView />);
    expect(html).toContain('No Floors Configured');
    expect(html).toContain('London HQ');
  });

  it('renders location details and floor selector cleanly when location and floor exist', () => {
    mockedUseDeskBooking.mockReturnValue(
      createContextMock({
        locations: [mockLocation],
        currentLocationId: mockLocation.id,
        currentFloorId: mockLocation.floors[0].id,
      })
    );

    const html = renderToStaticMarkup(<BookDeskView />);
    expect(html).toContain('London HQ');
    expect(html).toContain('London, UK');
    expect(html).toContain('Level 4 - Engineering');
  });
});
