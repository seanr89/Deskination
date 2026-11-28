import { useState, useEffect, useCallback } from 'react';
import type { Booking, Desk, Location, SlotType, User } from '../types/deskBooking';
import { EMPTY_USER, type DeskBookingProviderProps } from '../context/deskBookingTypes';
import { getTodayIsoDate } from '../utils/dateUtils';
import { getCurrentIdToken, subscribeToAuthChanges } from '../services/authService';
import {
  ApiError,
  createUserApi,
  fetchBookings,
  fetchDesks,
  fetchLocations,
  fetchUsers,
  upsertCurrentUser,
} from '../services/apiClient';

export function extractApiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    return err.serverMessage || err.message;
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}

export function useWorkspaceData(props: Omit<DeskBookingProviderProps, 'children'>) {
  const {
    initialUsers = [],
    initialCurrentUser = EMPTY_USER,
    initialLocations = [],
    initialDesks = [],
    initialBookings = [],
  } = props;

  const [users, setUsers] = useState<User[]>(initialUsers);
  const [currentUser, setCurrentUser] = useState<User>(initialCurrentUser);
  const [locations, setLocations] = useState<Location[]>(initialLocations);
  const [currentLocationId, setCurrentLocationId] = useState<string>(
    () => initialLocations[0]?.id ?? ''
  );
  const [currentFloorId, setCurrentFloorId] = useState<string>(
    () => initialLocations[0]?.floors?.[0]?.id ?? ''
  );
  const [desks, setDesks] = useState<Desk[]>(initialDesks);
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayIsoDate());
  const [selectedSlot, setSelectedSlot] = useState<SlotType>('full_day');
  const [isHydrating, setIsHydrating] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [dataVersion, setDataVersion] = useState<number>(0);

  const bumpDataVersion = useCallback(() => {
    setDataVersion(v => v + 1);
  }, []);

  const clearApiError = useCallback(() => {
    setApiError(null);
  }, []);

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

  const runAuthenticatedApi = useCallback(
    async <T,>(action: () => Promise<T>, onError?: () => void): Promise<T | null> => {
      try {
        const token = await getCurrentIdToken();
        if (!token) return null;
        const result = await action();
        setApiError(null);
        return result;
      } catch (err) {
        setApiError(extractApiErrorMessage(err, 'Failed to communicate with booking-api.'));
        onError?.();
        return null;
      }
    },
    []
  );

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
      bumpDataVersion();

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
        extractApiErrorMessage(err, 'Unable to load workspace data from booking-api.')
      );
    } finally {
      setIsHydrating(false);
    }
  }, [bumpDataVersion]);

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

  const upsertUser = useCallback(
    (user: User) => {
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
        user.id.startsWith('usr-custom-') ? createUserApi(user) : upsertCurrentUser(user)
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
          bumpDataVersion();
        }
      });
    },
    [runAuthenticatedApi, bumpDataVersion]
  );

  return {
    users,
    setUsers,
    currentUser,
    setCurrentUser,
    upsertUser,
    locations,
    setLocations,
    currentLocationId,
    setCurrentLocationId,
    currentFloorId,
    setCurrentFloorId,
    desks,
    setDesks,
    bookings,
    setBookings,
    selectedDate,
    setSelectedDate,
    selectedSlot,
    setSelectedSlot,
    isHydrating,
    apiError,
    setApiError,
    clearApiError,
    dataVersion,
    bumpDataVersion,
    runAuthenticatedApi,
    hydrateFromBackend,
  };
}
