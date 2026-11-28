import { useState, useEffect, useCallback } from 'react';
import type { Booking, Location, SlotAvailability, UserStats } from '../types/deskBooking';
import {
  DEFAULT_SLOT_AVAILABILITY,
  DEFAULT_USER_STATS,
  type LocationOccupancy,
} from '../context/deskBookingTypes';
import { formatIsoDate, getTodayIsoDate } from '../utils/dateUtils';
import { getCurrentIdToken } from '../services/authService';
import {
  fetchDesksAvailability,
  fetchLocationColleagues,
  fetchLocationOccupancy,
  fetchLocationOccupancyRange,
  fetchUserStats,
} from '../services/apiClient';

export interface WorkspaceAnalyticsParams {
  currentLocationId: string;
  locations: Location[];
  selectedDate: string;
  currentUserId: string;
  dataVersion: number;
}

export interface WorkspaceAnalyticsSnapshot {
  availabilityByKey: Record<string, SlotAvailability>;
  occupancyByKey: Record<string, LocationOccupancy>;
  userStatsByUserId: Record<string, UserStats>;
  colleaguesByKey: Record<string, Booking[]>;
}

export function buildAvailabilityCacheKey(deskId: string, date: string): string {
  return `${date}:${deskId}`;
}

export function buildLocationDateCacheKey(locationId: string, date: string): string {
  return `${locationId}:${date}`;
}

export async function loadWorkspaceAnalyticsSnapshot(params: {
  currentLocationId: string;
  advanceBookingDaysLimit: number;
  selectedDate: string;
  currentUserId: string;
}): Promise<WorkspaceAnalyticsSnapshot | null> {
  const token = await getCurrentIdToken();
  if (!token) return null;

  const { currentLocationId, advanceBookingDaysLimit, selectedDate, currentUserId } = params;
  const todayIso = getTodayIsoDate();
  const todayDateObj = new Date(`${todayIso}T00:00:00`);
  const tomorrowDateObj = new Date(todayDateObj);
  tomorrowDateObj.setDate(todayDateObj.getDate() + 1);
  const tomorrowIso = formatIsoDate(tomorrowDateObj);

  const rangeEndObj = new Date(todayDateObj);
  rangeEndObj.setDate(todayDateObj.getDate() + Math.max(0, (advanceBookingDaysLimit || 30) - 1));
  const rangeEndIso = formatIsoDate(rangeEndObj);

  const availabilityDates = Array.from(
    new Set([selectedDate, todayIso, tomorrowIso].filter(Boolean))
  );
  const colleagueDates = Array.from(new Set([todayIso, selectedDate].filter(Boolean)));

  const availabilityByKey: Record<string, SlotAvailability> = {};
  const occupancyByKey: Record<string, LocationOccupancy> = {};
  const userStatsByUserId: Record<string, UserStats> = {};
  const colleaguesByKey: Record<string, Booking[]> = {};

  const tasks: Promise<void>[] = [];

  if (currentLocationId) {
    for (const date of availabilityDates) {
      tasks.push(
        fetchDesksAvailability({ date, locationId: currentLocationId }).then(map => {
          for (const [deskId, availability] of Object.entries(map)) {
            availabilityByKey[buildAvailabilityCacheKey(deskId, date)] = availability;
          }
        })
      );
    }

    tasks.push(
      fetchLocationOccupancyRange(currentLocationId, todayIso, rangeEndIso).then(rangeMap => {
        for (const [date, occ] of Object.entries(rangeMap)) {
          occupancyByKey[buildLocationDateCacheKey(currentLocationId, date)] = occ;
        }
      })
    );

    if (selectedDate && (selectedDate < todayIso || selectedDate > rangeEndIso)) {
      tasks.push(
        fetchLocationOccupancy(currentLocationId, selectedDate).then(occ => {
          occupancyByKey[buildLocationDateCacheKey(currentLocationId, selectedDate)] = occ;
        })
      );
    }

    for (const date of colleagueDates) {
      tasks.push(
        fetchLocationColleagues(currentLocationId, date).then(list => {
          colleaguesByKey[buildLocationDateCacheKey(currentLocationId, date)] = list;
        })
      );
    }
  }

  if (currentUserId) {
    tasks.push(
      fetchUserStats(currentUserId).then(stats => {
        userStatsByUserId[currentUserId] = stats;
      })
    );
  }

  await Promise.all(tasks);

  return {
    availabilityByKey,
    occupancyByKey,
    userStatsByUserId,
    colleaguesByKey,
  };
}

export function useWorkspaceAnalytics({
  currentLocationId,
  locations,
  selectedDate,
  currentUserId,
  dataVersion,
}: WorkspaceAnalyticsParams) {
  const [availabilityByKey, setAvailabilityByKey] = useState<Record<string, SlotAvailability>>({});
  const [occupancyByKey, setOccupancyByKey] = useState<Record<string, LocationOccupancy>>({});
  const [userStatsByUserId, setUserStatsByUserId] = useState<Record<string, UserStats>>({});
  const [colleaguesByKey, setColleaguesByKey] = useState<Record<string, Booking[]>>({});

  const activeLocation = locations.find(l => l.id === currentLocationId) || locations[0];
  const advanceBookingDaysLimit = activeLocation?.advanceBookingDaysLimit ?? 30;

  useEffect(() => {
    if (!currentLocationId && !currentUserId) return;

    let cancelled = false;

    void loadWorkspaceAnalyticsSnapshot({
      currentLocationId,
      advanceBookingDaysLimit,
      selectedDate,
      currentUserId,
    })
      .then(snapshot => {
        if (cancelled || !snapshot) return;
        setAvailabilityByKey(prev => ({ ...prev, ...snapshot.availabilityByKey }));
        setOccupancyByKey(prev => ({ ...prev, ...snapshot.occupancyByKey }));
        setUserStatsByUserId(prev => ({ ...prev, ...snapshot.userStatsByUserId }));
        setColleaguesByKey(prev => ({ ...prev, ...snapshot.colleaguesByKey }));
      })
      .catch(() => {
        // Primary API/hydration errors are surfaced via useWorkspaceData.apiError
      });

    return () => {
      cancelled = true;
    };
  }, [currentLocationId, advanceBookingDaysLimit, selectedDate, currentUserId, dataVersion]);

  const getDeskAvailability = useCallback(
    (deskId: string, date: string): SlotAvailability => {
      return availabilityByKey[buildAvailabilityCacheKey(deskId, date)] ?? DEFAULT_SLOT_AVAILABILITY;
    },
    [availabilityByKey]
  );

  const getLocationOccupancy = useCallback(
    (locationId: string, date: string): LocationOccupancy => {
      return occupancyByKey[buildLocationDateCacheKey(locationId, date)] ?? {
        total: 0,
        booked: 0,
        rate: 0,
      };
    },
    [occupancyByKey]
  );

  const getUserStats = useCallback(
    (userId: string): UserStats => {
      return userStatsByUserId[userId] ?? DEFAULT_USER_STATS;
    },
    [userStatsByUserId]
  );

  const getColleaguesInOfficeToday = useCallback(
    (locationId: string, date: string): Booking[] => {
      return colleaguesByKey[buildLocationDateCacheKey(locationId, date)] ?? [];
    },
    [colleaguesByKey]
  );

  return {
    getDeskAvailability,
    getLocationOccupancy,
    getUserStats,
    getColleaguesInOfficeToday,
  };
}
