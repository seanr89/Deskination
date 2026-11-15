import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeskModal } from '../DeskModal';
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

function makeDesk(overrides: Partial<Desk> = {}): Desk {
  return {
    id: 'desk-1',
    code: 'LDN-401',
    name: 'Desk 401 - Focus Pod',
    locationId: 'loc-london',
    floorId: 'flr-4',
    zoneId: 'zn-1',
    deskType: 'standing',
    allocationType: 'unreserved',
    equipment: ['Dual 27" 4K Displays', 'USB-C Dock'],
    status: 'active',
    position: { x: 25, y: 30 },
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
    locations: [londonLocation],
    currentLocationId: londonLocation.id,
    setCurrentLocationId: vi.fn(),
    currentFloorId: londonLocation.floors[0].id,
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

describe('DeskModal', () => {
  const mockedUseDeskBooking = vi.mocked(DeskBookingContext.useDeskBooking);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty string when desk is null', () => {
    mockedUseDeskBooking.mockReturnValue(createDeskContextMock());

    const html = renderToStaticMarkup(<DeskModal desk={null} onClose={vi.fn()} />);
    expect(html).toBe('');
  });

  it('renders unreserved hot desk state with slot choices and instant confirm button', () => {
    const desk = makeDesk({ allocationType: 'unreserved' });
    mockedUseDeskBooking.mockReturnValue(createDeskContextMock({ desks: [desk] }));

    const html = renderToStaticMarkup(<DeskModal desk={desk} onClose={vi.fn()} />);

    expect(html).toContain('LDN-401');
    expect(html).toContain('Desk 401 - Focus Pod');
    expect(html).toContain('Unreserved Hot Desk');
    expect(html).toContain('Morning');
    expect(html).toContain('Afternoon');
    expect(html).toContain('Full Day');
    expect(html).toContain('Confirm Booking (full day)');
  });

  it('renders designated desk states for Assigned to You vs designated to another user/department', () => {
    const assignedToMeDesk = makeDesk({
      allocationType: 'designated',
      designatedUserId: employeeUser.id,
      designatedUserName: employeeUser.name,
    });
    mockedUseDeskBooking.mockReturnValue(createDeskContextMock());

    const mineHtml = renderToStaticMarkup(
      <DeskModal desk={assignedToMeDesk} onClose={vi.fn()} />
    );
    expect(mineHtml).toContain('Designated Workstation');
    expect(mineHtml).toContain('Assigned to You');
    expect(mineHtml).toContain('Confirm Booking (full day)');

    const assignedToOtherUserDesk = makeDesk({
      allocationType: 'designated',
      designatedUserId: 'usr-other',
      designatedUserName: 'Jordan Lee',
    });
    const otherUserHtml = renderToStaticMarkup(
      <DeskModal desk={assignedToOtherUserDesk} onClose={vi.fn()} />
    );
    expect(otherUserHtml).toContain('Designated Workstation');
    expect(otherUserHtml).not.toContain('Assigned to You');
    expect(otherUserHtml).toContain('Designated for Jordan Lee');
    expect(otherUserHtml).toContain('Request Reservation (Requires Approval)');

    const assignedToDeptDesk = makeDesk({
      allocationType: 'designated',
      designatedDepartment: 'Executive',
    });
    const deptHtml = renderToStaticMarkup(
      <DeskModal desk={assignedToDeptDesk} onClose={vi.fn()} />
    );
    expect(deptHtml).toContain('Reserved for the Executive team');
    expect(deptHtml).toContain('Request Reservation (Requires Approval)');
  });

  it('renders Manager Approval Required banner and justification prompt', () => {
    const approvalDesk = makeDesk({
      allocationType: 'requires_approval',
      requiresApproval: true,
    });
    mockedUseDeskBooking.mockReturnValue(createDeskContextMock());

    const html = renderToStaticMarkup(
      <DeskModal desk={approvalDesk} onClose={vi.fn()} />
    );

    expect(html).toContain('Manager Approval Required');
    expect(html).toContain('Business Justification (Required for Management Review)');
    expect(html).toContain('Request Reservation (Requires Approval)');
  });

  it('renders active user reservation state with export and cancel actions', () => {
    const desk = makeDesk();
    const myBooking: Booking = {
      id: 'bkg-mine',
      deskId: desk.id,
      deskCode: desk.code,
      deskName: desk.name,
      locationId: londonLocation.id,
      locationName: londonLocation.name,
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

    mockedUseDeskBooking.mockReturnValue(
      createDeskContextMock({ bookings: [myBooking] })
    );

    const html = renderToStaticMarkup(<DeskModal desk={desk} onClose={vi.fn()} />);

    expect(html).toContain('You have reserved this desk!');
    expect(html).toContain('Confirmed for full day on 2026-11-15');
    expect(html).toContain('Export to Calendar (.ics)');
    expect(html).toContain('Cancel Reservation');
    expect(html).not.toContain('Confirm Booking (full day)');
  });

  it('renders Under Maintenance disabled state when desk is in maintenance', () => {
    const maintDesk = makeDesk({ status: 'maintenance' });
    mockedUseDeskBooking.mockReturnValue(createDeskContextMock());

    const html = renderToStaticMarkup(
      <DeskModal desk={maintDesk} onClose={vi.fn()} />
    );

    expect(html).toContain('Under Maintenance');
    expect(html).toMatch(/disabled=""[^>]*>Under Maintenance/);
  });
});
