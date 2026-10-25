import React, { useState } from 'react';
import { useDeskBooking } from '../context/DeskBookingContext';
import { Booking, SlotType, Desk } from '../types/deskBooking';
import { downloadCalendarEvent } from '../utils/calendarExport';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  Award, 
  Download, 
  RotateCcw, 
  Users, 
  Building2, 
  TrendingUp, 
  Laptop,
  ArrowRight,
  Filter,
  Check,
  Shield,
  Hourglass,
  Trash2,
  AlertCircle,
  Zap,
  Sparkles,
  CheckCheck
} from 'lucide-react';

interface EmployeeDashboardProps {
  onNavigateToBooking: () => void;
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ onNavigateToBooking }) => {
  const { 
    currentUser, 
    bookings, 
    cancelBooking, 
    checkInBooking, 
    getUserStats, 
    locations, 
    currentLocationId,
    setCurrentLocationId,
    getLocationOccupancy,
    getColleaguesInOfficeToday,
    desks,
    bookDesk,
    getDeskAvailability
  } = useDeskBooking();

  const [historyFilter, setHistoryFilter] = useState<'all' | 'completed' | 'cancelled' | 'rejected'>('all');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Preferred office location state (persisted per user)
  const [preferredLocId, setPreferredLocId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(`flexdesk_pref_loc_${currentUser.id}`);
      if (saved && locations.some(l => l.id === saved)) {
        return saved;
      }
    } catch {
      // ignore
    }
    return currentLocationId;
  });

  const [quickSlot, setQuickSlot] = useState<SlotType>('full_day');

  // Compute personal metrics
  const stats = getUserStats(currentUser.id);

  // Filter bookings for current user
  const userBookings = bookings.filter(b => b.userId === currentUser.id);

  // Pending approval requests
  const pendingRequests = userBookings
    .filter(b => b.status === 'pending_approval')
    .sort((a, b) => a.date.localeCompare(b.date));

  // Upcoming confirmed/checked-in bookings
  const todayIso = '2026-10-25';
  const tomorrowIso = '2026-10-26';
  
  const upcomingBookings = userBookings
    .filter(b => b.date >= todayIso && (b.status === 'confirmed' || b.status === 'checked_in'))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Past / history bookings
  const pastBookings = userBookings
    .filter(b => b.date < todayIso || b.status === 'cancelled' || b.status === 'rejected')
    .sort((a, b) => b.date.localeCompare(a.date));

  const filteredHistory = pastBookings.filter(b => {
    if (historyFilter === 'completed') return b.status === 'checked_in' || (b.status === 'confirmed' && b.date < todayIso);
    if (historyFilter === 'cancelled') return b.status === 'cancelled';
    if (historyFilter === 'rejected') return b.status === 'rejected';
    return true;
  });

  // Current office status
  const currentLoc = locations.find(l => l.id === currentLocationId) || locations[0];
  const preferredLoc = locations.find(l => l.id === preferredLocId) || currentLoc;
  const occupancy = getLocationOccupancy(currentLocationId, todayIso);
  const colleaguesToday = getColleaguesInOfficeToday(currentLocationId, todayIso);

  // Check if current user already has active booking for Today or Tomorrow
  const todayBooking = bookings.find(b => 
    b.userId === currentUser.id && 
    b.date === todayIso && 
    b.status !== 'cancelled' && 
    b.status !== 'rejected'
  );

  const tomorrowBooking = bookings.find(b => 
    b.userId === currentUser.id && 
    b.date === tomorrowIso && 
    b.status !== 'cancelled' && 
    b.status !== 'rejected'
  );

  // Intelligent Desk Recommendation Finder for Quick Booking
  const getRecommendedDesk = (targetDate: string, slot: SlotType, targetLocationId: string) => {
    const locDesks = desks.filter(d => d.locationId === targetLocationId && d.status === 'active');
    if (locDesks.length === 0) return null;

    // 1. Check if user's favorite desk is available
    if (stats.mostCommonDesk) {
      const favDesk = locDesks.find(d => d.code === stats.mostCommonDesk?.deskCode);
      if (favDesk) {
        const avail = getDeskAvailability(favDesk.id, targetDate);
        const isSlotAvail = slot === 'full_day' ? avail.full_day : slot === 'morning' ? avail.morning : avail.afternoon;
        const canBook = (!avail.isDesignatedToOther || currentUser.role === 'admin') &&
                        (!avail.requiresApproval || currentUser.role === 'admin' || favDesk.designatedUserId === currentUser.id);
        if (isSlotAvail && canBook) {
          return { desk: favDesk, reason: 'Your Favorite Station' };
        }
      }
    }

    // 2. Desk designated to current user
    const userDesk = locDesks.find(d => d.designatedUserId === currentUser.id);
    if (userDesk) {
      const avail = getDeskAvailability(userDesk.id, targetDate);
      const isSlotAvail = slot === 'full_day' ? avail.full_day : slot === 'morning' ? avail.morning : avail.afternoon;
      if (isSlotAvail) {
        return { desk: userDesk, reason: 'Your Designated Station' };
      }
    }

    // 3. Unreserved hot desk that does not require approval
    const hotDesks = locDesks.filter(d => 
      (!d.allocationType || d.allocationType === 'unreserved') && 
      !d.requiresApproval && 
      !d.designatedUserId
    );

    for (const d of hotDesks) {
      const avail = getDeskAvailability(d.id, targetDate);
      const isSlotAvail = slot === 'full_day' ? avail.full_day : slot === 'morning' ? avail.morning : avail.afternoon;
      if (isSlotAvail && !avail.isDesignatedToOther) {
        return { 
          desk: d, 
          reason: d.deskType === 'standing' ? 'Standing Hot Desk' : 'Available Hot Desk' 
        };
      }
    }

    // 4. Any active desk available without approval
    for (const d of locDesks) {
      const avail = getDeskAvailability(d.id, targetDate);
      const isSlotAvail = slot === 'full_day' ? avail.full_day : slot === 'morning' ? avail.morning : avail.afternoon;
      if (isSlotAvail && !avail.isDesignatedToOther && !avail.requiresApproval) {
        return { desk: d, reason: 'Optimal Available Desk' };
      }
    }

    return null;
  };

  const recommendedToday = getRecommendedDesk(todayIso, quickSlot, preferredLocId);
  const recommendedTomorrow = getRecommendedDesk(tomorrowIso, quickSlot, preferredLocId);

  // Available count at preferred location for today
  const availableDesksTodayCount = desks.filter(d => {
    if (d.locationId !== preferredLocId || d.status !== 'active') return false;
    const avail = getDeskAvailability(d.id, todayIso);
    return (quickSlot === 'full_day' ? avail.full_day : quickSlot === 'morning' ? avail.morning : avail.afternoon) && 
           !avail.isDesignatedToOther && 
           !avail.requiresApproval;
  }).length;

  const handle1ClickBook = (targetDate: string, desk: Desk) => {
    const result = bookDesk(desk.id, targetDate, quickSlot, '1-Click Quick Book');
    if (result.success) {
      setSuccessToast(`Workstation ${desk.code} reserved for ${targetDate === todayIso ? 'Today' : 'Tomorrow'} (${quickSlot.replace('_', ' ')})!`);
      setTimeout(() => setSuccessToast(null), 3500);
    } else {
      alert(result.message || 'Unable to book desk.');
    }
  };

  const handleLocationChange = (locId: string) => {
    setPreferredLocId(locId);
    setCurrentLocationId(locId);
    try {
      localStorage.setItem(`flexdesk_pref_loc_${currentUser.id}`, locId);
    } catch {
      // ignore
    }
  };

  const handleCancel = (bookingId: string) => {
    if (confirm('Are you sure you want to release this desk reservation?')) {
      cancelBooking(bookingId, 'Cancelled from employee dashboard');
      setSuccessToast('Desk reservation cancelled.');
      setTimeout(() => setSuccessToast(null), 3000);
    }
  };

  const handleWithdrawRequest = (bookingId: string) => {
    if (confirm('Are you sure you want to withdraw this reservation request?')) {
      cancelBooking(bookingId, 'Withdrawn by employee');
      setSuccessToast('Reservation request withdrawn.');
      setTimeout(() => setSuccessToast(null), 3000);
    }
  };

  const handleCheckIn = (bookingId: string) => {
    checkInBooking(bookingId);
    setSuccessToast('Checked in successfully! Have a productive day at the office.');
    setTimeout(() => setSuccessToast(null), 3000);
  };

  return (
    <div className="space-y-6">
      
      {/* Toast feedback */}
      {successToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-600 hover:text-emerald-800">
            &times;
          </button>
        </div>
      )}

      {/* User Welcome Banner & Quick Action */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-full ${currentUser.avatarColor} text-white flex items-center justify-center text-xl font-bold shrink-0`}>
            {currentUser.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Welcome back, {currentUser.name}
            </h1>
            <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
              <span>{currentUser.jobTitle}</span>
              <span aria-hidden="true">·</span>
              <span>{currentUser.department}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-slate-600">Hybrid Working Cadence: 3 Days / Wk</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateToBooking}
            className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors flex items-center gap-2"
          >
            <span>Book Next Desk</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ⚡ Quick Book Workstation Widget */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Accent top gradient stripe */}
        <div className="h-1 bg-gradient-to-r from-amber-500 via-indigo-600 to-emerald-500" />
        
        <div className="p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-amber-50 text-amber-600 border border-amber-200">
                  <Zap className="w-4 h-4 fill-amber-500 text-amber-500" />
                </span>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Quick Book Workstation
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  1-Click Reserve
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                One-click instant reservation for today or tomorrow based on your preferred office location.
              </p>
            </div>

            {/* Quick Controls: Office Selector + Slot Toggle */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Preferred Location Dropdown */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="text-[11px] font-medium text-slate-500">Preferred Office:</span>
                <select
                  value={preferredLocId}
                  onChange={(e) => handleLocationChange(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-900 border-none focus:outline-none cursor-pointer pr-1"
                >
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id} className="text-slate-900">
                      {loc.name.split('(')[0].trim()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Slot Type Toggle */}
              <div className="flex items-center p-0.5 bg-slate-100 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setQuickSlot('full_day')}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    quickSlot === 'full_day' 
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Full Day
                </button>
                <button
                  type="button"
                  onClick={() => setQuickSlot('morning')}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    quickSlot === 'morning' 
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Morning
                </button>
                <button
                  type="button"
                  onClick={() => setQuickSlot('afternoon')}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    quickSlot === 'afternoon' 
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Afternoon
                </button>
              </div>
            </div>
          </div>

          {/* Cards for Today and Tomorrow */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            
            {/* Card 1: Today */}
            {todayBooking ? (
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-950">
                    <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Today · Sun, Oct 25</span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Booked
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
                      {todayBooking.deskCode}
                    </span>
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {todayBooking.deskName}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                    <span>{todayBooking.locationName}</span>
                    <span>·</span>
                    <span>{todayBooking.floorName}</span>
                    <span>·</span>
                    <span className="capitalize font-medium text-emerald-900">{todayBooking.slot.replace('_', ' ')}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-emerald-800 font-medium">
                    {todayBooking.status === 'checked_in' ? '✓ Checked in on-site' : 'Workstation confirmed'}
                  </span>
                  <button
                    onClick={() => downloadCalendarEvent(todayBooking)}
                    className="text-[11px] font-medium text-emerald-800 hover:text-emerald-950 flex items-center gap-1 underline underline-offset-2"
                  >
                    <Download className="w-3 h-3" />
                    Calendar (.ics)
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50/70 border border-slate-200 hover:border-indigo-300 rounded-xl p-4 flex flex-col justify-between space-y-3 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Today · Sun, Oct 25</span>
                  </div>
                  <span className="text-[11px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-indigo-600" />
                    {availableDesksTodayCount} Available
                  </span>
                </div>

                {recommendedToday ? (
                  <div className="space-y-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
                          {recommendedToday.desk.code}
                        </span>
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {recommendedToday.desk.name}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                        <span className="text-indigo-700 font-medium">{recommendedToday.reason}</span>
                        <span>·</span>
                        <span>{preferredLoc.name.split('(')[0]}</span>
                        <span>·</span>
                        <span className="capitalize">{recommendedToday.desk.deskType.replace('_', ' ')}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handle1ClickBook(todayIso, recommendedToday.desk)}
                      className="w-full mt-1 px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer transform active:scale-[0.99]"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                      <span>1-Click Book Today ({quickSlot.replace('_', ' ')})</span>
                    </button>
                  </div>
                ) : (
                  <div className="py-2.5 text-center space-y-1.5">
                    <AlertCircle className="w-5 h-5 text-slate-400 mx-auto" />
                    <div className="text-xs font-medium text-slate-700">No unreserved desks available for {quickSlot.replace('_', ' ')}</div>
                    <button
                      type="button"
                      onClick={onNavigateToBooking}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline"
                    >
                      Open floor plan to explore other desks
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Card 2: Tomorrow */}
            {tomorrowBooking ? (
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-950">
                    <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Tomorrow · Mon, Oct 26</span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Booked
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
                      {tomorrowBooking.deskCode}
                    </span>
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {tomorrowBooking.deskName}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                    <span>{tomorrowBooking.locationName}</span>
                    <span>·</span>
                    <span>{tomorrowBooking.floorName}</span>
                    <span>·</span>
                    <span className="capitalize font-medium text-emerald-900">{tomorrowBooking.slot.replace('_', ' ')}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-emerald-800 font-medium">Workstation confirmed for tomorrow</span>
                  <button
                    onClick={() => downloadCalendarEvent(tomorrowBooking)}
                    className="text-[11px] font-medium text-emerald-800 hover:text-emerald-950 flex items-center gap-1 underline underline-offset-2"
                  >
                    <Download className="w-3 h-3" />
                    Calendar (.ics)
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50/70 border border-slate-200 hover:border-indigo-300 rounded-xl p-4 flex flex-col justify-between space-y-3 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Tomorrow · Mon, Oct 26</span>
                  </div>
                  <span className="text-[11px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-indigo-600" />
                    Ready to Book
                  </span>
                </div>

                {recommendedTomorrow ? (
                  <div className="space-y-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
                          {recommendedTomorrow.desk.code}
                        </span>
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {recommendedTomorrow.desk.name}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                        <span className="text-indigo-700 font-medium">{recommendedTomorrow.reason}</span>
                        <span>·</span>
                        <span>{preferredLoc.name.split('(')[0]}</span>
                        <span>·</span>
                        <span className="capitalize">{recommendedTomorrow.desk.deskType.replace('_', ' ')}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handle1ClickBook(tomorrowIso, recommendedTomorrow.desk)}
                      className="w-full mt-1 px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer transform active:scale-[0.99]"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                      <span>1-Click Book Tomorrow ({quickSlot.replace('_', ' ')})</span>
                    </button>
                  </div>
                ) : (
                  <div className="py-2.5 text-center space-y-1.5">
                    <AlertCircle className="w-5 h-5 text-slate-400 mx-auto" />
                    <div className="text-xs font-medium text-slate-700">No unreserved desks available for {quickSlot.replace('_', ' ')}</div>
                    <button
                      type="button"
                      onClick={onNavigateToBooking}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline"
                    >
                      Open floor plan to explore other desks
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* 4 Quantitative Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Total Bookings & Pending */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Total Bookings Made</div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums flex items-baseline gap-2">
            <span>{stats.totalBookings}</span>
            {stats.pendingApprovalsCount > 0 && (
              <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                {stats.pendingApprovalsCount} pending review
              </span>
            )}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            <span className="font-mono font-medium text-slate-700">{stats.daysInOfficeThisMonth} days</span> in office this month
          </div>
        </div>

        {/* Metric 2: Most Common Desk */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Most Common Desk</div>
          <div className="mt-2 text-xl font-bold text-slate-900 truncate">
            {stats.mostCommonDesk ? stats.mostCommonDesk.deskCode : 'None Yet'}
          </div>
          <div className="mt-1 text-xs text-slate-500 truncate">
            {stats.mostCommonDesk 
              ? `${stats.mostCommonDesk.deskName.split('-')[1]?.trim() || stats.mostCommonDesk.deskName} (${stats.mostCommonDesk.count}x)`
              : 'Start reserving to see favorites'}
          </div>
        </div>

        {/* Metric 3: Cancellations */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Cancellations &amp; Rate</div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {stats.cancelledCount} <span className="text-xs font-normal text-slate-500">({stats.cancellationRate}%)</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {stats.cancellationRate < 15 ? 'Excellent attendance compliance' : 'Hybrid schedule adjustments'}
          </div>
        </div>

        {/* Metric 4: Office Live Status */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Today's Office Status</div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {occupancy.rate}% <span className="text-xs font-normal text-slate-500">capacity</span>
          </div>
          <div className="mt-1 text-xs text-slate-500 truncate">
            {currentLoc.name.split('(')[0]} · {occupancy.booked} occupied
          </div>
        </div>

      </div>

      {/* Pending Manager Approvals Section (if any pending requests) */}
      {pendingRequests.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Hourglass className="w-4 h-4 text-amber-700 animate-spin" />
              <h3 className="text-sm font-semibold text-amber-950">
                Pending Manager Approvals ({pendingRequests.length})
              </h3>
            </div>
            <span className="text-xs font-mono font-medium text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
              Awaiting Office Review
            </span>
          </div>
          <p className="text-xs text-amber-800">
            These workstation reservations require authorization by office management before being confirmed.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {pendingRequests.map(req => (
              <div 
                key={req.id}
                className="bg-white rounded-lg border border-amber-200 p-4 shadow-2xs space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-900 text-white">
                        {req.deskCode}
                      </span>
                      <span className="text-xs font-semibold text-slate-900 truncate">
                        {req.deskName}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                      <span className="font-mono font-medium text-slate-700">{req.date}</span>
                      <span>·</span>
                      <span className="capitalize">{req.slot.replace('_', ' ')}</span>
                      <span>·</span>
                      <span>{req.locationName}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase text-amber-700 bg-amber-100 px-2 py-0.5 rounded shrink-0">
                    Pending
                  </span>
                </div>

                {req.approvalReason && (
                  <div className="text-xs p-2 bg-slate-50 rounded border border-slate-200 text-slate-700">
                    <span className="font-medium text-slate-900">Justification:</span> "{req.approvalReason}"
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-400 font-mono">
                    Requested {new Date(req.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => handleWithdrawRequest(req.id)}
                    className="px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded border border-rose-200 transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3 text-rose-600" />
                    Withdraw Request
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Upcoming Bookings (Left 2/3) + Live Office Radar (Right 1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Upcoming Reservations */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Upcoming Confirmed Reservations</h2>
              <p className="text-xs text-slate-500">Active and upcoming bookings reserved under your name</p>
            </div>
            <span className="text-xs font-mono font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
              {upcomingBookings.length} Confirmed
            </span>
          </div>

          {upcomingBookings.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
              <Laptop className="w-8 h-8 text-slate-400 mx-auto" />
              <div>
                <h4 className="text-sm font-semibold text-slate-900">No upcoming confirmed reservations</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  You do not have any confirmed desk bookings scheduled. Align your hybrid week by picking a desk in advance.
                </p>
              </div>
              <button
                onClick={onNavigateToBooking}
                className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
              >
                Browse Available Desks
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingBookings.map(bkg => {
                const isToday = bkg.date === todayIso;
                const isCheckedIn = bkg.status === 'checked_in';

                return (
                  <div 
                    key={bkg.id}
                    className={`bg-white rounded-xl border p-5 shadow-xs transition-all ${
                      isToday ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-900 text-white">
                            {bkg.deskCode}
                          </span>
                          <span className="text-sm font-semibold text-slate-900">
                            {bkg.deskName}
                          </span>
                          {isToday && (
                            <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                              Today
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-2">
                          <span className="flex items-center gap-1 font-mono font-medium text-slate-800">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {bkg.date}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="flex items-center gap-1 capitalize font-medium text-slate-700">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {bkg.slot.replace('_', ' ')}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {bkg.locationName} ({bkg.floorName})
                          </span>
                        </div>

                        {bkg.reviewedBy && (
                          <div className="mt-1 text-[11px] text-emerald-700">
                            ✓ Approved by {bkg.reviewedBy}
                          </div>
                        )}

                        {bkg.notes && (
                          <div className="mt-2 text-xs text-slate-500 italic">
                            "{bkg.notes}"
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        {isToday && !isCheckedIn && (
                          <button
                            onClick={() => handleCheckIn(bkg.id)}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md flex items-center gap-1.5 shadow-xs transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Check In
                          </button>
                        )}

                        {isCheckedIn && (
                          <span className="px-2.5 py-1 text-xs font-medium text-emerald-800 bg-emerald-50 rounded-md border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Checked In
                          </span>
                        )}

                        <button
                          onClick={() => downloadCalendarEvent(bkg)}
                          className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md flex items-center gap-1.5 transition-colors"
                          title="Export booking to iCal / Google / Outlook calendar"
                        >
                          <Download className="w-3.5 h-3.5 text-slate-500" />
                          Calendar
                        </button>

                        <button
                          onClick={() => handleCancel(bkg.id)}
                          className="px-3 py-1.5 text-xs font-medium text-rose-700 hover:text-rose-800 bg-white hover:bg-rose-50 border border-rose-200 rounded-md transition-colors"
                        >
                          Cancel
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Past Bookings & History Section */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Historical Attendance Log</h3>
                <p className="text-xs text-slate-500">Record of completed, cancelled, and rejected workstation sessions</p>
              </div>

              {/* Segmented Filter */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
                <button
                  onClick={() => setHistoryFilter('all')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    historyFilter === 'all' ? 'bg-white text-slate-900 shadow-xs font-medium' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All History
                </button>
                <button
                  onClick={() => setHistoryFilter('completed')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    historyFilter === 'completed' ? 'bg-white text-slate-900 shadow-xs font-medium' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Completed
                </button>
                <button
                  onClick={() => setHistoryFilter('cancelled')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    historyFilter === 'cancelled' ? 'bg-white text-slate-900 shadow-xs font-medium' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Cancelled
                </button>
                <button
                  onClick={() => setHistoryFilter('rejected')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    historyFilter === 'rejected' ? 'bg-white text-slate-900 shadow-xs font-medium' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Declined
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-medium">
                    <th className="py-2.5 pr-4">Date</th>
                    <th className="py-2.5 px-4">Desk</th>
                    <th className="py-2.5 px-4">Location</th>
                    <th className="py-2.5 px-4">Slot</th>
                    <th className="py-2.5 pl-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        No historical entries match this filter.
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.slice(0, 8).map(b => (
                      <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 pr-4 font-mono font-medium text-slate-900">
                          {b.date}
                        </td>
                        <td className="py-2.5 px-4 font-mono">
                          {b.deskCode}
                        </td>
                        <td className="py-2.5 px-4 truncate max-w-[160px]">
                          {b.locationName.split('(')[0]}
                        </td>
                        <td className="py-2.5 px-4 capitalize">
                          {b.slot.replace('_', ' ')}
                        </td>
                        <td className="py-2.5 pl-4 text-right">
                          {b.status === 'cancelled' ? (
                            <span className="text-rose-600 font-medium">Cancelled</span>
                          ) : b.status === 'rejected' ? (
                            <span className="text-amber-800 font-medium" title={b.reviewNotes || 'Declined'}>
                              Declined
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-medium">Completed</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>

        </div>

        {/* Right Column: Office Radar & Team Presence */}
        <div className="space-y-4">
          
          {/* Office Status Widget */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-600" />
                <span>Office Status &amp; Capacity</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentLoc.name} · Live status today
              </p>
            </div>

            {/* Capacity Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Floor Utilization</span>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {occupancy.rate}% ({occupancy.booked} of {occupancy.total})
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    occupancy.rate > 85 ? 'bg-rose-500' : occupancy.rate > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(occupancy.rate, 100)}%` }}
                />
              </div>
            </div>

            {/* Operating Hours */}
            <div className="text-xs text-slate-600 space-y-1 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Operating Hours:</span>
                <span className="font-medium text-slate-800">{currentLoc.openingHours}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Acoustic Status:</span>
                <span className="text-emerald-700 font-medium">Moderate Buzz (Level 4 Focus Open)</span>
              </div>
            </div>
          </div>

          {/* Team Radar: Colleagues in office today */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-600" />
                  <span>Team Radar Today</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Colleagues working on-site today</p>
              </div>
              <span className="text-xs font-mono font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                {colleaguesToday.length} Present
              </span>
            </div>

            <div className="space-y-2.5">
              {colleaguesToday.length === 0 ? (
                <div className="text-xs text-slate-400 py-4 text-center">
                  No other colleagues registered for today yet.
                </div>
              ) : (
                colleaguesToday.map(colleague => {
                  const isSelf = colleague.userId === currentUser.id;
                  return (
                    <div 
                      key={colleague.id}
                      className={`p-3 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                        isSelf ? 'border-indigo-200 bg-indigo-50/50' : 'border-slate-100 bg-slate-50/60 hover:bg-slate-50'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <span>{colleague.userName}</span>
                          {isSelf && (
                            <span className="text-[10px] text-indigo-700 font-mono font-normal">
                              (You)
                            </span>
                          )}
                        </div>
                        <div className="text-slate-500 text-[11px]">
                          {colleague.userDepartment}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-semibold text-slate-900">
                          {colleague.deskCode}
                        </div>
                        <div className="text-[10px] text-slate-500 capitalize">
                          {colleague.slot.replace('_', ' ')}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
