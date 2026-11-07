import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  User, 
  Location, 
  Desk, 
  Booking, 
  SlotType, 
  SlotAvailability, 
  UserStats,
  FloorElement,
  DeskAllocationType
} from '../types/deskBooking';
import { getTodayIsoDate, getCurrentYearMonth } from '../utils/dateUtils';
import { getCurrentIdToken, subscribeToAuthChanges } from '../services/authService';
import {
  fetchUsers,
  fetchLocations,
  fetchDesks,
  fetchBookings,
  upsertCurrentUser,
  createUserApi,
  createLocationApi,
  updateLocationApi,
  deleteLocationApi,
  updateFloorElementsApi,
  createDeskApi,
  updateDeskApi,
  updateDeskAllocationApi,
  updateDeskPositionApi,
  batchUpdateDeskPositionsApi,
  deleteDeskApi,
  createBookingApi,
  cancelBookingApi,
  checkInBookingApi,
  approveBookingRequestApi,
  rejectBookingRequestApi,
  resetWorkspaceApi,
} from '../services/apiClient';

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
  
  // Hydration & API status
  isHydrating: boolean;
  apiError: string | null;
  clearApiError: () => void;
  refreshWorkspace: () => Promise<void>;

  // Reset
  resetToDefaults: () => void;
}

const EMPTY_USER: User = {
  id: '',
  name: 'Workspace Member',
  email: '',
  role: 'employee',
  department: 'General Operations',
  jobTitle: 'Team Member',
  avatarColor: 'bg-slate-600',
};

const DeskBookingContext = createContext<DeskBookingContextType | undefined>(undefined);

