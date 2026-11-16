import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InteractiveFloorPlan } from '../InteractiveFloorPlan';
import * as DeskBookingContext from '../../context/DeskBookingContext';
import type { Booking, Desk, Floor, User } from '../../types/deskBooking';

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

function makeDesk(overrides: Partial<Desk> = {}): Desk {
  return {
    id: 'desk-1',
    code: 'LDN-401',
    name: 'Desk 401',
    locationId: 'loc-london',
    floorId: 'flr-4',
    zoneId: 'zn-1',
    deskType: 'standing',
    allocationType: 'unreserved',
    equipment: ['Dual 4K'],
    status: 'active',
    position: { x: 20, y: 25 },
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
    locationName: 'London HQ',
    floorId: 'flr-4',
    floorName: 'Level 4 - Engineering',
    userId: 'usr-other',
    userName: 'Jordan Lee',
    userEmail: 'jordan@deskination.io',
    userDepartment: 'Product Design',
    date: '2026-11-15',
    slot: 'full_day',
    status: 'confirmed',
    createdAt: '2026-11-10T09:00:00.000Z',
    ...overrides,
  };
}

function createDeskContextMock(
  overrides: Partial<ReturnType<typeof DeskBookingContext.useDeskBooking>> = {}
) {
  return {
    users: [employeeUser],
    currentUser: employeeUser,
    setCurrentUser: vi.fn(),
    upsertUser: vi.fn(),
    locations: [],
    currentLocationId: 'loc-london',
    setCurrentLocationId: vi.fn(),
    currentFloorId: 'flr-4',
    setCurrentFloorId: vi.fn(),
    desks: [],
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
    getUserStats: vi.fn(),
    getDeskAvailability: vi.fn(() => ({
      morning: true,
      afternoon: true,
      full_day: true,
      isDesignatedToOther: false,
      requiresApproval: false,
      bookedBy: {},
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

describe('InteractiveFloorPlan', () => {
  const mockedUseDeskBooking = vi.mocked(DeskBookingContext.useDeskBooking);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders floor header, legend counts, default architectural markers, desk state labels, and Edit Floor Map button', () => {
    const floorWithoutElements: Floor = {
      id: 'flr-4',
      locationId: 'loc-london',
      name: 'Level 4 - Engineering',
      level: 4,
      zones: [],
      elements: [],
    };

    const desks: Desk[] = [
      makeDesk({ id: 'd-open', code: 'LDN-401' }),
      makeDesk({ id: 'd-you', code: 'LDN-402' }),
      makeDesk({ id: 'd-review', code: 'LDN-403', allocationType: 'requires_approval', requiresApproval: true }),
      makeDesk({ id: 'd-split', code: 'LDN-404' }),
      makeDesk({ id: 'd-fix', code: 'LDN-405', status: 'maintenance' }),
      makeDesk({ id: 'd-occ', code: 'LDN-406', allocationType: 'designated', designatedUserId: 'usr-other', designatedUserName: 'Taylor Swift' }),
    ];

    const bookings: Booking[] = [
      makeBooking({ id: 'b-you', deskId: 'd-you', deskCode: 'LDN-402', userId: employeeUser.id, userName: employeeUser.name, status: 'confirmed' }),
      makeBooking({ id: 'b-rev', deskId: 'd-review', deskCode: 'LDN-403', userId: employeeUser.id, userName: employeeUser.name, status: 'pending_approval' }),
      makeBooking({ id: 'b-split', deskId: 'd-split', deskCode: 'LDN-404', userId: 'usr-other', userName: 'Jordan Lee', slot: 'morning', status: 'confirmed' }),
      makeBooking({ id: 'b-occ', deskId: 'd-occ', deskCode: 'LDN-406', userId: 'usr-other', userName: 'Jordan Lee', slot: 'full_day', status: 'confirmed' }),
    ];

    mockedUseDeskBooking.mockReturnValue(
      createDeskContextMock({
        desks,
        bookings,
        getDeskAvailability: vi.fn((deskId: string) => {
          if (deskId === 'd-split') {
            return { morning: false, afternoon: true, full_day: false };
          }
          if (deskId === 'd-occ') {
            return { morning: false, afternoon: false, full_day: false };
          }
          return { morning: true, afternoon: true, full_day: true };
        }),
      })
    );

    const html = renderToStaticMarkup(
      <InteractiveFloorPlan
        floor={floorWithoutElements}
        desks={desks}
        selectedDate="2026-11-15"
        selectedSlot="afternoon"
        onSelectDesk={vi.fn()}
        onOpenEditor={vi.fn()}
      />
    );

    // Header & Level
    expect(html).toContain('Level 4 - Engineering');
    expect(html).toContain('Level 4');

    // Legend counts: Available (d-open + d-split = 2), Your Booking (1), Pending (1), Occupied (1), Designated (1), Needs Approval
    expect(html).toContain('Available (2)');
    expect(html).toContain('Your Booking (1)');
    expect(html).toContain('Pending (1)');
    expect(html).toContain('Occupied (1)');
    expect(html).toContain('Designated (1)');
    expect(html).toContain('Needs Approval');

    // Edit Floor Map button when onOpenEditor is provided
    expect(html).toContain('Edit Floor Map');

    // Default architectural markers when floor.elements is empty
    expect(html).toContain('Lift Core &amp; Stairs');
    expect(html).toContain('Coffee Bar &amp; Nook');
    expect(html).toContain('Restrooms &amp; Showers');

    // Desk node labels
    expect(html).toContain('>Open<');
    expect(html).toContain('You<');
    expect(html).toContain('Review<');
    expect(html).toContain('>Split<');
    expect(html).toContain('>Fix<');
    expect(html).toContain('>Jordan<');
  });

  it('renders custom floor.elements instead of default markers and hides Edit Floor Map when onOpenEditor is omitted', () => {
    const floorWithElements: Floor = {
      id: 'flr-4',
      locationId: 'loc-london',
      name: 'Level 4 - Engineering',
      level: 4,
      zones: [],
      elements: [
        {
          id: 'el-room',
          name: 'Boardroom Alpha',
          type: 'room',
          x: 5,
          y: 5,
          width: 20,
          height: 20,
          label: 'Boardroom Alpha',
        },
        {
          id: 'el-kitchen',
          name: 'Main Kitchen',
          type: 'kitchen',
          x: 70,
          y: 5,
          width: 20,
          height: 15,
        },
      ],
    };

    mockedUseDeskBooking.mockReturnValue(createDeskContextMock());

    const html = renderToStaticMarkup(
      <InteractiveFloorPlan
        floor={floorWithElements}
        desks={[makeDesk()]}
        selectedDate="2026-11-15"
        selectedSlot="full_day"
        onSelectDesk={vi.fn()}
      />
    );

    expect(html).toContain('Boardroom Alpha');
    expect(html).toContain('Main Kitchen');
    expect(html).not.toContain('Lift Core &amp; Stairs');
    expect(html).not.toContain('Coffee Bar &amp; Nook');
    expect(html).not.toContain('Edit Floor Map');
  });
});
