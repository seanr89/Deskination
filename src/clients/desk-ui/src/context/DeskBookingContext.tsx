import React, { createContext, useContext, useMemo } from 'react';
import {
  type BookingActionResult,
  type DeskBookingContextType,
  type DeskBookingProviderProps,
  type LocationOccupancy,
} from './deskBookingTypes';
import { useWorkspaceData } from '../hooks/useWorkspaceData';
import { useWorkspaceAnalytics } from '../hooks/useWorkspaceAnalytics';
import { useBookingActions } from '../hooks/useBookingActions';
import { useAdminWorkspaceActions } from '../hooks/useAdminWorkspaceActions';

export type { BookingActionResult, DeskBookingContextType, DeskBookingProviderProps, LocationOccupancy };

const DeskBookingContext = createContext<DeskBookingContextType | undefined>(undefined);

export const DeskBookingProvider: React.FC<DeskBookingProviderProps> = ({
  children,
  ...initialProps
}) => {
  const data = useWorkspaceData(initialProps);

  const analytics = useWorkspaceAnalytics({
    currentLocationId: data.currentLocationId,
    locations: data.locations,
    selectedDate: data.selectedDate,
    currentUserId: data.currentUser.id,
    dataVersion: data.dataVersion,
  });

  const bookingActions = useBookingActions({
    bookings: data.bookings,
    setBookings: data.setBookings,
    currentUser: data.currentUser,
    setApiError: data.setApiError,
    bumpDataVersion: data.bumpDataVersion,
    runAuthenticatedApi: data.runAuthenticatedApi,
  });

  const adminActions = useAdminWorkspaceActions({
    setUsers: data.setUsers,
    locations: data.locations,
    setLocations: data.setLocations,
    currentLocationId: data.currentLocationId,
    setCurrentLocationId: data.setCurrentLocationId,
    currentFloorId: data.currentFloorId,
    setCurrentFloorId: data.setCurrentFloorId,
    desks: data.desks,
    setDesks: data.setDesks,
    bookings: data.bookings,
    setBookings: data.setBookings,
    setSelectedDate: data.setSelectedDate,
    setSelectedSlot: data.setSelectedSlot,
    bumpDataVersion: data.bumpDataVersion,
    runAuthenticatedApi: data.runAuthenticatedApi,
  });

  const value = useMemo<DeskBookingContextType>(
    () => ({
      users: data.users,
      currentUser: data.currentUser,
      setCurrentUser: data.setCurrentUser,
      upsertUser: data.upsertUser,
      locations: data.locations,
      currentLocationId: data.currentLocationId,
      setCurrentLocationId: data.setCurrentLocationId,
      currentFloorId: data.currentFloorId,
      setCurrentFloorId: data.setCurrentFloorId,
      desks: data.desks,
      bookings: data.bookings,
      selectedDate: data.selectedDate,
      setSelectedDate: data.setSelectedDate,
      selectedSlot: data.selectedSlot,
      setSelectedSlot: data.setSelectedSlot,
      bookDesk: bookingActions.bookDesk,
      requestDeskBooking: bookingActions.requestDeskBooking,
      cancelBooking: bookingActions.cancelBooking,
      checkInBooking: bookingActions.checkInBooking,
      approveBookingRequest: bookingActions.approveBookingRequest,
      rejectBookingRequest: bookingActions.rejectBookingRequest,
      updateDeskAllocation: adminActions.updateDeskAllocation,
      addLocation: adminActions.addLocation,
      updateLocation: adminActions.updateLocation,
      deleteLocation: adminActions.deleteLocation,
      addDesk: adminActions.addDesk,
      updateDesk: adminActions.updateDesk,
      deleteDesk: adminActions.deleteDesk,
      updateDeskPosition: adminActions.updateDeskPosition,
      batchUpdateDeskPositions: adminActions.batchUpdateDeskPositions,
      updateFloorElements: adminActions.updateFloorElements,
      getUserStats: analytics.getUserStats,
      getDeskAvailability: analytics.getDeskAvailability,
      getLocationOccupancy: analytics.getLocationOccupancy,
      getColleaguesInOfficeToday: analytics.getColleaguesInOfficeToday,
      isHydrating: data.isHydrating,
      apiError: data.apiError,
      clearApiError: data.clearApiError,
      refreshWorkspace: data.hydrateFromBackend,
      resetToDefaults: adminActions.resetToDefaults,
    }),
    [data, analytics, bookingActions, adminActions]
  );

  return (
    <DeskBookingContext.Provider value={value}>
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
