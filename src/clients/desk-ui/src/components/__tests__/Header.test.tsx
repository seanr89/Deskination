import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Header } from '../Header';
import * as DeskBookingContext from '../../context/DeskBookingContext';
import * as AuthHook from '../../hooks/useAuth';
import type { User } from '../../types/deskBooking';

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
  jobTitle: 'Director of Workplace',
  avatarColor: 'bg-blue-700',
};

function createDeskContextMock(
  overrides: Partial<ReturnType<typeof DeskBookingContext.useDeskBooking>> = {}
) {
  return {
    users: [employeeUser],
    currentUser: employeeUser,
    setCurrentUser: vi.fn(),
    upsertUser: vi.fn(),
    locations: [],
    currentLocationId: '',
    setCurrentLocationId: vi.fn(),
    currentFloorId: '',
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

describe('Header', () => {
  const mockedUseDeskBooking = vi.mocked(DeskBookingContext.useDeskBooking);
  const mockedUseAuth = vi.mocked(AuthHook.useAuth);

  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseAuth.mockReturnValue(createAuthMock());
  });

  it('renders brand title, primary navigation buttons, Firebase Auth badge, and employee department', () => {
    mockedUseDeskBooking.mockReturnValue(
      createDeskContextMock({ currentUser: employeeUser })
    );

    const html = renderToStaticMarkup(
      <Header currentView="book" onNavigate={vi.fn()} />
    );

    expect(html).toContain('Deskination');
    expect(html).toContain('Hybrid Workspace');
    expect(html).toContain('Book a Desk');
    expect(html).toContain('My Dashboard');
    expect(html).toContain('Office Directory');
    expect(html).toContain('Office Management');
    expect(html).toContain('Firebase Auth');
    expect(html).toContain('Alex Morgan');
    expect(html).toContain('Engineering');
    expect(html).toContain('AM');
    expect(html).toContain('aria-label="View user profile"');
    expect(html).not.toContain('aria-current="page"');
    expect(html).not.toContain('Office Admin</div>');
  });

  it('displays Office Admin label for admin users and sets aria-current="page" on profile view', () => {
    mockedUseDeskBooking.mockReturnValue(
      createDeskContextMock({ currentUser: adminUser })
    );

    const html = renderToStaticMarkup(
      <Header currentView="profile" onNavigate={vi.fn()} />
    );

    expect(html).toContain('Elena Rostova');
    expect(html).toContain('Office Admin');
    expect(html).toContain('ER');
    expect(html).toContain('aria-current="page"');
  });
});
