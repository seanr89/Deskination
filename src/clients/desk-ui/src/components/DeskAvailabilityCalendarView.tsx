import React, { useState, useMemo } from 'react';
import { useDeskBooking } from '../context/DeskBookingContext';
import { Location, Desk, SlotType, Booking } from '../types/deskBooking';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Users, 
  CheckCircle2, 
  TrendingUp, 
  Compass, 
  LayoutGrid, 
  Check, 
  Hourglass, 
  Sparkles,
  ArrowRight,
  MapPin,
  Building2,
  Layers,
  Filter
} from 'lucide-react';

interface DeskAvailabilityCalendarViewProps {
  location: Location;
  onSelectDateAndSwitchToMap: (date: string) => void;
  onSelectDateAndSwitchToGrid: (date: string) => void;
}

export const DeskAvailabilityCalendarView: React.FC<DeskAvailabilityCalendarViewProps> = ({
  location,
  onSelectDateAndSwitchToMap,
  onSelectDateAndSwitchToGrid
}) => {
  const {
    desks,
    bookings,
    currentUser,
    selectedDate,
    setSelectedDate,
    selectedSlot,
    setSelectedSlot,
    getDeskAvailability
  } = useDeskBooking();

  // Mode: monthly calendar grid vs weekly detailed columns
  const [calendarMode, setCalendarMode] = useState<'month' | 'week'>('month');

  // Baseline navigation reference date: starts at current selectedDate or 2026-10-25
  const [viewDate, setViewDate] = useState<Date>(() => {
    return new Date(selectedDate ? `${selectedDate}T00:00:00` : '2026-10-25T00:00:00');
  });

  // Slot filter for trend calculations (all slots or specific slot)
  const [trendSlotFilter, setTrendSlotFilter] = useState<SlotType | 'all'>('all');

  // Active desks for this location
  const locationDesks = useMemo(() => {
    return desks.filter(d => d.locationId === location.id && d.status === 'active');
  }, [desks, location.id]);

  const totalDesks = locationDesks.length || 1;

  // Helper to compute occupancy and metrics for any ISO date string
  const getDateMetrics = (dateIso: string) => {
    const dayBookings = bookings.filter(
      b => b.locationId === location.id && 
           b.date === dateIso && 
           b.status !== 'cancelled' && 
           b.status !== 'rejected'
    );

    // Current user booking on this date
    const userBooking = dayBookings.find(
      b => b.userId === currentUser.id && (b.status === 'confirmed' || b.status === 'checked_in')
    );
    const userPending = dayBookings.find(
      b => b.userId === currentUser.id && b.status === 'pending_approval'
    );

    // Slot-specific occupancy
    const morningBookings = dayBookings.filter(b => b.slot === 'morning' || b.slot === 'full_day');
    const afternoonBookings = dayBookings.filter(b => b.slot === 'afternoon' || b.slot === 'full_day');
    const fullDayBookings = dayBookings.filter(b => b.slot === 'full_day');

    const morningOccupiedDesks = new Set(morningBookings.map(b => b.deskId)).size;
    const afternoonOccupiedDesks = new Set(afternoonBookings.map(b => b.deskId)).size;
    const fullDayOccupiedDesks = new Set(fullDayBookings.map(b => b.deskId)).size;

    // Overall unique desks reserved
    const uniqueBookedDesks = new Set(dayBookings.map(b => b.deskId)).size;

    // Active occupancy based on slot filter
    let occupiedForFilter = uniqueBookedDesks;
    if (trendSlotFilter === 'morning') occupiedForFilter = morningOccupiedDesks;
    else if (trendSlotFilter === 'afternoon') occupiedForFilter = afternoonOccupiedDesks;
    else if (trendSlotFilter === 'full_day') occupiedForFilter = fullDayOccupiedDesks;

    const rate = Math.round((occupiedForFilter / totalDesks) * 100);
    const available = Math.max(0, totalDesks - occupiedForFilter);

    // Colleagues in office
    const colleagues = dayBookings.filter(b => b.userId !== currentUser.id);

    // Check if weekend
    const d = new Date(`${dateIso}T00:00:00`);
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Trend category tier
    let tier: 'low' | 'moderate' | 'high' | 'weekend' = 'low';
    if (isWeekend) {
      tier = 'weekend';
    } else if (rate >= 75) {
      tier = 'high';
    } else if (rate >= 40) {
      tier = 'moderate';
    } else {
      tier = 'low';
    }

    return {
      dateIso,
      dayBookings,
      userBooking,
      userPending,
      totalDesks,
      occupiedCount: occupiedForFilter,
      availableCount: available,
      occupancyRate: rate,
      morningOccupiedDesks,
      morningAvailable: Math.max(0, totalDesks - morningOccupiedDesks),
      afternoonOccupiedDesks,
      afternoonAvailable: Math.max(0, totalDesks - afternoonOccupiedDesks),
      fullDayOccupiedDesks,
      fullDayAvailable: Math.max(0, totalDesks - fullDayOccupiedDesks),
      colleagues,
      isWeekend,
      tier
    };
  };

  // ----------------------------------------------------
  // Monthly Calendar Grid Generator
  // ----------------------------------------------------
  const monthData = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth(); // 0-indexed

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const monthName = firstDayOfMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // In Monday-start calendar: Mon = 0, Sun = 6
    const startDayIndex = (firstDayOfMonth.getDay() + 6) % 7;
    const daysInMonth = lastDayOfMonth.getDate();

    const days = [];

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const iso = prevDate.toISOString().split('T')[0];
      days.push({
        iso,
        dayNum,
        isCurrentMonth: false,
        metrics: getDateMetrics(iso)
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const curDate = new Date(year, month, i);
      const iso = curDate.toISOString().split('T')[0];
      days.push({
        iso,
        dayNum: i,
        isCurrentMonth: true,
        metrics: getDateMetrics(iso)
      });
    }

    // Next month padding to complete 35 or 42 cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      const iso = nextDate.toISOString().split('T')[0];
      days.push({
        iso,
        dayNum: i,
        isCurrentMonth: false,
        metrics: getDateMetrics(iso)
      });
    }

    return {
      monthName,
      days
    };
  }, [viewDate, location.id, desks, bookings, trendSlotFilter, currentUser.id]);

  // ----------------------------------------------------
  // Weekly View Generator (7 days starting Monday)
  // ----------------------------------------------------
  const weekData = useMemo(() => {
    const cur = new Date(viewDate);
    const dayOfWeek = (cur.getDay() + 6) % 7; // Monday = 0
    const monday = new Date(cur);
    monday.setDate(cur.getDate() - dayOfWeek);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      days.push({
        iso,
        dayName,
        dayNum,
        metrics: getDateMetrics(iso)
      });
    }

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const rangeLabel = `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    return {
      rangeLabel,
      days
    };
  }, [viewDate, location.id, desks, bookings, trendSlotFilter, currentUser.id]);

  // Overall statistics for the displayed period
  const periodStats = useMemo(() => {
    const targetDays = calendarMode === 'month' 
      ? monthData.days.filter(d => d.isCurrentMonth && !d.metrics.isWeekend)
      : weekData.days.filter(d => !d.metrics.isWeekend);

    if (targetDays.length === 0) return { avgRate: 0, peakDay: 'Midweek', quietDay: 'Friday', userBookingsCount: 0 };

    let totalRate = 0;
    let maxRate = -1;
    let peakDay = '';
    let minRate = 999;
    let quietDay = '';
    let userBookingsCount = 0;

    for (const item of targetDays) {
      const r = item.metrics.occupancyRate;
      totalRate += r;

      if (r > maxRate) {
        maxRate = r;
        peakDay = new Date(`${item.iso}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long' });
      }
      if (r < minRate) {
        minRate = r;
        quietDay = new Date(`${item.iso}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long' });
      }

      if (item.metrics.userBooking || item.metrics.userPending) {
        userBookingsCount++;
      }
    }

    const avgRate = Math.round(totalRate / targetDays.length);

    return {
      avgRate,
      peakDay: peakDay || 'Tuesday',
      quietDay: quietDay || 'Friday',
      userBookingsCount
    };
  }, [calendarMode, monthData, weekData]);

  // Active selected day metrics
  const activeSelectedMetrics = useMemo(() => {
    return getDateMetrics(selectedDate);
  }, [selectedDate, location.id, desks, bookings, trendSlotFilter, currentUser.id]);

  // Navigation handlers
  const handlePrev = () => {
    if (calendarMode === 'month') {
      const next = new Date(viewDate);
      next.setMonth(next.getMonth() - 1);
      setViewDate(next);
    } else {
      const next = new Date(viewDate);
      next.setDate(next.getDate() - 7);
      setViewDate(next);
    }
  };

  const handleNext = () => {
    if (calendarMode === 'month') {
      const next = new Date(viewDate);
      next.setMonth(next.getMonth() + 1);
      setViewDate(next);
    } else {
      const next = new Date(viewDate);
      next.setDate(next.getDate() + 7);
      setViewDate(next);
    }
  };

  const handleToday = () => {
    const today = new Date('2026-10-25T00:00:00');
    setViewDate(today);
    setSelectedDate('2026-10-25');
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-6">
      
      {/* Calendar Header with Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        
        {/* Title & Navigation */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-md hover:bg-white text-slate-700 transition-colors"
              title="Previous period"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-semibold rounded-md hover:bg-white text-slate-700 transition-colors"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-md hover:bg-white text-slate-700 transition-colors"
              title="Next period"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-indigo-600" />
              <span>{calendarMode === 'month' ? monthData.monthName : weekData.rangeLabel}</span>
            </h2>
            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
              <span className="font-medium text-slate-700">{location.name}</span>
              <span>·</span>
              <span>{totalDesks} total desks configured</span>
            </div>
          </div>
        </div>

        {/* Right side: Slot filter & Monthly / Weekly toggle */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Trend Slot Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
            <button
              onClick={() => setTrendSlotFilter('all')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                trendSlotFilter === 'all'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Any Slot
            </button>
            <button
              onClick={() => setTrendSlotFilter('morning')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                trendSlotFilter === 'morning'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Morning
            </button>
            <button
              onClick={() => setTrendSlotFilter('afternoon')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                trendSlotFilter === 'afternoon'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Afternoon
            </button>
            <button
              onClick={() => setTrendSlotFilter('full_day')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                trendSlotFilter === 'full_day'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Full Day
            </button>
          </div>

          {/* Mode Switcher: Month vs Week */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg text-xs font-medium">
            <button
              onClick={() => setCalendarMode('month')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                calendarMode === 'month'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Monthly View
            </button>
            <button
              onClick={() => setCalendarMode('week')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                calendarMode === 'week'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Weekly View
            </button>
          </div>

        </div>

      </div>

      {/* Period Analytics KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div className="text-[11px] font-medium text-slate-500">Period Avg Occupancy</div>
          <div className="mt-1 text-xl font-bold font-mono text-slate-900 tabular-nums">
            {periodStats.avgRate}%
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {periodStats.avgRate < 50 ? 'Ample seating across floors' : 'Peak hybrid attendance'}
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div className="text-[11px] font-medium text-slate-500">Peak Collaboration Day</div>
          <div className="mt-1 text-base font-bold text-slate-900">
            {periodStats.peakDay}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Highest colleague in-office density
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div className="text-[11px] font-medium text-slate-500">Quiet Focus Opportunity</div>
          <div className="mt-1 text-base font-bold text-emerald-800">
            {periodStats.quietDay}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Maximum free desks &amp; quiet booths
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div className="text-[11px] font-medium text-slate-500">Your Scheduled Days</div>
          <div className="mt-1 text-xl font-bold font-mono text-indigo-700">
            {periodStats.userBookingsCount} <span className="text-xs font-normal text-slate-500">days</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Active in this {calendarMode}
          </div>
        </div>
      </div>

      {/* Visual Availability Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50/70 p-3 rounded-lg border border-slate-200">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-semibold text-slate-700">Availability Indicator:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="text-slate-600">High Availability (&gt;60% Free)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span className="text-slate-600">Moderate Buzz (25%–60% Free)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span className="text-slate-600">Busy / Near Full (&lt;25% Free)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
            <span className="text-slate-600">Your Booked Day</span>
          </div>
        </div>
        <div className="text-[11px] text-slate-500 italic">
          Click any day tile to inspect floor occupancy or jump straight to reservation
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* MONTHLY CALENDAR GRID VIEW */}
      {/* --------------------------------------------------------------------- */}
      {calendarMode === 'month' && (
        <div className="space-y-3">
          <div className="grid grid-cols-7 gap-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayHeader, idx) => (
              <div 
                key={dayHeader} 
                className={`text-center py-2 text-xs font-semibold tracking-wider uppercase ${
                  idx >= 5 ? 'text-slate-400 bg-slate-50 rounded' : 'text-slate-700 bg-slate-100/70 rounded'
                }`}
              >
                {dayHeader}
              </div>
            ))}

            {monthData.days.map((item, index) => {
              const isSelected = selectedDate === item.iso;
              const isToday = item.iso === '2026-10-25';
              const { metrics } = item;

              let tileBg = 'bg-white border-slate-200 hover:border-slate-300';
              if (!item.isCurrentMonth) {
                tileBg = 'bg-slate-50/50 border-slate-100 opacity-40 text-slate-400';
              } else if (metrics.isWeekend) {
                tileBg = 'bg-slate-50 border-slate-200 text-slate-400';
              } else if (metrics.userBooking) {
                tileBg = 'bg-indigo-50/40 border-indigo-300 ring-1 ring-indigo-200';
              }

              if (isSelected) {
                tileBg += ' ring-2 ring-slate-900 border-slate-900 shadow-sm';
              }

              return (
                <div
                  key={`${item.iso}-${index}`}
                  onClick={() => {
                    setSelectedDate(item.iso);
                  }}
                  className={`min-h-[105px] p-2.5 rounded-xl border flex flex-col justify-between transition-all cursor-pointer ${tileBg}`}
                >
                  {/* Top Bar: Date Number + Today / You Badge */}
                  <div className="flex items-start justify-between">
                    <span className={`text-xs font-bold font-mono ${
                      isToday 
                        ? 'w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px]' 
                        : item.isCurrentMonth 
                        ? 'text-slate-900' 
                        : 'text-slate-400'
                    }`}>
                      {item.dayNum}
                    </span>

                    {/* Status Badge */}
                    {metrics.userBooking ? (
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <Check className="w-2.5 h-2.5" /> Booked
                      </span>
                    ) : metrics.userPending ? (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <Hourglass className="w-2.5 h-2.5" /> In Review
                      </span>
                    ) : isToday ? (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                        Today
                      </span>
                    ) : null}
                  </div>

                  {/* Middle: Occupancy Metric / Trend */}
                  {!metrics.isWeekend ? (
                    <div className="space-y-1 my-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1 font-medium">
                          <span className={`w-2 h-2 rounded-full ${
                            metrics.tier === 'low' 
                              ? 'bg-emerald-500' 
                              : metrics.tier === 'moderate' 
                              ? 'bg-amber-500' 
                              : 'bg-rose-500'
                          }`} />
                          <span className="font-mono tabular-nums text-slate-700">
                            {metrics.occupancyRate}%
                          </span>
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {metrics.availableCount} free
                        </span>
                      </div>

                      {/* Mini Bar */}
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            metrics.tier === 'low' 
                              ? 'bg-emerald-500' 
                              : metrics.tier === 'moderate' 
                              ? 'bg-amber-500' 
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(metrics.occupancyRate, 100)}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic text-center py-2">
                      Weekend
                    </div>
                  )}

                  {/* Bottom: Colleagues count */}
                  {!metrics.isWeekend && metrics.colleagues.length > 0 ? (
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 truncate pt-1 border-t border-slate-100">
                      <Users className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {metrics.colleagues.length} {metrics.colleagues.length === 1 ? 'colleague' : 'colleagues'}
                      </span>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-400 pt-1 border-t border-transparent">
                      &nbsp;
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* WEEKLY DETAILED COLUMNS VIEW */}
      {/* --------------------------------------------------------------------- */}
      {calendarMode === 'week' && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {weekData.days.map(col => {
            const isSelected = selectedDate === col.iso;
            const isToday = col.iso === '2026-10-25';
            const { metrics } = col;

            return (
              <div
                key={col.iso}
                onClick={() => setSelectedDate(col.iso)}
                className={`rounded-xl border p-4 flex flex-col justify-between transition-all cursor-pointer ${
                  isSelected 
                    ? 'border-slate-900 bg-white ring-2 ring-slate-900 shadow-md' 
                    : metrics.isWeekend
                    ? 'border-slate-200 bg-slate-50/70 text-slate-400'
                    : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
                }`}
              >
                <div>
                  {/* Day Header */}
                  <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900 uppercase">
                        {col.dayName}
                      </div>
                      <div className="text-sm font-semibold font-mono text-slate-700 mt-0.5">
                        {col.dayNum}
                      </div>
                    </div>
                    {isToday && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                        Today
                      </span>
                    )}
                  </div>

                  {/* Occupancy Indicator */}
                  {!metrics.isWeekend ? (
                    <div className="py-3 space-y-2 border-b border-slate-100">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Occupancy</span>
                        <span className="font-bold font-mono text-slate-900 tabular-nums">
                          {metrics.occupancyRate}%
                        </span>
                      </div>

                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            metrics.tier === 'low' 
                              ? 'bg-emerald-500' 
                              : metrics.tier === 'moderate' 
                              ? 'bg-amber-500' 
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(metrics.occupancyRate, 100)}%` }}
                        />
                      </div>

                      <div className="text-[11px] text-slate-600 font-medium flex items-center justify-between">
                        <span>{metrics.availableCount} Desks Free</span>
                        <span className="text-slate-400 font-normal">({metrics.occupiedCount} Booked)</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-400 italic border-b border-slate-100">
                      Closed / Weekend
                    </div>
                  )}

                  {/* Slots Breakdown */}
                  {!metrics.isWeekend && (
                    <div className="py-3 space-y-1.5 border-b border-slate-100 text-xs">
                      <div className="text-[11px] font-semibold text-slate-700">Slot Availability:</div>
                      <div className="flex items-center justify-between text-[11px] text-slate-600">
                        <span>Morning:</span>
                        <span className="font-mono font-medium text-slate-900">{metrics.morningAvailable} open</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-600">
                        <span>Afternoon:</span>
                        <span className="font-mono font-medium text-slate-900">{metrics.afternoonAvailable} open</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-600">
                        <span>Full Day:</span>
                        <span className="font-mono font-medium text-slate-900">{metrics.fullDayAvailable} open</span>
                      </div>
                    </div>
                  )}

                  {/* User Booking Status Card */}
                  <div className="py-3 border-b border-slate-100">
                    {metrics.userBooking ? (
                      <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-900 space-y-0.5">
                        <div className="font-semibold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Reserved by You</span>
                        </div>
                        <div className="font-mono text-[11px] text-indigo-800">
                          {metrics.userBooking.deskCode} ({metrics.userBooking.slot.replace('_', ' ')})
                        </div>
                      </div>
                    ) : metrics.userPending ? (
                      <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-0.5">
                        <div className="font-semibold flex items-center gap-1">
                          <Hourglass className="w-3.5 h-3.5 text-amber-600" />
                          <span>Pending Approval</span>
                        </div>
                        <div className="font-mono text-[11px] text-amber-800">
                          {metrics.userPending.deskCode}
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400">
                        No reservation for this day
                      </div>
                    )}
                  </div>

                  {/* Colleagues Present */}
                  {!metrics.isWeekend && (
                    <div className="py-3 text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                        <span>Colleagues ({metrics.colleagues.length})</span>
                      </div>
                      {metrics.colleagues.length === 0 ? (
                        <div className="text-[11px] text-slate-400 italic">None registered yet</div>
                      ) : (
                        <div className="space-y-1">
                          {metrics.colleagues.slice(0, 3).map(c => (
                            <div key={c.id} className="text-[11px] text-slate-700 truncate flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                              <span className="font-medium text-slate-900 truncate">{c.userName.split(' ')[0]}</span>
                              <span className="font-mono text-slate-400 text-[10px]">({c.deskCode})</span>
                            </div>
                          ))}
                          {metrics.colleagues.length > 3 && (
                            <div className="text-[10px] text-slate-500 font-medium pl-3">
                              +{metrics.colleagues.length - 3} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Day Action Button */}
                <div className="pt-3 border-t border-slate-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDate(col.iso);
                      onSelectDateAndSwitchToMap(col.iso);
                    }}
                    disabled={metrics.isWeekend}
                    className="w-full py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1 bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
                  >
                    <span>View Floor</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* Selected Day Quick Inspector Panel */}
      {/* --------------------------------------------------------------------- */}
      <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Selected Day Overview
            </span>
            <span className="font-mono text-sm font-bold text-slate-900 px-2 py-0.5 rounded bg-white border border-slate-200">
              {selectedDate}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
              activeSelectedMetrics.tier === 'low'
                ? 'bg-emerald-100 text-emerald-800'
                : activeSelectedMetrics.tier === 'moderate'
                ? 'bg-amber-100 text-amber-800'
                : activeSelectedMetrics.tier === 'high'
                ? 'bg-rose-100 text-rose-800'
                : 'bg-slate-200 text-slate-700'
            }`}>
              {activeSelectedMetrics.occupancyRate}% Occupancy ({activeSelectedMetrics.availableCount} of {totalDesks} desks free)
            </span>
            {activeSelectedMetrics.userBooking && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 flex items-center gap-1">
                <Check className="w-3 h-3" /> You have reserved {activeSelectedMetrics.userBooking.deskCode}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600">
            {activeSelectedMetrics.colleagues.length > 0 
              ? `${activeSelectedMetrics.colleagues.length} colleagues working on-site: ${activeSelectedMetrics.colleagues.map(c => c.userName).slice(0, 4).join(', ')}${activeSelectedMetrics.colleagues.length > 4 ? ` and ${activeSelectedMetrics.colleagues.length - 4} others` : ''}` 
              : 'No colleagues registered for this date yet. Reserve early to lock in your preferred setup.'}
          </p>
        </div>

        {/* Action Buttons to Switch to Map or Grid */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => onSelectDateAndSwitchToGrid(selectedDate)}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-slate-600" />
            <span>Browse Grid ({activeSelectedMetrics.availableCount} Free)</span>
          </button>

          <button
            onClick={() => onSelectDateAndSwitchToMap(selectedDate)}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Compass className="w-3.5 h-3.5 text-white" />
            <span>Interactive Floor Plan</span>
          </button>
        </div>
      </div>

    </div>
  );
};
