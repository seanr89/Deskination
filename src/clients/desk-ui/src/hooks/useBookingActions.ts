import { useCallback, useRef } from 'react';
import type React from 'react';
import type { Booking, SlotType, User } from '../types/deskBooking';
import type { BookingActionResult } from '../context/deskBookingTypes';
import { getCurrentIdToken } from '../services/authService';
import {
  approveBookingRequestApi,
  cancelBookingApi,
  checkInBookingApi,
  createBookingApi,
  rejectBookingRequestApi,
} from '../services/apiClient';
import { extractApiErrorMessage } from './useWorkspaceData';

export interface UseBookingActionsParams {
  bookings: Booking[];
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
  currentUser: User;
  setApiError: React.Dispatch<React.SetStateAction<string | null>>;
  bumpDataVersion: () => void;
  runAuthenticatedApi: <T>(action: () => Promise<T>, onError?: () => void) => Promise<T | null>;
}

export function useBookingActions({
  bookings,
  setBookings,
  currentUser,
  setApiError,
  bumpDataVersion,
  runAuthenticatedApi,
}: UseBookingActionsParams) {
  const bookingsRef = useRef(bookings);
  bookingsRef.current = bookings;

  const submitBooking = useCallback(
    async (
      deskId: string,
      date: string,
      slot: SlotType,
      isApprovalRequest: boolean,
      notes?: string,
      approvalReason?: string
    ): Promise<BookingActionResult> => {
      try {
        const token = await getCurrentIdToken();
        if (!token) {
          return {
            success: false,
            message: 'Authentication required to book a desk.',
          };
        }

        const res = await createBookingApi({
          deskId,
          date,
          slot,
          notes,
          approvalReason,
          isApprovalRequest,
        });

        if (!res.success || !res.booking) {
          const message = res.message || 'Desk booking failed.';
          setApiError(message);
          return { success: false, message };
        }

        const createdBooking = res.booking;
        setBookings(prev => [createdBooking, ...prev]);
        setApiError(null);
        bumpDataVersion();

        return {
          success: true,
          message: res.message,
          booking: createdBooking,
        };
      } catch (err) {
        const message = extractApiErrorMessage(err, 'Desk booking failed.');
        setApiError(message);
        return { success: false, message };
      }
    },
    [setBookings, setApiError, bumpDataVersion]
  );

  const bookDesk = useCallback(
    (deskId: string, date: string, slot: SlotType, notes?: string) =>
      submitBooking(deskId, date, slot, false, notes, undefined),
    [submitBooking]
  );

  const requestDeskBooking = useCallback(
    (deskId: string, date: string, slot: SlotType, justification: string) =>
      submitBooking(deskId, date, slot, true, justification, justification),
    [submitBooking]
  );

  const approveBookingRequest = useCallback(
    (bookingId: string, note?: string): boolean => {
      const previousBooking = bookingsRef.current.find(b => b.id === bookingId);
      setBookings(prev =>
        prev.map(b =>
          b.id === bookingId
            ? {
                ...b,
                status: 'confirmed',
                reviewedBy: currentUser.name,
                reviewedAt: new Date().toISOString(),
                reviewNotes: note || 'Approved by office manager',
              }
            : b
        )
      );

      void runAuthenticatedApi(
        () => approveBookingRequestApi(bookingId, note),
        () => {
          if (previousBooking) {
            setBookings(prev => prev.map(b => (b.id === bookingId ? previousBooking : b)));
          }
        }
      ).then(updated => {
        if (updated) {
          setBookings(prev => prev.map(b => (b.id === bookingId ? updated : b)));
          bumpDataVersion();
        }
      });

      return true;
    },
    [currentUser.name, setBookings, runAuthenticatedApi, bumpDataVersion]
  );

  const rejectBookingRequest = useCallback(
    (bookingId: string, reason: string): boolean => {
      const previousBooking = bookingsRef.current.find(b => b.id === bookingId);
      setBookings(prev =>
        prev.map(b =>
          b.id === bookingId
            ? {
                ...b,
                status: 'rejected',
                reviewedBy: currentUser.name,
                reviewedAt: new Date().toISOString(),
                reviewNotes: reason || 'Declined by office manager',
              }
            : b
        )
      );

      void runAuthenticatedApi(
        () => rejectBookingRequestApi(bookingId, reason),
        () => {
          if (previousBooking) {
            setBookings(prev => prev.map(b => (b.id === bookingId ? previousBooking : b)));
          }
        }
      ).then(updated => {
        if (updated) {
          setBookings(prev => prev.map(b => (b.id === bookingId ? updated : b)));
          bumpDataVersion();
        }
      });

      return true;
    },
    [currentUser.name, setBookings, runAuthenticatedApi, bumpDataVersion]
  );

  const cancelBooking = useCallback(
    (bookingId: string, reason?: string): boolean => {
      const previousBooking = bookingsRef.current.find(b => b.id === bookingId);
      setBookings(prev =>
        prev.map(b =>
          b.id === bookingId
            ? {
                ...b,
                status: 'cancelled',
                cancelledAt: new Date().toISOString(),
                notes: reason
                  ? `${b.notes ? `${b.notes} | ` : ''}Cancellation: ${reason}`
                  : b.notes,
              }
            : b
        )
      );

      void runAuthenticatedApi(
        () => cancelBookingApi(bookingId, reason),
        () => {
          if (previousBooking) {
            setBookings(prev => prev.map(b => (b.id === bookingId ? previousBooking : b)));
          }
        }
      ).then(updated => {
        if (updated) {
          setBookings(prev => prev.map(b => (b.id === bookingId ? updated : b)));
          bumpDataVersion();
        }
      });

      return true;
    },
    [setBookings, runAuthenticatedApi, bumpDataVersion]
  );

  const checkInBooking = useCallback(
    (bookingId: string): boolean => {
      const previousBooking = bookingsRef.current.find(b => b.id === bookingId);
      setBookings(prev =>
        prev.map(b =>
          b.id === bookingId
            ? {
                ...b,
                status: 'checked_in',
                checkInAt: new Date().toISOString(),
              }
            : b
        )
      );

      void runAuthenticatedApi(
        () => checkInBookingApi(bookingId),
        () => {
          if (previousBooking) {
            setBookings(prev => prev.map(b => (b.id === bookingId ? previousBooking : b)));
          }
        }
      ).then(updated => {
        if (updated) {
          setBookings(prev => prev.map(b => (b.id === bookingId ? updated : b)));
          bumpDataVersion();
        }
      });

      return true;
    },
    [setBookings, runAuthenticatedApi, bumpDataVersion]
  );

  return {
    bookDesk,
    requestDeskBooking,
    approveBookingRequest,
    rejectBookingRequest,
    cancelBooking,
    checkInBooking,
  };
}
