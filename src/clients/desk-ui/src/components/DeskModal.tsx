import React, { useState } from 'react';
import { Desk, SlotType, Booking } from '../types/deskBooking';
import { useDeskBooking } from '../context/DeskBookingContext';
import { downloadCalendarEvent } from '../utils/calendarExport';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Clock, 
  Monitor, 
  MapPin, 
  Sliders, 
  Users, 
  Download,
  Trash2,
  Sparkles,
  Shield,
  Lock,
  UserCheck,
  FileText,
  AlertTriangle,
  Send
} from 'lucide-react';

interface DeskModalProps {
  desk: Desk | null;
  onClose: () => void;
  onBookingSuccess?: (booking: Booking) => void;
}

export const DeskModal: React.FC<DeskModalProps> = ({ desk, onClose, onBookingSuccess }) => {
  const { 
    currentUser, 
    selectedDate, 
    selectedSlot, 
    bookDesk, 
    requestDeskBooking,
    cancelBooking, 
    getDeskAvailability, 
    bookings, 
    locations 
  } = useDeskBooking();

  const [slotChoice, setSlotChoice] = useState<SlotType>(selectedSlot);
  const [notes, setNotes] = useState('');
  const [justification, setJustification] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!desk) return null;

  const loc = locations.find(l => l.id === desk.locationId);
  const floor = loc?.floors.find(f => f.id === desk.floorId);
  const avail = getDeskAvailability(desk.id, selectedDate);

  // Allocation policy calculations
  const isDesignated = desk.allocationType === 'designated';
  const isDesignatedToMe = isDesignated && (
    desk.designatedUserId === currentUser.id ||
    (Boolean(desk.designatedDepartment) && desk.designatedDepartment === currentUser.department)
  );
  const isDesignatedToOther = isDesignated && !isDesignatedToMe && currentUser.role !== 'admin';
  const requiresApproval = (desk.allocationType === 'requires_approval' || desk.requiresApproval || isDesignatedToOther) && currentUser.role !== 'admin';

  // Check if current user has an active booking or pending request on this desk
  const existingActiveBooking = bookings.find(
    b => b.deskId === desk.id && b.date === selectedDate && b.userId === currentUser.id && 
    (b.status === 'confirmed' || b.status === 'checked_in')
  );

  const existingPendingRequest = bookings.find(
    b => b.deskId === desk.id && b.date === selectedDate && b.userId === currentUser.id && b.status === 'pending_approval'
  );

  const existingRejectedRequest = bookings.find(
    b => b.deskId === desk.id && b.date === selectedDate && b.userId === currentUser.id && b.status === 'rejected'
  );

  // Check other bookings on this desk today
  const otherBookings = bookings.filter(
    b => b.deskId === desk.id && b.date === selectedDate && b.userId !== currentUser.id && b.status !== 'cancelled' && b.status !== 'rejected'
  );

  // Check colleagues on the same floor on this date
  const nearbyColleagues = bookings.filter(
    b => b.floorId === desk.floorId && b.date === selectedDate && b.deskId !== desk.id && 
    b.status !== 'cancelled' && b.status !== 'rejected'
  );

  // Slot availability check for choice
  const isChoiceAvailable = 
    slotChoice === 'morning' ? avail.morning :
    slotChoice === 'afternoon' ? avail.afternoon :
    avail.full_day;

  const handleAction = () => {
    setIsSubmitting(true);
    setStatusMessage(null);

    if (requiresApproval) {
      if (!justification.trim()) {
        setStatusMessage({ type: 'error', text: 'Please provide a business justification for this reservation request.' });
        setIsSubmitting(false);
        return;
      }

      const result = requestDeskBooking(desk.id, selectedDate, slotChoice, justification.trim());
      if (result.success && result.booking) {
        setStatusMessage({ type: 'success', text: result.message });
        if (onBookingSuccess) onBookingSuccess(result.booking);
        setTimeout(() => onClose(), 1600);
      } else {
        setStatusMessage({ type: 'error', text: result.message });
      }
    } else {
      const result = bookDesk(desk.id, selectedDate, slotChoice, notes.trim() || undefined);
      if (result.success && result.booking) {
        setStatusMessage({ type: 'success', text: result.message });
        if (onBookingSuccess) onBookingSuccess(result.booking);
        setTimeout(() => onClose(), 1400);
      } else {
        setStatusMessage({ type: 'error', text: result.message });
      }
    }
    setIsSubmitting(false);
  };

  const handleCancelBooking = (bookingId: string) => {
    if (confirm('Are you sure you want to release or withdraw this desk reservation request?')) {
      cancelBooking(bookingId, 'Released by employee');
      setStatusMessage({ type: 'success', text: 'Reservation / request cancelled successfully.' });
      setTimeout(() => onClose(), 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-900 text-white">
                {desk.code}
              </span>
              <h3 className="text-base font-semibold text-slate-900">{desk.name}</h3>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
              <span>{loc?.name}</span>
              <span aria-hidden="true">·</span>
              <span>{floor?.name}</span>
              <span aria-hidden="true">·</span>
              <span className="capitalize">{desk.deskType.replace('_', ' ')}</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status notification */}
        {statusMessage && (
          <div className={`mx-6 mt-4 p-3 rounded-lg flex items-center gap-2.5 text-xs font-medium ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[72vh] overflow-y-auto">
          
          {/* Desk Allocation Policy Banner */}
          {desk.allocationType === 'designated' ? (
            <div className={`p-3.5 rounded-lg border text-xs flex items-start gap-3 ${
              isDesignatedToMe
                ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
                : 'bg-purple-50 border-purple-200 text-purple-900'
            }`}>
              <Lock className={`w-4 h-4 mt-0.5 shrink-0 ${isDesignatedToMe ? 'text-indigo-600' : 'text-purple-600'}`} />
              <div>
                <div className="font-semibold flex items-center gap-1.5">
                  <span>Designated Workstation</span>
                  {isDesignatedToMe && (
                    <span className="px-2 py-0.5 rounded bg-indigo-200 text-indigo-900 text-[10px] font-bold uppercase">
                      Assigned to You
                    </span>
                  )}
                </div>
                <p className="mt-0.5 leading-relaxed">
                  {isDesignatedToMe ? (
                    'This workstation is assigned to your account. You have guaranteed priority booking.'
                  ) : desk.designatedUserName ? (
                    `Designated for ${desk.designatedUserName}. Booking by other team members requires an approved exception.`
                  ) : desk.designatedDepartment ? (
                    `Reserved for the ${desk.designatedDepartment} team. Booking by other teams requires an approved exception.`
                  ) : (
                    'Designated workstation. Booking requires an approved exception.'
                  )}
                </p>
              </div>
            </div>
          ) : desk.allocationType === 'requires_approval' || desk.requiresApproval ? (
            <div className="p-3.5 rounded-lg border bg-amber-50 border-amber-200 text-amber-900 text-xs flex items-start gap-3">
              <Shield className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold">Manager Approval Required</div>
                <p className="mt-0.5 text-amber-800 leading-relaxed">
                  This workstation has restricted access (e.g. executive demo, confidential area). Your booking request will be routed to office management for review.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg border bg-slate-50 border-slate-200 text-slate-700 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="font-medium text-slate-900">Unreserved Hot Desk</span>
                <span className="text-slate-500">— Available for instant 1-click booking by any staff member</span>
              </div>
            </div>
          )}

          {/* Reservation Context Card */}
          <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className="text-slate-600 font-medium">Date:</span>
              <span className="font-semibold text-slate-900 font-mono">
                {selectedDate}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <span className="text-slate-600 font-medium">Slot:</span>
              <span className="font-semibold text-slate-900 capitalize">
                {slotChoice.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Pending Approval Banner (if user already submitted request) */}
          {existingPendingRequest && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <span className="text-sm font-semibold text-amber-950">
                    Reservation Request Pending Approval
                  </span>
                </div>
                <span className="text-xs font-mono text-amber-800 font-medium uppercase px-2 py-0.5 bg-amber-100 rounded">
                  In Review
                </span>
              </div>
              <p className="text-xs text-amber-800">
                You requested this workstation for {existingPendingRequest.slot.replace('_', ' ')} on {existingPendingRequest.date}. An office manager will review your submission shortly.
              </p>
              {existingPendingRequest.approvalReason && (
                <div className="p-2.5 bg-white/80 rounded border border-amber-200 text-xs text-slate-700">
                  <span className="font-semibold text-slate-900">Submitted Justification:</span> "{existingPendingRequest.approvalReason}"
                </div>
              )}
              <div className="pt-1">
                <button
                  onClick={() => handleCancelBooking(existingPendingRequest.id)}
                  className="px-3 py-1.5 text-xs font-medium text-rose-700 bg-white border border-rose-200 rounded-md hover:bg-rose-50 flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  Withdraw Request
                </button>
              </div>
            </div>
          )}

          {/* Rejected Notice */}
          {existingRejectedRequest && !existingActiveBooking && !existingPendingRequest && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-800 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Previous Request Declined by Office Management</span>
              </div>
              <p className="text-rose-700">
                {existingRejectedRequest.reviewNotes ? `Reason: "${existingRejectedRequest.reviewNotes}"` : 'Your previous reservation request for this date was declined.'}
              </p>
            </div>
          )}

          {/* If already confirmed / active booking by this user */}
          {existingActiveBooking ? (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                  <span className="text-sm font-semibold text-indigo-950">
                    You have reserved this desk!
                  </span>
                </div>
                <span className="text-xs font-mono text-indigo-700 font-medium uppercase">
                  {existingActiveBooking.status}
                </span>
              </div>
              <p className="text-xs text-indigo-800">
                Confirmed for {existingActiveBooking.slot.replace('_', ' ')} on {existingActiveBooking.date}.
              </p>
              {existingActiveBooking.reviewNotes && (
                <div className="text-xs text-indigo-700 italic">
                  Note: {existingActiveBooking.reviewNotes}
                </div>
              )}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => downloadCalendarEvent(existingActiveBooking)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  Export to Calendar (.ics)
                </button>
                <button
                  onClick={() => handleCancelBooking(existingActiveBooking.id)}
                  className="px-3 py-1.5 text-xs font-medium text-rose-700 bg-white border border-rose-200 rounded-md hover:bg-rose-50 flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  Cancel Reservation
                </button>
              </div>
            </div>
          ) : !existingPendingRequest ? (
            /* Slot Selection for Booking / Requesting */
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Select Duration / Slot
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSlotChoice('morning')}
                  disabled={!avail.morning}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    slotChoice === 'morning'
                      ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                      : avail.morning
                      ? 'border-slate-200 hover:border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                      : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'
                  }`}
                >
                  <div className="text-xs font-semibold">Morning</div>
                  <div className={`text-[11px] mt-0.5 ${slotChoice === 'morning' ? 'text-slate-300' : 'text-slate-500'}`}>
                    08:30 – 13:00
                  </div>
                  {!avail.morning && (
                    <div className="text-[10px] text-rose-500 mt-1 font-medium">Booked</div>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setSlotChoice('afternoon')}
                  disabled={!avail.afternoon}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    slotChoice === 'afternoon'
                      ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                      : avail.afternoon
                      ? 'border-slate-200 hover:border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                      : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'
                  }`}
                >
                  <div className="text-xs font-semibold">Afternoon</div>
                  <div className={`text-[11px] mt-0.5 ${slotChoice === 'afternoon' ? 'text-slate-300' : 'text-slate-500'}`}>
                    13:30 – 18:00
                  </div>
                  {!avail.afternoon && (
                    <div className="text-[10px] text-rose-500 mt-1 font-medium">Booked</div>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setSlotChoice('full_day')}
                  disabled={!avail.full_day}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    slotChoice === 'full_day'
                      ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                      : avail.full_day
                      ? 'border-slate-200 hover:border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                      : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'
                  }`}
                >
                  <div className="text-xs font-semibold">Full Day</div>
                  <div className={`text-[11px] mt-0.5 ${slotChoice === 'full_day' ? 'text-slate-300' : 'text-slate-500'}`}>
                    08:30 – 18:00
                  </div>
                  {!avail.full_day && (
                    <div className="text-[10px] text-rose-500 mt-1 font-medium">Unavailable</div>
                  )}
                </button>
              </div>
            </div>
          ) : null}

          {/* Equipment & Specifications */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-700">Workstation Specifications</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {desk.equipment.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded-md bg-slate-50 border border-slate-200 text-slate-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">{item}</span>
                </div>
              ))}
            </div>
            {desk.notes && (
              <p className="text-xs text-slate-500 italic pt-1">
                Note: {desk.notes}
              </p>
            )}
          </div>

          {/* Nearby Colleagues */}
          {nearbyColleagues.length > 0 && (
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                <span>Colleagues on this floor today ({nearbyColleagues.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {nearbyColleagues.slice(0, 5).map(colleague => (
                  <div 
                    key={colleague.id} 
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 text-slate-700 text-xs border border-slate-200"
                  >
                    <span className="font-medium text-slate-900">{colleague.userName}</span>
                    <span className="text-slate-400 font-mono text-[11px]">({colleague.deskCode})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Justification or Notes Input */}
          {!existingActiveBooking && !existingPendingRequest && (
            requiresApproval ? (
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-semibold text-amber-900 flex items-center justify-between">
                  <span>Business Justification (Required for Management Review)</span>
                  <span className="text-amber-600 text-[11px] font-normal">Required</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Hosting client sprint demo requiring dual 4K setup; executive audit on-site..."
                  value={justification}
                  onChange={e => setJustification(e.target.value)}
                  className="w-full text-xs p-3 border border-amber-300 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500 bg-amber-50/20"
                />
                <p className="text-[11px] text-slate-500">
                  Your request will be sent to the office operations team. You will be notified once reviewed.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-medium text-slate-700">
                  Booking Purpose / Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sprint pair programming, Team planning day..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
            )
          )}

        </div>

        {/* Modal Action Bar */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Close
          </button>

          {!existingActiveBooking && !existingPendingRequest && (
            <button
              type="button"
              onClick={handleAction}
              disabled={!isChoiceAvailable || isSubmitting || desk.status === 'maintenance'}
              className={`px-5 py-2 text-xs font-medium text-white rounded-lg shadow-xs transition-colors flex items-center gap-2 ${
                requiresApproval
                  ? 'bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300'
                  : 'bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300'
              } disabled:cursor-not-allowed`}
            >
              {desk.status === 'maintenance' ? (
                'Under Maintenance'
              ) : !isChoiceAvailable ? (
                'Slot Unavailable'
              ) : requiresApproval ? (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Request Reservation (Requires Approval)</span>
                </>
              ) : (
                `Confirm Booking (${slotChoice.replace('_', ' ')})`
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