export const DeskBookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Users
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User>(EMPTY_USER);

  // 2. Locations
  const [locations, setLocations] = useState<Location[]>([]);
  const [currentLocationId, setCurrentLocationId] = useState<string>('');
  const [currentFloorId, setCurrentFloorId] = useState<string>('');

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
  const [desks, setDesks] = useState<Desk[]>([]);

  // 4. Bookings
  const [bookings, setBookings] = useState<Booking[]>([]);

  // 5. Active selection date & slot
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayIsoDate());
  const [selectedSlot, setSelectedSlot] = useState<SlotType>('full_day');

  // 6. Hydration & API status
  const [isHydrating, setIsHydrating] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const clearApiError = useCallback(() => {
    setApiError(null);
  }, []);

  const runAuthenticatedApi = useCallback(async <T,>(action: () => Promise<T>): Promise<T | null> => {
    try {
      const token = await getCurrentIdToken();
      if (!token) return null;
      const result = await action();
      setApiError(null);
      return result;
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Failed to communicate with booking-api.');
      return null;
    }
  }, []);

  // Hydrate workspace state from booking-api whenever a Firebase session becomes active
  const hydrateFromBackend = useCallback(async () => {
    setIsHydrating(true);
    setApiError(null);
    try {
      const [remoteUsers, remoteLocations, remoteDesks, remoteBookings] = await Promise.all([
        fetchUsers(),
        fetchLocations(),
        fetchDesks(),
        fetchBookings(),
      ]);

      setUsers(remoteUsers);
      setLocations(remoteLocations);
      setDesks(remoteDesks);
      setBookings(remoteBookings);

      if (remoteLocations.length > 0) {
        setCurrentLocationId(prevLocId => {
          const validLoc = remoteLocations.find(l => l.id === prevLocId);
          return validLoc ? validLoc.id : remoteLocations[0].id;
        });
        setCurrentFloorId(prevFloorId => {
          const validFloor = remoteLocations.some(l => l.floors.some(f => f.id === prevFloorId));
          return validFloor ? prevFloorId : remoteLocations[0].floors[0]?.id || '';
        });
      }
    } catch (err) {
      setApiError(
        err instanceof Error ? err.message : 'Unable to load workspace data from booking-api.'
      );
    } finally {
      setIsHydrating(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(fbUser => {
      if (fbUser) {
        void hydrateFromBackend();
      }
    });
    return () => {
      unsubscribe();
    };
  }, [hydrateFromBackend]);

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

    const optimisticId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newBooking: Booking = {
      id: optimisticId,
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

    void runAuthenticatedApi(() =>
      createBookingApi({
        deskId: targetDesk.id,
        date,
        slot,
        notes: justification,
        approvalReason: justification,
        isApprovalRequest: true,
      })
    ).then(res => {
      if (res?.booking) {
        setBookings(prev => prev.map(b => (b.id === optimisticId ? res.booking! : b)));
      }
    });

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

    const optimisticId = `bkg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newBooking: Booking = {
      id: optimisticId,
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

    void runAuthenticatedApi(() =>
      createBookingApi({
        deskId: targetDesk.id,
        date,
        slot,
        notes,
        isApprovalRequest: false,
      })
    ).then(res => {
      if (res?.booking) {
        setBookings(prev => prev.map(b => (b.id === optimisticId ? res.booking! : b)));
      }
    });

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

    void runAuthenticatedApi(() => approveBookingRequestApi(bookingId, note)).then(updated => {
      if (updated) {
        setBookings(prev => prev.map(b => (b.id === bookingId ? updated : b)));
      }
    });

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

    void runAuthenticatedApi(() => rejectBookingRequestApi(bookingId, reason)).then(updated => {
      if (updated) {
        setBookings(prev => prev.map(b => (b.id === bookingId ? updated : b)));
      }
    });

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

    void runAuthenticatedApi(() =>
      updateDeskAllocationApi(deskId, {
        allocationType,
        designatedUserId,
        designatedUserName,
        designatedDepartment,
        requiresApproval,
      })
    ).then(updated => {
      if (updated) {
        setDesks(prev => prev.map(d => (d.id === deskId ? updated : d)));
      }
    });
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

    void runAuthenticatedApi(() => cancelBookingApi(bookingId, reason)).then(updated => {
      if (updated) {
        setBookings(prev => prev.map(b => (b.id === bookingId ? updated : b)));
      }
    });

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

    void runAuthenticatedApi(() => checkInBookingApi(bookingId)).then(updated => {
      if (updated) {
        setBookings(prev => prev.map(b => (b.id === bookingId ? updated : b)));
      }
    });

    return true;
  };

  // Admin Location management
  const addLocation = (locData: Omit<Location, 'id'>): Location => {
    const newLoc: Location = {
      ...locData,
      id: `loc-${Date.now()}`
    };
    setLocations(prev => [...prev, newLoc]);

    void runAuthenticatedApi(() => createLocationApi(newLoc)).then(created => {
      if (created) {
        setLocations(prev => prev.map(l => (l.id === newLoc.id ? created : l)));
      }
    });

    return newLoc;
  };

  const updateLocation = (updated: Location) => {
    setLocations(prev => prev.map(l => l.id === updated.id ? updated : l));

    void runAuthenticatedApi(() => updateLocationApi(updated)).then(saved => {
      if (saved) {
        setLocations(prev => prev.map(l => (l.id === saved.id ? saved : l)));
      }
    });
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

    void runAuthenticatedApi(() => deleteLocationApi(id));
  };

  // Admin Desk management
  const addDesk = (deskData: Omit<Desk, 'id'>): Desk => {
    const newDesk: Desk = {
      ...deskData,
      id: `desk-${Date.now()}`
    };
    setDesks(prev => [...prev, newDesk]);

    void runAuthenticatedApi(() => createDeskApi(newDesk)).then(created => {
      if (created) {
        setDesks(prev => prev.map(d => (d.id === newDesk.id ? created : d)));
      }
    });

    return newDesk;
  };

  const updateDesk = (updated: Desk) => {
    setDesks(prev => prev.map(d => d.id === updated.id ? updated : d));

    void runAuthenticatedApi(() => updateDeskApi(updated)).then(saved => {
      if (saved) {
        setDesks(prev => prev.map(d => (d.id === saved.id ? saved : d)));
      }
    });
  };

  const deleteDesk = (id: string) => {
    setDesks(prev => prev.filter(d => d.id !== id));
    void runAuthenticatedApi(() => deleteDeskApi(id));
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

    void runAuthenticatedApi(() => updateDeskPositionApi(deskId, position, rotation)).then(saved => {
      if (saved) {
        setDesks(prev => prev.map(d => (d.id === deskId ? saved : d)));
      }
    });
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

    void runAuthenticatedApi(() => batchUpdateDeskPositionsApi(updates));
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

    void runAuthenticatedApi(() => updateFloorElementsApi(locationId, floorId, elements));
  };

  // Calculate User Stats
  const getUserStats = (userId: string): UserStats => {
    const todayIso = getTodayIsoDate();
    const currentYearMonth = getCurrentYearMonth();
    const userBookings = bookings.filter(b => b.userId === userId);
    const completed = userBookings.filter(b => b.status === 'checked_in' || (b.status === 'confirmed' && b.date < todayIso));
    const upcoming = userBookings.filter(b => b.status === 'confirmed' && b.date >= todayIso);
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

    // Days in office this month
    const monthDays = new Set(
      userBookings
        .filter(b => b.status !== 'cancelled' && b.status !== 'rejected' && b.status !== 'pending_approval' && b.date.startsWith(currentYearMonth))
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
      daysInOfficeThisMonth: monthDays.size
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
    setSelectedDate(getTodayIsoDate());
    setSelectedSlot('full_day');

    void runAuthenticatedApi(() => resetWorkspaceApi()).then(snapshot => {
      if (snapshot) {
        setUsers(snapshot.users);
        setLocations(snapshot.locations);
        setDesks(snapshot.desks);
        setBookings(snapshot.bookings);
        if (snapshot.locations.length > 0) {
          setCurrentLocationId(snapshot.locations[0].id);
          setCurrentFloorId(snapshot.locations[0].floors[0]?.id || '');
        }
      }
    });
  };

  const upsertUser = useCallback((user: User) => {
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

    void runAuthenticatedApi(() =>
      user.id.startsWith('usr-custom-')
        ? createUserApi(user)
        : upsertCurrentUser(user)
    ).then(saved => {
      if (saved) {
        setUsers(prev => {
          const idx = prev.findIndex(
            u => u.id === saved.id || u.email.toLowerCase() === saved.email.toLowerCase()
          );
          if (idx === -1) return [...prev, saved];
          const next = [...prev];
          next[idx] = saved;
          return next;
        });
        setCurrentUser(saved);
      }
    });
  }, [runAuthenticatedApi]);

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
        isHydrating,
        apiError,
        clearApiError,
        refreshWorkspace: hydrateFromBackend,
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
