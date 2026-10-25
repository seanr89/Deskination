export type Role = 'employee' | 'admin';

export type SlotType = 'morning' | 'afternoon' | 'full_day';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  jobTitle: string;
  avatarColor: string;
}

export type DeskType = 
  | 'standing'
  | 'standard'
  | 'dual_screen'
  | 'ultrawide'
  | 'quiet_booth'
  | 'window_view';

export interface DeskPosition {
  x: number; // percentage 0-100 on floorplan
  y: number; // percentage 0-100 on floorplan
}

export type DeskAllocationType = 'unreserved' | 'designated' | 'requires_approval';

export interface Desk {
  id: string;
  code: string; // e.g. "LDN-401"
  name: string; // e.g. "Desk 401 - Focus Pod"
  locationId: string;
  floorId: string;
  zoneId: string;
  deskType: DeskType;
  allocationType?: DeskAllocationType; // 'unreserved' (hot desk) | 'designated' (assigned) | 'requires_approval'
  designatedUserId?: string; // If assigned to a permanent/designated employee
  designatedUserName?: string;
  designatedDepartment?: string; // If reserved for a specific team (e.g. Executive, Platform, Sales)
  requiresApproval?: boolean; // Requires office manager approval before confirmation
  equipment: string[];
  status: 'active' | 'maintenance';
  position: DeskPosition;
  rotation?: number; // 0, 90, 180, 270 degrees
  notes?: string;
}

export interface Zone {
  id: string;
  floorId: string;
  name: string;
  code: string;
  description: string;
}

export interface FloorElement {
  id: string;
  name: string;
  type: 'room' | 'entrance' | 'kitchen' | 'restroom' | 'stairs' | 'window' | 'wall' | 'zone_label';
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  width: number; // percentage
  height: number; // percentage
  label?: string;
}

export interface Floor {
  id: string;
  locationId: string;
  name: string;
  level: number;
  zones: Zone[];
  elements?: FloorElement[];
}

export interface Location {
  id: string;
  name: string;
  city: string;
  country: string;
  address: string;
  timezone: string;
  floors: Floor[];
  advanceBookingDaysLimit: number; // e.g. 30 days
  openingHours: string;
  description: string;
}

export type BookingStatus = 'confirmed' | 'cancelled' | 'checked_in' | 'pending_approval' | 'rejected';

export interface Booking {
  id: string;
  deskId: string;
  deskCode: string;
  deskName: string;
  locationId: string;
  locationName: string;
  floorId: string;
  floorName: string;
  userId: string;
  userName: string;
  userEmail: string;
  userDepartment: string;
  date: string; // YYYY-MM-DD
  slot: SlotType;
  status: BookingStatus;
  createdAt: string; // ISO string
  cancelledAt?: string;
  checkInAt?: string;
  notes?: string;
  approvalReason?: string; // employee's justification for requested reservation
  reviewedBy?: string; // office manager who approved/rejected
  reviewedAt?: string;
  reviewNotes?: string;
}

export interface SlotAvailability {
  morning: boolean;
  afternoon: boolean;
  full_day: boolean;
  isDesignatedToOther?: boolean;
  designatedUser?: string;
  requiresApproval?: boolean;
  bookedBy?: {
    morning?: { userName: string; department: string };
    afternoon?: { userName: string; department: string };
    full_day?: { userName: string; department: string };
  };
}

export interface UserStats {
  totalBookings: number;
  upcomingCount: number;
  completedCount: number;
  cancelledCount: number;
  pendingApprovalsCount: number;
  cancellationRate: number; // percentage
  mostCommonDesk: {
    deskCode: string;
    deskName: string;
    count: number;
  } | null;
  preferredSlot: SlotType | 'balanced';
  daysInOfficeThisMonth: number;
}
