import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { 
  User, 
  Location, 
  Desk, 
  Booking, 
  SlotType, 
  SlotAvailability, 
  UserStats,
  Role,
  FloorElement,
  DeskAllocationType
} from '../types/deskBooking';
import { INITIAL_USERS, INITIAL_LOCATIONS, INITIAL_DESKS, INITIAL_BOOKINGS } from '../mock/initialData';

interface DeskBookingContextType {
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
  bookDesk: (deskId: string, date: string, slot: SlotType, notes?: string) => { success: boolean; message: string; booking?: Booking };
  requestDeskBooking: (deskId: string, date: string, slot: SlotType, justification: string) => { success: boolean; message: string; booking?: Booking };
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
  updateDeskPosition: (deskId: string, position: { x: number; y: number }, rotation?: number) => void;
  batchUpdateDeskPositions: (updates: { id: string; position: { x: number; y: number }; rotation?: number }[]) => void;
  updateFloorElements: (locationId: string, floorId: string, elements: FloorElement[]) => void;
  
  // Analytics & Availability
  getUserStats: (userId: string) => UserStats;
  getDeskAvailability: (deskId: string, date: string) => SlotAvailability;
  getLocationOccupancy: (locationId: string, date: string) => { total: number; booked: number; rate: number };
  getColleaguesInOfficeToday: (locationId: string, date: string) => Booking[];
  
  // Reset
  resetToDefaults: () => void;
}

const STORAGE_KEY_USERS = 'flexdesk_users_v1';
const STORAGE_KEY_LOCATIONS = 'flexdesk_locations_v1';
const STORAGE_KEY_DESKS = 'flexdesk_desks_v1';
const STORAGE_KEY_BOOKINGS = 'flexdesk_bookings_v1';
const STORAGE_KEY_CURRENT_USER = 'flexdesk_current_user_v1';

const DeskBookingContext = createContext<DeskBookingContextType | undefined>(undefined);

