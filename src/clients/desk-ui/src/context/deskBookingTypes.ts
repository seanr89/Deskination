import type React from 'react';
import type {
  Booking,
  Desk,
  DeskAllocationType,
  FloorElement,
  Location,
  SlotAvailability,
  SlotType,
  User,
  UserStats,
} from '../types/deskBooking';

export interface BookingActionResult {
  success: boolean;
  message: string;
  booking?: Booking;
}

export interface LocationOccupancy {
  total: number;
  booked: number;
  rate: number;
}

export interface DeskBookingContextType {
  users: User[];
  currentUser: User;
  setCurrentUser: (user: User) => void;
  upsertUser: (user: User) => void;
  locations: Location[];
  currentLocationId: string;
  setCurrentLocationId: (id: string) => void;
  currentFloorId: string;
  setCurrentFloorId: (id: string) => void;
  desks: Desk[];
  bookings: Booking[];
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  selectedSlot: SlotType;
  setSelectedSlot: (slot: SlotType) => void;

  // Actions
  bookDesk: (
    deskId: string,
    date: string,
    slot: SlotType,
    notes?: string
  ) => Promise<BookingActionResult>;
  requestDeskBooking: (
    deskId: string,
    date: string,
    slot: SlotType,
    justification: string
  ) => Promise<BookingActionResult>;
  cancelBooking: (bookingId: string, reason?: string) => boolean;
  checkInBooking: (bookingId: string) => boolean;

  // Admin Operations & Approvals
  approveBookingRequest: (bookingId: string, note?: string) => boolean;
  rejectBookingRequest: (bookingId: string, reason: string) => boolean;
  updateDeskAllocation: (
    deskId: string,
    allocationType: DeskAllocationType,
    designatedUserId?: string,
    designatedUserName?: string,
    designatedDepartment?: string,
    requiresApproval?: boolean
  ) => void;
  addLocation: (loc: Omit<Location, 'id'>) => Location;
  updateLocation: (loc: Location) => void;
  deleteLocation: (id: string) => void;
  addDesk: (desk: Omit<Desk, 'id'>) => Desk;
  updateDesk: (desk: Desk) => void;
  deleteDesk: (id: string) => void;
  updateDeskPosition: (
    deskId: string,
    position: { x: number; y: number },
    rotation?: number
  ) => void;
  batchUpdateDeskPositions: (
    updates: { id: string; position: { x: number; y: number }; rotation?: number }[]
  ) => void;
  updateFloorElements: (
    locationId: string,
    floorId: string,
    elements: FloorElement[]
  ) => void;

  // Analytics & Availability
  getUserStats: (userId: string) => UserStats;
  getDeskAvailability: (deskId: string, date: string) => SlotAvailability;
  getLocationOccupancy: (locationId: string, date: string) => LocationOccupancy;
  getColleaguesInOfficeToday: (locationId: string, date: string) => Booking[];

  // Hydration & API status
  isHydrating: boolean;
  apiError: string | null;
  clearApiError: () => void;
  refreshWorkspace: () => Promise<void>;

  // Reset
  resetToDefaults: () => void;
}

export interface DeskBookingProviderProps {
  children: React.ReactNode;
  initialUsers?: User[];
  initialCurrentUser?: User;
  initialLocations?: Location[];
  initialDesks?: Desk[];
  initialBookings?: Booking[];
}

export const EMPTY_USER: User = {
  id: '',
  name: 'Workspace Member',
  email: '',
  role: 'employee',
  department: 'General Operations',
  jobTitle: 'Team Member',
  avatarColor: 'bg-slate-600',
};

export const DEFAULT_USER_STATS: UserStats = {
  totalBookings: 0,
  upcomingCount: 0,
  completedCount: 0,
  cancelledCount: 0,
  pendingApprovalsCount: 0,
  cancellationRate: 0,
  mostCommonDesk: null,
  preferredSlot: 'balanced',
  daysInOfficeThisMonth: 0,
};

export const DEFAULT_SLOT_AVAILABILITY: SlotAvailability = {
  morning: true,
  afternoon: true,
  full_day: true,
  isDesignatedToOther: false,
  requiresApproval: false,
  bookedBy: {},
};
