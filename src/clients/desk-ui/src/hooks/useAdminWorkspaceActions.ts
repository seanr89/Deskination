import { useCallback, useRef } from 'react';
import type React from 'react';
import type {
  Booking,
  Desk,
  DeskAllocationType,
  FloorElement,
  Location,
  SlotType,
  User,
} from '../types/deskBooking';
import { getTodayIsoDate } from '../utils/dateUtils';
import {
  batchUpdateDeskPositionsApi,
  createDeskApi,
  createLocationApi,
  deleteDeskApi,
  deleteLocationApi,
  resetWorkspaceApi,
  updateDeskAllocationApi,
  updateDeskApi,
  updateDeskPositionApi,
  updateFloorElementsApi,
  updateLocationApi,
} from '../services/apiClient';

export interface UseAdminWorkspaceActionsParams {
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  locations: Location[];
  setLocations: React.Dispatch<React.SetStateAction<Location[]>>;
  currentLocationId: string;
  setCurrentLocationId: React.Dispatch<React.SetStateAction<string>>;
  currentFloorId: string;
  setCurrentFloorId: React.Dispatch<React.SetStateAction<string>>;
  desks: Desk[];
  setDesks: React.Dispatch<React.SetStateAction<Desk[]>>;
  bookings: Booking[];
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
  setSelectedDate: React.Dispatch<React.SetStateAction<string>>;
  setSelectedSlot: React.Dispatch<React.SetStateAction<SlotType>>;
  bumpDataVersion: () => void;
  runAuthenticatedApi: <T>(action: () => Promise<T>, onError?: () => void) => Promise<T | null>;
}