export const DeskBookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Users
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_USERS);
      return stored ? JSON.parse(stored) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });

  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
      if (stored) {
        const parsed = JSON.parse(stored);
        const match = users.find(u => u.id === parsed.id);
        return match || users[0];
      }
    } catch {
      // fallback
    }
    return users[0];
  });

  // 2. Locations
  const [locations, setLocations] = useState<Location[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_LOCATIONS);
      return stored ? JSON.parse(stored) : INITIAL_LOCATIONS;
    } catch {
      return INITIAL_LOCATIONS;
    }
  });

  const [currentLocationId, setCurrentLocationId] = useState<string>(() => {
    return locations[0]?.id || 'loc-london';
  });

  const [currentFloorId, setCurrentFloorId] = useState<string>(() => {
    return locations[0]?.floors[0]?.id || 'flr-ldn-4';
  });

  // Keep floor ID synchronized when location changes
  useEffect(() => {
    const loc = locations.find(l => l.id === currentLocationId);
    if (loc && loc.floors.length > 0) {
      const exists = loc.floors.some(f => f.id === currentFloorId);
      if (!exists) {
        setCurrentFloorId(loc.floors[0].id);
      }
    }
  }, [currentLocationId, locations, currentFloorId]);

  // 3. Desks
  const [desks, setDesks] = useState<Desk[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_DESKS);
      return stored ? JSON.parse(stored) : INITIAL_DESKS;
    } catch {
      return INITIAL_DESKS;
    }
  });

  // 4. Bookings
  const [bookings, setBookings] = useState<Booking[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_BOOKINGS);
      return stored ? JSON.parse(stored) : INITIAL_BOOKINGS;
    } catch {
      return INITIAL_BOOKINGS;
    }
  });

  // 5. Active selection date & slot (today's baseline 2026-10-25)
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-25');
  const [selectedSlot, setSelectedSlot] = useState<SlotType>('full_day');

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LOCATIONS, JSON.stringify(locations));
  }, [locations]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_DESKS, JSON.stringify(desks));
  }, [desks]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(currentUser));
  }, [currentUser]);

  // Desk slot availability calculator
  const getDeskAvailability = (deskId: string, date: string): SlotAvailability => {
    const targetDesk = desks.find(d => d.id === deskId);
    let isDesignatedToOther = false;
    let designatedUser: string | undefined = undefined;
    let requiresApproval = false;

    if (targetDesk) {
      if (targetDesk.allocationType === 'designated') {
        if (targetDesk.designatedUserId && targetDesk.designatedUserId !== currentUser.id) {
          isDesignatedToOther = true;
          designatedUser = targetDesk.designatedUserName;
        } else if (targetDesk.designatedDepartment && targetDesk.designatedDepartment !== currentUser.department) {
          isDesignatedToOther = true;
          designatedUser = targetDesk.designatedDepartment;
        }
      }
      if (targetDesk.requiresApproval || targetDesk.allocationType === 'requires_approval') {
        requiresApproval = true;
      }
    }

    const activeBookings = bookings.filter(
      b => b.deskId === deskId && b.date === date && b.status !== 'cancelled' && b.status !== 'rejected'
    );

    let morningAvail = true;
    let afternoonAvail = true;
    let fullDayAvail = true;
    const bookedBy: SlotAvailability['bookedBy'] = {};

    for (const b of activeBookings) {
      if (b.slot === 'full_day') {
        morningAvail = false;
        afternoonAvail = false;
        fullDayAvail = false;
        bookedBy.full_day = { userName: b.userName, department: b.userDepartment };
        bookedBy.morning = { userName: b.userName, department: b.userDepartment };
        bookedBy.afternoon = { userName: b.userName, department: b.userDepartment };
      } else if (b.slot === 'morning') {
        morningAvail = false;
        fullDayAvail = false;
        bookedBy.morning = { userName: b.userName, department: b.userDepartment };
      } else if (b.slot === 'afternoon') {
        afternoonAvail = false;
        fullDayAvail = false;
        bookedBy.afternoon = { userName: b.userName, department: b.userDepartment };
      }
    }

    return {
      morning: morningAvail,
      afternoon: afternoonAvail,
      full_day: fullDayAvail,
      isDesignatedToOther,
      designatedUser,
      requiresApproval,
      bookedBy
    };
  };

  // Request a desk reservation (for desks requiring manager approval)
  const requestDeskBooking = (deskId: string, date: string, slot: SlotType, justification: string) => {
    const targetDesk = desks.find(d => d.id === deskId);
    if (!targetDesk) {
      return { success: false, message: 'Desk not found.' };
    }

    if (targetDesk.status === 'maintenance') {
      return { success: false, message: 'This desk is currently undergoing maintenance and cannot be requested.' };
    }

    const avail = getDeskAvailability(deskId, date);
    if (slot === 'morning' && !avail.morning) {
      return { success: false, message: 'Desk is already occupied for the morning period.' };
    }
    if (slot === 'afternoon' && !avail.afternoon) {
      return { success: false, message: 'Desk is already occupied for the afternoon period.' };
    }
    if (slot === 'full_day' && !avail.full_day) {
      return { success: false, message: 'Desk is not available for a full day booking.' };
    }

    // Check user existing booking on date
    const userExistingBooking = bookings.find(b => 
      b.userId === currentUser.id && 
      b.date === date && 
      b.status !== 'cancelled' &&
      b.status !== 'rejected' &&
      (b.slot === 'full_day' || slot === 'full_day' || b.slot === slot)
    );

    if (userExistingBooking) {
      return { 
        success: false, 
        message: `You already have an active reservation or pending request on this date (${userExistingBooking.deskCode}).` 
      };
    }

    const loc = locations.find(l => l.id === targetDesk.locationId);
    const floor = loc?.floors.find(f => f.id === targetDesk.floorId);

    const newBooking: Booking = {
      id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      deskId: targetDesk.id,
      deskCode: targetDesk.code,
      deskName: targetDesk.name,
      locationId: targetDesk.locationId,
      locationName: loc?.name || 'Main Office',
      floorId: targetDesk.floorId,
      floorName: floor?.name || 'Level 1',
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      userDepartment: currentUser.department,
      date,
      slot,
      status: 'pending_approval',
      createdAt: new Date().toISOString(),
      notes: justification,
      approvalReason: justification
    };

    setBookings(prev => [newBooking, ...prev]);
    return { 
      success: true, 
      message: `Reservation request for ${targetDesk.code} submitted to office management! You will be notified once reviewed.`, 
      booking: newBooking 
    };
  };

  // Instant booking action (for unreserved desks or designated user)
  const bookDesk = (deskId: string, date: string, slot: SlotType, notes?: string) => {
    const targetDesk = desks.find(d => d.id === deskId);
    if (!targetDesk) {
      return { success: false, message: 'Desk not found.' };
    }

    if (targetDesk.status === 'maintenance') {
      return { success: false, message: 'This desk is currently undergoing maintenance and cannot be booked.' };
    }

    const avail = getDeskAvailability(deskId, date);

    // Designated desk protection for non-admins
    if (avail.isDesignatedToOther && currentUser.role !== 'admin') {
      return {
        success: false,
        message: `This workstation is designated for ${avail.designatedUser || 'another colleague'}. You may submit an approval request or select an unreserved hot desk.`
      };
    }

    // If desk requires approval and user is not admin, route to request workflow
    if (avail.requiresApproval && currentUser.role !== 'admin') {
      return requestDeskBooking(deskId, date, slot, notes || 'Standard reservation request for restricted workstation.');
    }

    // Check availability
    if (slot === 'morning' && !avail.morning) {
      return { success: false, message: 'Desk is already reserved for the morning period.' };
    }
    if (slot === 'afternoon' && !avail.afternoon) {
      return { success: false, message: 'Desk is already reserved for the afternoon period.' };
    }
    if (slot === 'full_day' && !avail.full_day) {
      return { success: false, message: 'Desk is not available for a full day booking.' };
    }

    // Check if current user already has a booking for the same slot on this date
    const userExistingBooking = bookings.find(b => 
      b.userId === currentUser.id && 
      b.date === date && 
      b.status !== 'cancelled' &&
      b.status !== 'rejected' &&
      (b.slot === 'full_day' || slot === 'full_day' || b.slot === slot)
    );

    if (userExistingBooking) {
      return { 
        success: false, 
        message: `You already have an active booking on this date (${userExistingBooking.deskCode} - ${userExistingBooking.slot.replace('_', ' ')}). Please cancel your existing booking first.` 
      };
    }

    const loc = locations.find(l => l.id === targetDesk.locationId);
    const floor = loc?.floors.find(f => f.id === targetDesk.floorId);

    const newBooking: Booking = {
      id: `bkg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      deskId: targetDesk.id,
      deskCode: targetDesk.code,
      deskName: targetDesk.name,
      locationId: targetDesk.locationId,
      locationName: loc?.name || 'Main Office',
      floorId: targetDesk.floorId,
      floorName: floor?.name || 'Level 1',
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      userDepartment: currentUser.department,
      date,
      slot,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      notes
    };

    setBookings(prev => [newBooking, ...prev]);
    return { success: true, message: `Successfully booked ${targetDesk.code} for ${slot.replace('_', ' ')}!`, booking: newBooking };
  };

  // Manager Approve Request
  const approveBookingRequest = (bookingId: string, note?: string) => {
    setBookings(prev => prev.map(b => {
      if (b.id === bookingId) {
        return {
          ...b,
          status: 'confirmed',
          reviewedBy: currentUser.name,
          reviewedAt: new Date().toISOString(),
          reviewNotes: note || 'Approved by office manager'
        };
      }
      return b;
    }));
    return true;
  };

  // Manager Reject Request
  const rejectBookingRequest = (bookingId: string, reason: string) => {
    setBookings(prev => prev.map(b => {
      if (b.id === bookingId) {
        return {
          ...b,
          status: 'rejected',
          reviewedBy: currentUser.name,
          reviewedAt: new Date().toISOString(),
          reviewNotes: reason || 'Declined by office manager'
        };
      }
      return b;
    }));
    return true;
  };

  // Manager Update Desk Allocation Policy
  const updateDeskAllocation = (
    deskId: string, 
    allocationType: DeskAllocationType, 
    designatedUserId?: string, 
    designatedUserName?: string, 
    designatedDepartment?: string, 
    requiresApproval?: boolean
  ) => {
    setDesks(prev => prev.map(d => {
      if (d.id === deskId) {
        return {
          ...d,
          allocationType,
          designatedUserId: allocationType === 'designated' ? designatedUserId : undefined,
          designatedUserName: allocationType === 'designated' ? designatedUserName : undefined,
          designatedDepartment: allocationType === 'designated' ? designatedDepartment : undefined,
          requiresApproval: allocationType === 'requires_approval' ? true : requiresApproval
        };
      }
      return d;
    }));
  };

  // Cancel booking
  const cancelBooking = (bookingId: string, reason?: string) => {
    setBookings(prev => prev.map(b => {
      if (b.id === bookingId) {
        return {
          ...b,
          status: 'cancelled',
          cancelledAt: new Date().toISOString(),
          notes: reason ? `${b.notes ? b.notes + ' | ' : ''}Cancellation: ${reason}` : b.notes
        };
      }
      return b;
    }));
    return true;
  };

  // Check-in booking
  const checkInBooking = (bookingId: string) => {
    setBookings(prev => prev.map(b => {
      if (b.id === bookingId) {
        return {
          ...b,
          status: 'checked_in',
          checkInAt: new Date().toISOString()
        };
      }
      return b;
    }));
    return true;
  };

  // Admin Location management
  const addLocation = (locData: Omit<Location, 'id'>): Location => {
    const newLoc: Location = {
      ...locData,
      id: `loc-${Date.now()}`
    };
    setLocations(prev => [...prev, newLoc]);
    return newLoc;
  };

  const updateLocation = (updated: Location) => {
    setLocations(prev => prev.map(l => l.id === updated.id ? updated : l));
  };

  const deleteLocation = (id: string) => {
    setLocations(prev => prev.filter(l => l.id !== id));
    setDesks(prev => prev.filter(d => d.locationId !== id));
    setBookings(prev => prev.filter(b => b.locationId !== id));
    if (currentLocationId === id) {
      const remaining = locations.filter(l => l.id !== id);
      if (remaining.length > 0) {
        setCurrentLocationId(remaining[0].id);
      }
    }
  };

  // Admin Desk management
  const addDesk = (deskData: Omit<Desk, 'id'>): Desk => {
    const newDesk: Desk = {
      ...deskData,
      id: `desk-${Date.now()}`
    };
    setDesks(prev => [...prev, newDesk]);
    return newDesk;
  };

  const updateDesk = (updated: Desk) => {
    setDesks(prev => prev.map(d => d.id === updated.id ? updated : d));
  };

  const deleteDesk = (id: string) => {
    setDesks(prev => prev.filter(d => d.id !== id));
  };

  // Layout editing methods
  const updateDeskPosition = (deskId: string, position: { x: number; y: number }, rotation?: number) => {
    setDesks(prev => prev.map(d => {
      if (d.id === deskId) {
        return {
          ...d,
          position,
          rotation: rotation !== undefined ? rotation : d.rotation
        };
      }
      return d;
    }));
  };

  const batchUpdateDeskPositions = (updates: { id: string; position: { x: number; y: number }; rotation?: number }[]) => {
    const updateMap = new Map(updates.map(u => [u.id, u]));
    setDesks(prev => prev.map(d => {
      const match = updateMap.get(d.id);
      if (match) {
        return {
          ...d,
          position: match.position,
          rotation: match.rotation !== undefined ? match.rotation : d.rotation
        };
      }
      return d;
    }));
  };

  const updateFloorElements = (locationId: string, floorId: string, elements: FloorElement[]) => {
    setLocations(prev => prev.map(loc => {
      if (loc.id === locationId) {
        return {
          ...loc,
          floors: loc.floors.map(fl => {
            if (fl.id === floorId) {
              return { ...fl, elements };
            }
            return fl;
          })
        };
      }
      return loc;
    }));
  };

  // Calculate User Stats
  const getUserStats = (userId: string): UserStats => {
    const userBookings = bookings.filter(b => b.userId === userId);
    const completed = userBookings.filter(b => b.status === 'checked_in' || (b.status === 'confirmed' && b.date < '2026-10-25'));
    const upcoming = userBookings.filter(b => b.status === 'confirmed' && b.date >= '2026-10-25');
    const cancelled = userBookings.filter(b => b.status === 'cancelled');
    const pendingApprovals = userBookings.filter(b => b.status === 'pending_approval');

    const total = userBookings.length;
    const cancellationRate = total > 0 ? Math.round((cancelled.length / total) * 100) : 0;

    // Most common desk
    const deskCounts: Record<string, { code: string; name: string; count: number }> = {};
    for (const b of userBookings.filter(b => b.status !== 'cancelled' && b.status !== 'rejected')) {
      if (!deskCounts[b.deskId]) {
        deskCounts[b.deskId] = { code: b.deskCode, name: b.deskName, count: 0 };
      }
      deskCounts[b.deskId].count++;
    }

    let mostCommonDesk: UserStats['mostCommonDesk'] = null;
    let maxCount = 0;
    for (const key in deskCounts) {
      if (deskCounts[key].count > maxCount) {
        maxCount = deskCounts[key].count;
        mostCommonDesk = {
          deskCode: deskCounts[key].code,
          deskName: deskCounts[key].name,
          count: deskCounts[key].count
        };
      }
    }

    // Preferred slot
    let morningCount = 0;
    let afternoonCount = 0;
    let fullDayCount = 0;
    for (const b of userBookings.filter(b => b.status !== 'cancelled' && b.status !== 'rejected')) {
      if (b.slot === 'morning') morningCount++;
      else if (b.slot === 'afternoon') afternoonCount++;
      else fullDayCount++;
    }

    let preferredSlot: SlotType | 'balanced' = 'balanced';
    if (fullDayCount > morningCount && fullDayCount > afternoonCount) preferredSlot = 'full_day';
    else if (morningCount > fullDayCount && morningCount > afternoonCount) preferredSlot = 'morning';
    else if (afternoonCount > fullDayCount && afternoonCount > morningCount) preferredSlot = 'afternoon';

    // Days in office in October 2026
    const octDays = new Set(
      userBookings
        .filter(b => b.status !== 'cancelled' && b.status !== 'rejected' && b.status !== 'pending_approval' && b.date.startsWith('2026-10'))
        .map(b => b.date)
    );

    return {
      totalBookings: total,
      upcomingCount: upcoming.length,
      completedCount: completed.length,
      cancelledCount: cancelled.length,
      pendingApprovalsCount: pendingApprovals.length,
      cancellationRate,
      mostCommonDesk,
      preferredSlot,
      daysInOfficeThisMonth: octDays.size
    };
  };

  // Location Occupancy for a given date
  const getLocationOccupancy = (locationId: string, date: string) => {
    const activeDesksInLoc = desks.filter(d => d.locationId === locationId && d.status === 'active');
    const total = activeDesksInLoc.length;
    if (total === 0) return { total: 0, booked: 0, rate: 0 };

    const bookedDeskIds = new Set(
      bookings
        .filter(b => b.locationId === locationId && b.date === date && b.status !== 'cancelled')
        .map(b => b.deskId)
    );

    const booked = bookedDeskIds.size;
    const rate = Math.round((booked / total) * 100);

    return { total, booked, rate };
  };

  // Colleagues in office for date & location
  const getColleaguesInOfficeToday = (locationId: string, date: string): Booking[] => {
    return bookings.filter(b => 
      b.locationId === locationId && 
      b.date === date && 
      b.status !== 'cancelled'
    );
  };

  // Reset to original seed data
  const resetToDefaults = () => {
    localStorage.removeItem(STORAGE_KEY_USERS);
    localStorage.removeItem(STORAGE_KEY_LOCATIONS);
    localStorage.removeItem(STORAGE_KEY_DESKS);
    localStorage.removeItem(STORAGE_KEY_BOOKINGS);
    localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
    setUsers(INITIAL_USERS);
    setCurrentUser(INITIAL_USERS[0]);
    setLocations(INITIAL_LOCATIONS);
    setCurrentLocationId(INITIAL_LOCATIONS[0].id);
    setCurrentFloorId(INITIAL_LOCATIONS[0].floors[0].id);
    setDesks(INITIAL_DESKS);
    setBookings(INITIAL_BOOKINGS);
    setSelectedDate('2026-10-25');
    setSelectedSlot('full_day');
  };

  const upsertUser = (user: User) => {
    setUsers(prev => {
      const idx = prev.findIndex(
        u => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase()
      );
      if (idx === -1) {
        return [...prev, user];
      }
      const next = [...prev];
      next[idx] = { ...next[idx], ...user };
      return next;
    });
    setCurrentUser(user);
  };

  return (
    <DeskBookingContext.Provider
      value={{
        users,
        currentUser,
        setCurrentUser,
        upsertUser,
        locations,
        currentLocationId,
        setCurrentLocationId,
        currentFloorId,
        setCurrentFloorId,
        desks,
        bookings,
        selectedDate,
        setSelectedDate,
        selectedSlot,
        setSelectedSlot,
        bookDesk,
        requestDeskBooking,
        cancelBooking,
        checkInBooking,
        approveBookingRequest,
        rejectBookingRequest,
        updateDeskAllocation,
        addLocation,
        updateLocation,
        deleteLocation,
        addDesk,
        updateDesk,
        deleteDesk,
        updateDeskPosition,
        batchUpdateDeskPositions,
        updateFloorElements,
        getUserStats,
        getDeskAvailability,
        getLocationOccupancy,
        getColleaguesInOfficeToday,
        resetToDefaults
      }}
    >
      {children}
    </DeskBookingContext.Provider>
  );
};

export const useDeskBooking = () => {
  const context = useContext(DeskBookingContext);
  if (!context) {
    throw new Error('useDeskBooking must be used within a DeskBookingProvider');
  }
  return context;
};
