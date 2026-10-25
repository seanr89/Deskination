import React, { useState } from 'react';
import { Desk, Floor, SlotType, Booking } from '../types/deskBooking';
import { useDeskBooking } from '../context/DeskBookingContext';
import { Monitor, Laptop, Sun, VolumeX, ShieldAlert, Check, User, Info, Lock, Shield, Clock } from 'lucide-react';

interface InteractiveFloorPlanProps {
  floor: Floor;
  desks: Desk[];
  selectedDate: string;
  selectedSlot: SlotType;
  onSelectDesk: (desk: Desk) => void;
  selectedDeskId?: string;
  onOpenEditor?: () => void;
}

export const InteractiveFloorPlan: React.FC<InteractiveFloorPlanProps> = ({
  floor,
  desks,
  selectedDate,
  selectedSlot,
  onSelectDesk,
  selectedDeskId,
  onOpenEditor,
}) => {
  const { getDeskAvailability, bookings, currentUser } = useDeskBooking();
  const [hoveredDesk, setHoveredDesk] = useState<Desk | null>(null);

  // Compute live availability and active booking for each desk on this floor
  const deskStatuses = desks.map(desk => {
    const avail = getDeskAvailability(desk.id, selectedDate);
    const activeBookings = bookings.filter(
      b => b.deskId === desk.id && b.date === selectedDate && b.status !== 'cancelled' && b.status !== 'rejected'
    );

    const userBooking = activeBookings.find(b => b.userId === currentUser.id && (b.status === 'confirmed' || b.status === 'checked_in'));
    const userPendingRequest = activeBookings.find(b => b.userId === currentUser.id && b.status === 'pending_approval');
    const otherBooking = activeBookings.find(b => b.userId !== currentUser.id && (b.status === 'confirmed' || b.status === 'checked_in'));
    const otherPending = activeBookings.find(b => b.userId !== currentUser.id && b.status === 'pending_approval');

    let isAvailableForSelectedSlot = false;
    if (selectedSlot === 'morning') isAvailableForSelectedSlot = avail.morning;
    else if (selectedSlot === 'afternoon') isAvailableForSelectedSlot = avail.afternoon;
    else isAvailableForSelectedSlot = avail.full_day;

    const isDesignated = desk.allocationType === 'designated';
    const isDesignatedToMe = isDesignated && (
      desk.designatedUserId === currentUser.id ||
      (Boolean(desk.designatedDepartment) && desk.designatedDepartment === currentUser.department)
    );
    const isDesignatedToOther = isDesignated && !isDesignatedToMe && currentUser.role !== 'admin';
    const requiresApproval = (desk.allocationType === 'requires_approval' || desk.requiresApproval) && currentUser.role !== 'admin';

    let state: 'available' | 'booked_by_you' | 'pending_you' | 'booked_by_other' | 'pending_other' | 'partial' | 'maintenance' = 'available';

    if (desk.status === 'maintenance') {
      state = 'maintenance';
    } else if (userBooking) {
      state = 'booked_by_you';
    } else if (userPendingRequest) {
      state = 'pending_you';
    } else if (otherBooking) {
      if (!isAvailableForSelectedSlot) {
        state = 'booked_by_other';
      } else {
        state = 'partial';
      }
    } else if (otherPending) {
      state = 'pending_other';
    } else {
      state = 'available';
    }

    return {
      desk,
      avail,
      userBooking,
      userPendingRequest,
      otherBooking,
      isAvailableForSelectedSlot,
      isDesignated,
      isDesignatedToMe,
      isDesignatedToOther,
      requiresApproval,
      state
    };
  });

  const availableCount = deskStatuses.filter(s => s.state === 'available' || s.state === 'partial').length;
  const bookedCount = deskStatuses.filter(s => s.state === 'booked_by_other').length;
  const myBookingsCount = deskStatuses.filter(s => s.state === 'booked_by_you').length;
  const myPendingCount = deskStatuses.filter(s => s.state === 'pending_you').length;
  const designatedCount = deskStatuses.filter(s => s.isDesignated).length;
  const approvalCount = deskStatuses.filter(s => s.requiresApproval).length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 relative overflow-hidden">
      
      {/* Floor Plan Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900">{floor.name}</h3>
            <span className="text-xs text-slate-500 font-mono">
              Level {floor.level}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Interactive spatial layout · Click any desk node to view equipment, allocation policies, or submit requests
          </p>
        </div>

        {/* Legend & Layout Editor trigger */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-emerald-500 border border-emerald-600"></span>
            <span className="text-slate-600">Available ({availableCount})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-indigo-600 border border-indigo-700"></span>
            <span className="text-slate-600">Your Booking ({myBookingsCount})</span>
          </div>
          {myPendingCount > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-amber-500 border border-amber-600"></span>
              <span className="text-amber-800 font-medium">Pending ({myPendingCount})</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-slate-300 border border-slate-400"></span>
            <span className="text-slate-600">Occupied ({bookedCount})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-purple-100 border border-purple-400 text-purple-700 flex items-center justify-center text-[9px] font-bold">
              ★
            </span>
            <span className="text-slate-600">Designated ({designatedCount})</span>
          </div>
          {approvalCount > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-amber-100 border border-amber-400 text-amber-700 flex items-center justify-center text-[9px] font-bold">
                §
              </span>
              <span className="text-slate-600">Needs Approval</span>
            </div>
          )}

          {onOpenEditor && (
            <button
              onClick={onOpenEditor}
              className="ml-auto sm:ml-2 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg flex items-center gap-1.5 transition-colors"
              title="Drag desks and modify layout to match your real office"
            >
              <span>Edit Floor Map</span>
            </button>
          )}
        </div>
      </div>

      {/* SVG Canvas Map Container */}
      <div className="relative mt-4 w-full aspect-[16/10] bg-slate-50/70 rounded-lg border border-slate-200 overflow-hidden select-none">
        
        {/* Subtle grid background */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#000 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />

        {/* Dynamic Architectural Floor Elements */}
        {floor.elements && floor.elements.length > 0 ? (
          floor.elements.map(el => {
            let bgClass = 'bg-slate-200/80 border-slate-300 text-slate-700';
            if (el.type === 'room') bgClass = 'bg-blue-50/70 border-blue-200 text-blue-900';
            if (el.type === 'kitchen') bgClass = 'bg-amber-50/70 border-amber-200 text-amber-900';
            if (el.type === 'restroom') bgClass = 'bg-slate-100/90 border-slate-200 text-slate-600';
            if (el.type === 'stairs') bgClass = 'bg-slate-200/90 border-slate-300 text-slate-700';

            return (
              <div
                key={el.id}
                style={{
                  left: `${el.x}%`,
                  top: `${el.y}%`,
                  width: `${el.width}%`,
                  height: `${el.height}%`,
                }}
                className={`absolute rounded border p-2 flex flex-col justify-between pointer-events-none select-none ${bgClass}`}
              >
                <span className="text-[10px] font-semibold tracking-tight uppercase truncate">
                  {el.label || el.name}
                </span>
              </div>
            );
          })
        ) : (
          <>
            {/* Fallback Entrance & Core markers if elements not defined */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 bg-slate-200/90 border border-slate-300 px-2 py-4 rounded-r text-[10px] text-slate-600 font-medium writing-mode-vertical">
              Lift Core &amp; Stairs
            </div>

            <div className="absolute top-4 right-4 bg-slate-200/70 border border-slate-300 px-3 py-1.5 rounded text-[11px] text-slate-600 flex items-center gap-1.5">
              <span>☕ Coffee Bar &amp; Nook</span>
            </div>

            <div className="absolute bottom-4 left-6 bg-slate-200/70 border border-slate-300 px-3 py-1.5 rounded text-[11px] text-slate-600 flex items-center gap-1.5">
              <span>🚻 Restrooms &amp; Showers</span>
            </div>
          </>
        )}

        {/* Zone Boundaries */}
        <div className="absolute top-[38%] left-10 right-10 border-b border-dashed border-slate-200 pointer-events-none flex justify-between text-[10px] text-slate-400 px-2">
          <span>ZONE A (Focus)</span>
          <span>ZONE B (Agile Bench)</span>
        </div>
        <div className="absolute top-[68%] left-10 right-10 border-b border-dashed border-slate-200 pointer-events-none flex justify-between text-[10px] text-slate-400 px-2">
          <span>ZONE B (Agile)</span>
          <span>ZONE C (Terrace View)</span>
        </div>

        {/* Desk Nodes */}
        {deskStatuses.map(({ 
          desk, 
          isAvailableForSelectedSlot, 
          state, 
          userBooking, 
          userPendingRequest, 
          otherBooking, 
          isDesignated, 
          isDesignatedToMe, 
          isDesignatedToOther,
          requiresApproval 
        }) => {
          const isSelected = selectedDeskId === desk.id;

          let nodeBg = 'bg-emerald-500 hover:bg-emerald-600 border-emerald-600 text-white shadow-xs';

          if (state === 'maintenance') {
            nodeBg = 'bg-slate-200 border-dashed border-slate-400 text-slate-400 cursor-not-allowed';
          } else if (state === 'booked_by_you') {
            nodeBg = 'bg-indigo-600 hover:bg-indigo-700 border-indigo-700 text-white shadow-md ring-2 ring-indigo-300';
          } else if (state === 'pending_you') {
            nodeBg = 'bg-amber-500 hover:bg-amber-600 border-amber-600 text-white shadow-md ring-2 ring-amber-300 animate-pulse';
          } else if (state === 'partial') {
            nodeBg = 'bg-amber-500 hover:bg-amber-600 border-amber-600 text-white';
          } else if (state === 'booked_by_other' || state === 'pending_other') {
            nodeBg = 'bg-slate-300 hover:bg-slate-400 border-slate-400 text-slate-700';
          } else if (isDesignated) {
            if (isDesignatedToMe) {
              nodeBg = 'bg-purple-600 hover:bg-purple-700 border-purple-700 text-white ring-2 ring-purple-300';
            } else {
              nodeBg = 'bg-purple-100 hover:bg-purple-200 border-purple-300 text-purple-900';
            }
          } else if (requiresApproval) {
            nodeBg = 'bg-emerald-50 hover:bg-emerald-100 border-amber-400 text-slate-800';
          }

          if (isSelected) {
            nodeBg += ' ring-4 ring-slate-900 ring-offset-2';
          }

          return (
            <div
              key={desk.id}
              style={{
                left: `${desk.position.x}%`,
                top: `${desk.position.y}%`,
                transform: `translate(-50%, -50%) rotate(${desk.rotation || 0}deg)`
              }}
              className="absolute group z-10 transition-transform"
              onMouseEnter={() => setHoveredDesk(desk)}
              onMouseLeave={() => setHoveredDesk(null)}
            >
              <button
                onClick={() => onSelectDesk(desk)}
                className={`relative w-12 h-10 sm:w-14 sm:h-11 rounded-md border text-[11px] font-mono font-medium flex flex-col items-center justify-center transition-all transform active:scale-95 ${nodeBg}`}
                title={`${desk.code}: ${desk.name}`}
              >
                {/* Allocation Badge Dot / Icon top-right */}
                {isDesignated ? (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-purple-700 text-white rounded-full flex items-center justify-center text-[9px] shadow-xs">
                    ★
                  </span>
                ) : requiresApproval ? (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-500 text-white rounded-full flex items-center justify-center text-[9px] shadow-xs">
                    §
                  </span>
                ) : null}

                {/* Desk Code */}
                <span className="font-semibold tracking-tighter truncate max-w-full px-0.5">
                  {desk.code.replace('LDN-', '').replace('NY-', '').replace('BER-', '')}
                </span>

                {/* Sub status / user initial */}
                {state === 'booked_by_you' ? (
                  <span className="text-[9px] leading-tight font-sans text-indigo-100 flex items-center gap-0.5">
                    <Check className="w-2.5 h-2.5" /> You
                  </span>
                ) : state === 'pending_you' ? (
                  <span className="text-[9px] leading-tight font-sans text-amber-100 flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" /> Review
                  </span>
                ) : state === 'booked_by_other' && otherBooking ? (
                  <span className="text-[9px] leading-tight font-sans text-slate-700 truncate max-w-[44px]">
                    {otherBooking.userName.split(' ')[0]}
                  </span>
                ) : state === 'partial' ? (
                  <span className="text-[9px] leading-tight font-sans text-amber-950">
                    Split
                  </span>
                ) : isDesignatedToMe ? (
                  <span className="text-[9px] leading-tight font-sans text-purple-100">
                    Yours
                  </span>
                ) : isDesignatedToOther ? (
                  <span className="text-[9px] leading-tight font-sans text-purple-700 truncate max-w-[44px]">
                    {desk.designatedUserName ? desk.designatedUserName.split(' ')[0] : 'Desig'}
                  </span>
                ) : requiresApproval ? (
                  <span className="text-[9px] leading-tight font-sans text-amber-700">
                    Req
                  </span>
                ) : state === 'maintenance' ? (
                  <span className="text-[9px] leading-tight font-sans text-slate-500">
                    Fix
                  </span>
                ) : (
                  <span className="text-[9px] leading-tight font-sans text-emerald-100">
                    Open
                  </span>
                )}
              </button>
            </div>
          );
        })}

        {/* Floating Quick Tooltip on Hover */}
        {hoveredDesk && (
          <div
            className="absolute z-30 pointer-events-none bg-slate-900 text-white rounded-lg p-3 text-xs shadow-xl border border-slate-700 max-w-xs transition-opacity duration-150"
            style={{
              left: `${Math.min(Math.max(hoveredDesk.position.x, 20), 80)}%`,
              top: `${hoveredDesk.position.y > 60 ? hoveredDesk.position.y - 18 : hoveredDesk.position.y + 12}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="font-semibold text-sm flex items-center justify-between gap-3">
              <span>{hoveredDesk.code}</span>
              <span className="text-[11px] font-normal text-slate-300 capitalize">
                {hoveredDesk.deskType.replace('_', ' ')}
              </span>
            </div>
            <div className="text-slate-300 mt-1">{hoveredDesk.name}</div>

            {/* Allocation policy line */}
            <div className="mt-2 text-[11px] font-medium">
              {hoveredDesk.allocationType === 'designated' ? (
                <span className="text-purple-300 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  <span>
                    Designated to {hoveredDesk.designatedUserName || hoveredDesk.designatedDepartment || 'Assigned Staff'}
                  </span>
                </span>
              ) : hoveredDesk.allocationType === 'requires_approval' || hoveredDesk.requiresApproval ? (
                <span className="text-amber-300 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  <span>Restricted · Requires Manager Approval</span>
                </span>
              ) : (
                <span className="text-emerald-300">
                  Unreserved Hot Desk · Open
                </span>
              )}
            </div>
            
            {/* Equipment preview */}
            <div className="mt-2 text-[11px] text-slate-400 border-t border-slate-800 pt-1.5 flex flex-wrap gap-1">
              {hoveredDesk.equipment.slice(0, 2).map((eq, i) => (
                <span key={i} className="text-slate-300">· {eq}</span>
              ))}
            </div>

            {/* Live slot status */}
            <div className="mt-2 pt-1.5 border-t border-slate-800 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Selected ({selectedSlot.replace('_', ' ')}):</span>
              <span className="font-semibold text-emerald-400">
                Click to inspect &amp; book
              </span>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