export function useAdminWorkspaceActions({
  setUsers,
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
  setSelectedDate,
  setSelectedSlot,
  bumpDataVersion,
  runAuthenticatedApi,
}: UseAdminWorkspaceActionsParams) {
  const locationsRef = useRef(locations);
  locationsRef.current = locations;

  const desksRef = useRef(desks);
  desksRef.current = desks;

  const bookingsRef = useRef(bookings);
  bookingsRef.current = bookings;

  const updateDeskAllocation = useCallback(
    (
      deskId: string,
      allocationType: DeskAllocationType,
      designatedUserId?: string,
      designatedUserName?: string,
      designatedDepartment?: string,
      requiresApproval?: boolean
    ) => {
      const previousDesk = desksRef.current.find(d => d.id === deskId);
      setDesks(prev =>
        prev.map(d =>
          d.id === deskId
            ? {
                ...d,
                allocationType,
                designatedUserId: allocationType === 'designated' ? designatedUserId : undefined,
                designatedUserName: allocationType === 'designated' ? designatedUserName : undefined,
                designatedDepartment:
                  allocationType === 'designated' ? designatedDepartment : undefined,
                requiresApproval:
                  allocationType === 'requires_approval' ? true : requiresApproval,
              }
            : d
        )
      );

      void runAuthenticatedApi(
        () =>
          updateDeskAllocationApi(deskId, {
            allocationType,
            designatedUserId,
            designatedUserName,
            designatedDepartment,
            requiresApproval,
          }),
        () => {
          if (previousDesk) {
            setDesks(prev => prev.map(d => (d.id === deskId ? previousDesk : d)));
          }
        }
      ).then(updated => {
        if (updated) {
          setDesks(prev => prev.map(d => (d.id === deskId ? updated : d)));
          bumpDataVersion();
        }
      });
    },
    [setDesks, runAuthenticatedApi, bumpDataVersion]
  );

  const addLocation = useCallback(
    (locData: Omit<Location, 'id'>): Location => {
      const newLoc: Location = {
        ...locData,
        id: `loc-${Date.now()}`,
      };
      setLocations(prev => [...prev, newLoc]);

      void runAuthenticatedApi(
        () => createLocationApi(newLoc),
        () => {
          setLocations(prev => prev.filter(l => l.id !== newLoc.id));
        }
      ).then(created => {
        if (created) {
          setLocations(prev => prev.map(l => (l.id === newLoc.id ? created : l)));
          bumpDataVersion();
        }
      });

      return newLoc;
    },
    [setLocations, runAuthenticatedApi, bumpDataVersion]
  );

  const updateLocation = useCallback(
    (updated: Location) => {
      const previousLocation = locationsRef.current.find(l => l.id === updated.id);
      setLocations(prev => prev.map(l => (l.id === updated.id ? updated : l)));

      void runAuthenticatedApi(
        () => updateLocationApi(updated),
        () => {
          if (previousLocation) {
            setLocations(prev => prev.map(l => (l.id === updated.id ? previousLocation : l)));
          }
        }
      ).then(saved => {
        if (saved) {
          setLocations(prev => prev.map(l => (l.id === saved.id ? saved : l)));
          bumpDataVersion();
        }
      });
    },
    [setLocations, runAuthenticatedApi, bumpDataVersion]
  );

  const deleteLocation = useCallback(
    (id: string) => {
      const previousLocations = locationsRef.current;
      const previousDesks = desksRef.current;
      const previousBookings = bookingsRef.current;
      const previousLocationId = currentLocationId;
      const previousFloorId = currentFloorId;

      setLocations(prev => prev.filter(l => l.id !== id));
      setDesks(prev => prev.filter(d => d.locationId !== id));
      setBookings(prev => prev.filter(b => b.locationId !== id));
      if (currentLocationId === id) {
        const remaining = previousLocations.filter(l => l.id !== id);
        if (remaining.length > 0) {
          setCurrentLocationId(remaining[0].id);
        }
      }

      void runAuthenticatedApi(
        () => deleteLocationApi(id),
        () => {
          setLocations(previousLocations);
          setDesks(previousDesks);
          setBookings(previousBookings);
          setCurrentLocationId(previousLocationId);
          setCurrentFloorId(previousFloorId);
        }
      ).then(res => {
        if (res !== null) {
          bumpDataVersion();
        }
      });
    },
    [
      currentLocationId,
      currentFloorId,
      setLocations,
      setDesks,
      setBookings,
      setCurrentLocationId,
      setCurrentFloorId,
      runAuthenticatedApi,
      bumpDataVersion,
    ]
  );

  const addDesk = useCallback(
    (deskData: Omit<Desk, 'id'>): Desk => {
      const newDesk: Desk = {
        ...deskData,
        id: `desk-${Date.now()}`,
      };
      setDesks(prev => [...prev, newDesk]);

      void runAuthenticatedApi(
        () => createDeskApi(newDesk),
        () => {
          setDesks(prev => prev.filter(d => d.id !== newDesk.id));
        }
      ).then(created => {
        if (created) {
          setDesks(prev => prev.map(d => (d.id === newDesk.id ? created : d)));
          bumpDataVersion();
        }
      });

      return newDesk;
    },
    [setDesks, runAuthenticatedApi, bumpDataVersion]
  );

  const updateDesk = useCallback(
    (updated: Desk) => {
      const previousDesk = desksRef.current.find(d => d.id === updated.id);
      setDesks(prev => prev.map(d => (d.id === updated.id ? updated : d)));

      void runAuthenticatedApi(
        () => updateDeskApi(updated),
        () => {
          if (previousDesk) {
            setDesks(prev => prev.map(d => (d.id === updated.id ? previousDesk : d)));
          }
        }
      ).then(saved => {
        if (saved) {
          setDesks(prev => prev.map(d => (d.id === saved.id ? saved : d)));
          bumpDataVersion();
        }
      });
    },
    [setDesks, runAuthenticatedApi, bumpDataVersion]
  );

  const deleteDesk = useCallback(
    (id: string) => {
      const previousDesks = desksRef.current;
      const previousBookings = bookingsRef.current;
      setDesks(prev => prev.filter(d => d.id !== id));
      setBookings(prev => prev.filter(b => b.deskId !== id));
      void runAuthenticatedApi(
        () => deleteDeskApi(id),
        () => {
          setDesks(previousDesks);
          setBookings(previousBookings);
        }
      ).then(res => {
        if (res !== null) {
          bumpDataVersion();
        }
      });
    },
    [setDesks, setBookings, runAuthenticatedApi, bumpDataVersion]
  );

  const updateDeskPosition = useCallback(
    (deskId: string, position: { x: number; y: number }, rotation?: number) => {
      const previousDesk = desksRef.current.find(d => d.id === deskId);
      setDesks(prev =>
        prev.map(d =>
          d.id === deskId
            ? {
                ...d,
                position,
                rotation: rotation !== undefined ? rotation : d.rotation,
              }
            : d
        )
      );

      void runAuthenticatedApi(
        () => updateDeskPositionApi(deskId, position, rotation),
        () => {
          if (previousDesk) {
            setDesks(prev => prev.map(d => (d.id === deskId ? previousDesk : d)));
          }
        }
      ).then(saved => {
        if (saved) {
          setDesks(prev => prev.map(d => (d.id === deskId ? saved : d)));
        }
      });
    },
    [setDesks, runAuthenticatedApi]
  );

  const batchUpdateDeskPositions = useCallback(
    (updates: { id: string; position: { x: number; y: number }; rotation?: number }[]) => {
      const previousDesks = desksRef.current;
      const updateMap = new Map(updates.map(u => [u.id, u]));
      setDesks(prev =>
        prev.map(d => {
          const match = updateMap.get(d.id);
          if (match) {
            return {
              ...d,
              position: match.position,
              rotation: match.rotation !== undefined ? match.rotation : d.rotation,
            };
          }
          return d;
        })
      );

      void runAuthenticatedApi(
        () => batchUpdateDeskPositionsApi(updates),
        () => {
          setDesks(previousDesks);
        }
      );
    },
    [setDesks, runAuthenticatedApi]
  );

  const updateFloorElements = useCallback(
    (locationId: string, floorId: string, elements: FloorElement[]) => {
      const previousLocations = locationsRef.current;
      setLocations(prev =>
        prev.map(loc =>
          loc.id === locationId
            ? {
                ...loc,
                floors: loc.floors.map(fl =>
                  fl.id === floorId ? { ...fl, elements } : fl
                ),
              }
            : loc
        )
      );

      void runAuthenticatedApi(
        () => updateFloorElementsApi(locationId, floorId, elements),
        () => {
          setLocations(previousLocations);
        }
      );
    },
    [setLocations, runAuthenticatedApi]
  );

  const resetToDefaults = useCallback(() => {
    setSelectedDate(getTodayIsoDate());
    setSelectedSlot('full_day');

    void runAuthenticatedApi(() => resetWorkspaceApi()).then(snapshot => {
      if (snapshot) {
        setUsers(snapshot.users);
        setLocations(snapshot.locations);
        setDesks(snapshot.desks);
        setBookings(snapshot.bookings);
        bumpDataVersion();
        if (snapshot.locations.length > 0) {
          setCurrentLocationId(snapshot.locations[0].id);
          setCurrentFloorId(snapshot.locations[0].floors[0]?.id || '');
        }
      }
    });
  }, [
    setSelectedDate,
    setSelectedSlot,
    runAuthenticatedApi,
    setUsers,
    setLocations,
    setDesks,
    setBookings,
    bumpDataVersion,
    setCurrentLocationId,
    setCurrentFloorId,
  ]);

  return {
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
    resetToDefaults,
  };
}
