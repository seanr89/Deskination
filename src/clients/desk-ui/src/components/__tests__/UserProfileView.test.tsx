import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserProfileView } from '../UserProfileView';
import * as DeskBookingContext from '../../context/DeskBookingContext';
import * as AuthHook from '../../hooks/useAuth';
import type { Location, User, UserStats } from '../../types/deskBooking';

vi.mock('../../context/DeskBookingContext', () => ({
  useDeskBooking: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
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
  jobTitle: 'Director of Workplace & Facilities',
  avatarColor: 'bg-blue-700',
};

const mockLocation: Location = {
  id: 'loc-belfast',
  name: 'Belfast Hub (Titanic Quarter)',
  city: 'Belfast',
  country: 'United Kingdom',
  address: '1 Olympic Way',
  timezone: 'Europe/London',
  advanceBookingDaysLimit: 21,
  openingHours: '08:00 - 19:30',
  description: 'Waterside engineering workspace',
  floors: [],
};

const mockStats: UserStats = {
  totalBookings: 12,
  upcomingCount: 2,
  completedCount: 9,
  cancelledCount: 1,
  pendingApprovalsCount: 0,
  cancellationRate: 8,
  mostCommonDesk: {
    deskCode: 'BFS-201',
    deskName: 'Desk 201',
    count: 5,
  },
  preferredSlot: 'full_day',
  daysInOfficeThisMonth: 4,
};

function createDeskContextMock(
  overrides: Partial<ReturnType<typeof DeskBookingContext.useDeskBooking>> = {}
) {
  return {
    users: [employeeUser, adminUser],
    currentUser: employeeUser,
    setCurrentUser: vi.fn(),
    upsertUser: vi.fn(),
    locations: [mockLocation],
    currentLocationId: mockLocation.id,
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
    getUserStats: vi.fn(() => mockStats),
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

function createAuthMock(
  overrides: Partial<ReturnType<typeof AuthHook.useAuth>> = {}
) {
  return {
    firebaseUser: null,
    workspaceUser: employeeUser,
    idToken: null,
    tokenResult: null,
    isLoading: false,
    isAuthenticated: true,
    isFirebaseConfigured: true,
    authMode: 'firebase' as const,
    error: null,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(async () => {}),
    sendPasswordReset: vi.fn(),
    updatePassword: vi.fn(),
    refreshIdToken: vi.fn(async () => null),
    saveRuntimeConfig: vi.fn(() => true),
    clearRuntimeConfig: vi.fn(),
    clearError: vi.fn(),
    ...overrides,
  };
}

describe('UserProfileView', () => {
  const mockedUseDeskBooking = vi.mocked(DeskBookingContext.useDeskBooking);
  const mockedUseAuth = vi.mocked(AuthHook.useAuth);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders employee profile details, preferred hub, and employee role access', () => {
    mockedUseDeskBooking.mockReturnValue(
      createDeskContextMock({ currentUser: employeeUser })
    );
    mockedUseAuth.mockReturnValue(
      createAuthMock({ workspaceUser: employeeUser })
    );

    const html = renderToStaticMarkup(<UserProfileView />);

    expect(html).toContain('Alex Morgan');
    expect(html).toContain('alex.morgan@deskination.io');
    expect(html).toContain('Engineering');
    expect(html).toContain('Senior Software Engineer');
    expect(html).toContain('Workspace Employee');
    expect(html).toContain('Belfast Hub (Titanic Quarter) (Belfast)');
    expect(html).toContain('BFS-201');
    expect(html).toContain('Admin role required');
  });

  it('renders admin role badge and active admin permissions when role is admin', () => {
    mockedUseDeskBooking.mockReturnValue(
      createDeskContextMock({ currentUser: adminUser })
    );
    mockedUseAuth.mockReturnValue(
      createAuthMock({ workspaceUser: adminUser })
    );

    const html = renderToStaticMarkup(<UserProfileView />);

    expect(html).toContain('Elena Rostova');
    expect(html).toContain('Office Operations Admin');
    expect(html).toContain('Approve or reject pending desk requests');
    expect(html).not.toContain('Admin role required');
  });
});
