import React, { useState, useMemo } from 'react';
import { useDeskBooking } from '../context/DeskBookingContext';
import { Desk, SlotType, DeskType, Floor, DeskAllocationType } from '../types/deskBooking';
import { InteractiveFloorPlan } from './InteractiveFloorPlan';
import { EditableFloorPlan } from './EditableFloorPlan';
import { DeskAvailabilityCalendarView } from './DeskAvailabilityCalendarView';
import { DeskModal } from './DeskModal';
import { 
  Building2, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Layers, 
  LayoutGrid, 
  Compass, 
  Filter, 
  Check, 
  Monitor, 
  VolumeX, 
  Sun, 
  Search, 
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Sliders,
  Lock,
  Shield,
  UserCheck
} from 'lucide-react';

export const BookDeskView: React.FC = () => {
  const {
    locations,
    currentLocationId,
    setCurrentLocationId,
    currentFloorId,
    setCurrentFloorId,
    desks,
    selectedDate,
    setSelectedDate,
    selectedSlot,
    setSelectedSlot,
    getDeskAvailability,
    getLocationOccupancy,
    currentUser,
    bookings
  } = useDeskBooking();

  const [viewMode, setViewMode] = useState<'map' | 'grid' | 'calendar'>('map');
  const [isEditingLayout, setIsEditingLayout] = useState<boolean>(false);
  const [selectedDesk, setSelectedDesk] = useState<Desk | null>(null);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [selectedAllocationFilter, setSelectedAllocationFilter] = useState<'all' | 'unreserved' | 'designated' | 'requires_approval'>('all');
  const [onlyAvailableFilter, setOnlyAvailableFilter] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Active location and floor
  const currentLocation = locations.find(l => l.id === currentLocationId) || locations[0];
  const currentFloor = currentLocation.floors.find(f => f.id === currentFloorId) || currentLocation.floors[0];

  // Advance days range generator (based on location's advanceBookingDaysLimit, e.g. 30 days)
  const advanceDates = useMemo(() => {
    const dates = [];
    const base = new Date('2026-10-25T00:00:00'); // Baseline today
    const limit = currentLocation?.advanceBookingDaysLimit || 30;

    for (let i = 0; i < limit; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      dates.push({ iso, dayName, dayNum, isWeekend });
    }
    return dates;
  }, [currentLocation]);

  // Desks filtered for this floor and search filters
  const floorDesks = desks.filter(d => d.locationId === currentLocationId && d.floorId === currentFloorId);

  const filteredDesks = useMemo(() => {
    return floorDesks.filter(desk => {
      // Type filter
      if (selectedTypeFilter !== 'all' && desk.deskType !== selectedTypeFilter) {
        return false;
      }

      // Allocation filter
      if (selectedAllocationFilter === 'unreserved') {
        if (desk.allocationType && desk.allocationType !== 'unreserved') return false;
      } else if (selectedAllocationFilter === 'designated') {
        if (desk.allocationType !== 'designated') return false;
      } else if (selectedAllocationFilter === 'requires_approval') {
        if (desk.allocationType !== 'requires_approval' && !desk.requiresApproval) return false;
      }

      // Search query (code, name, designated user/dept, or equipment)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCode = desk.code.toLowerCase().includes(q);
        const matchesName = desk.name.toLowerCase().includes(q);
        const matchesDesigUser = desk.designatedUserName?.toLowerCase().includes(q) || false;
        const matchesDesigDept = desk.designatedDepartment?.toLowerCase().includes(q) || false;
        const matchesEq = desk.equipment.some(e => e.toLowerCase().includes(q));
        if (!matchesCode && !matchesName && !matchesDesigUser && !matchesDesigDept && !matchesEq) return false;
      }

      // Only available filter
      if (onlyAvailableFilter) {
        const avail = getDeskAvailability(desk.id, selectedDate);
        if (desk.status === 'maintenance') return false;
        if (selectedSlot === 'morning' && !avail.morning) return false;
        if (selectedSlot === 'afternoon' && !avail.afternoon) return false;
        if (selectedSlot === 'full_day' && !avail.full_day) return false;
      }

      return true;
    });
  }, [floorDesks, selectedTypeFilter, selectedAllocationFilter, searchQuery, onlyAvailableFilter, selectedSlot, selectedDate, getDeskAvailability]);

  // Live occupancy stats
  const occupancy = getLocationOccupancy(currentLocationId, selectedDate);

  return (
    <div className="space-y-6">
      
      {/* Location Bar & Quick Specs */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Location Picker */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>Office Location</span>
              <span aria-hidden="true">·</span>
              <span>{currentLocation.city}, {currentLocation.country}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{currentLocation.timezone}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {locations.map(loc => (
                <button
                  key={loc.id}
                  onClick={() => setCurrentLocationId(loc.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    currentLocationId === loc.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {loc.name}
                </button>
              ))}
            </div>
          </div>

          {/* Floor selector & Occupancy metric */}
          <div className="flex flex-wrap items-center gap-4 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-500">Floor Level</label>
              <div className="flex items-center gap-1.5">
                {currentLocation.floors.map(fl => (
                  <button
                    key={fl.id}
                    onClick={() => setCurrentFloorId(fl.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                      currentFloorId === fl.id
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-semibold'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white'
                    }`}
                  >
                    {fl.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-l border-slate-200 pl-4 space-y-1">
              <div className="text-[11px] font-semibold text-slate-500">Day Occupancy</div>
              <div className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                {occupancy.rate}% <span className="text-xs font-normal text-slate-500">({occupancy.booked}/{occupancy.total} desks)</span>
              </div>
            </div>
          </div>

        </div>

        {/* Location Operating Info */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="text-slate-700 font-medium">{currentLocation.address}</span>
            <span aria-hidden="true">·</span>
            <span>Hours: {currentLocation.openingHours}</span>
          </div>
          <span className="text-slate-500 font-mono text-[11px]">
            Advance reservation limit: {currentLocation.advanceBookingDaysLimit} days ahead
          </span>
        </div>
      </div>

      {/* Advance Schedule & Slot Selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        
        {/* Row 1: Section Header with Slot Buttons & Calendar View Shortcut */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-slate-600" />
              <span>Select Date &amp; Time Slot</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Book a desk up to {currentLocation.advanceBookingDaysLimit} days in advance for hybrid alignment
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Slot Type Toggle */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
              <button
                onClick={() => setSelectedSlot('morning')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                  selectedSlot === 'morning'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Morning (08:30–13:00)
              </button>
              <button
                onClick={() => setSelectedSlot('afternoon')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                  selectedSlot === 'afternoon'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Afternoon (13:30–18:00)
              </button>
              <button
                onClick={() => setSelectedSlot('full_day')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                  selectedSlot === 'full_day'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Full Day (08:30–18:00)
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Advance Date Strip Horizontal Scroller */}
        <div className="relative">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {advanceDates.map(item => {
              const isSelected = selectedDate === item.iso;
              const isToday = item.iso === '2026-10-25';
              const dayOccupancy = getLocationOccupancy(currentLocationId, item.iso);

              return (
                <button
                  key={item.iso}
                  onClick={() => setSelectedDate(item.iso)}
                  className={`flex flex-col items-center justify-center min-w-[76px] py-2.5 px-2 rounded-lg border text-center transition-all ${
                    isSelected
                      ? 'border-slate-900 bg-slate-900 text-white shadow-xs ring-1 ring-slate-900'
                      : item.isWeekend
                      ? 'border-slate-200 bg-slate-50/70 text-slate-400 hover:border-slate-300'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className={`text-[11px] font-medium uppercase ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                    {item.dayName}
                  </span>
                  <span className="text-sm font-bold mt-0.5 font-mono">
                    {item.dayNum}
                  </span>
                  {isToday ? (
                    <span className={`text-[9px] mt-1 font-semibold ${isSelected ? 'text-emerald-300' : 'text-emerald-600'}`}>
                      Today
                    </span>
                  ) : (
                    <span className={`text-[9px] mt-1 font-mono tabular-nums ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                      {dayOccupancy.rate}% occ
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Date Summary bar + Calendar View Toggle Link */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
          <div>
            Viewing desk inventory for <strong className="text-slate-900">{selectedDate}</strong> (
            <span className="capitalize">{selectedSlot.replace('_', ' ')}</span>)
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setViewMode('calendar');
                setIsEditingLayout(false);
              }}
              className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md flex items-center gap-1.5 transition-colors"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-indigo-600" />
              <span>Open Monthly / Weekly Calendar Trends</span>
            </button>

            <div className="flex items-center gap-1.5">
              <span>Direct Jump:</span>
              <input
                type="date"
                value={selectedDate}
                min="2026-10-25"
                onChange={e => setSelectedDate(e.target.value)}
                className="text-xs px-2 py-1 border border-slate-300 rounded font-mono"
              />
            </div>
          </div>
        </div>

      </div>

      {/* Search, Filter & View Controls */}
      <div className="space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Allocation Policy Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-lg text-xs">
            <button
              onClick={() => setSelectedAllocationFilter('all')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                selectedAllocationFilter === 'all'
                  ? 'bg-slate-900 text-white font-medium shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Desks
            </button>
            <button
              onClick={() => setSelectedAllocationFilter('unreserved')}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                selectedAllocationFilter === 'unreserved'
                  ? 'bg-slate-900 text-white font-medium shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Unreserved (Hot Desks)
            </button>
            <button
              onClick={() => setSelectedAllocationFilter('designated')}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                selectedAllocationFilter === 'designated'
                  ? 'bg-purple-700 text-white font-medium shadow-xs'
                  : 'text-purple-700 hover:bg-purple-50'
              }`}
            >
              <Lock className="w-3 h-3" />
              Designated Desks
            </button>
            <button
              onClick={() => setSelectedAllocationFilter('requires_approval')}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                selectedAllocationFilter === 'requires_approval'
                  ? 'bg-amber-600 text-white font-medium shadow-xs'
                  : 'text-amber-800 hover:bg-amber-50'
              }`}
            >
              <Shield className="w-3 h-3" />
              Requires Approval
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search code (LDN-401), type, assigned name, or gear..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

        </div>

        {/* Sub-Filters: Type, Availability & View Mode */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Desk Type filter */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 text-xs">
              <button
                onClick={() => setSelectedTypeFilter('all')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  selectedTypeFilter === 'all' ? 'bg-slate-900 text-white font-medium' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Types
              </button>
              <button
                onClick={() => setSelectedTypeFilter('standing')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  selectedTypeFilter === 'standing' ? 'bg-slate-900 text-white font-medium' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Standing
              </button>
              <button
                onClick={() => setSelectedTypeFilter('dual_screen')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  selectedTypeFilter === 'dual_screen' ? 'bg-slate-900 text-white font-medium' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Dual 4K
              </button>
              <button
                onClick={() => setSelectedTypeFilter('ultrawide')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  selectedTypeFilter === 'ultrawide' ? 'bg-slate-900 text-white font-medium' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                UltraWide
              </button>
              <button
                onClick={() => setSelectedTypeFilter('window_view')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  selectedTypeFilter === 'window_view' ? 'bg-slate-900 text-white font-medium' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Window View
              </button>
            </div>

            {/* Only Available Toggle */}
            <button
              onClick={() => setOnlyAvailableFilter(!onlyAvailableFilter)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                onlyAvailableFilter
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${onlyAvailableFilter ? 'bg-emerald-600' : 'bg-slate-400'}`}></span>
              Available Only
            </button>
          </div>

          {/* View Mode Toggle: Interactive Map vs Grid vs Availability Calendar vs Edit Layout */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 text-xs shrink-0 overflow-x-auto">
            <button
              onClick={() => {
                setViewMode('map');
                setIsEditingLayout(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded transition-all font-medium whitespace-nowrap ${
                viewMode === 'map' && !isEditingLayout ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              Interactive Map
            </button>
            <button
              onClick={() => {
                setViewMode('grid');
                setIsEditingLayout(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded transition-all font-medium whitespace-nowrap ${
                viewMode === 'grid' && !isEditingLayout ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Grid List ({filteredDesks.length})
            </button>
            <button
              onClick={() => {
                setViewMode('calendar');
                setIsEditingLayout(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded transition-all font-medium whitespace-nowrap ${
                viewMode === 'calendar' && !isEditingLayout ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="View monthly and weekly desk availability trends at a glance"
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              Availability Calendar
            </button>
            <button
              onClick={() => setIsEditingLayout(!isEditingLayout)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded transition-all font-medium whitespace-nowrap ${
                isEditingLayout ? 'bg-indigo-600 text-white font-semibold' : 'text-indigo-700 hover:bg-indigo-50'
              }`}
              title="Edit desk layout coordinates, rotation, and rooms to match the actual office"
            >
              <Sliders className="w-3.5 h-3.5" />
              Edit Floor Map
            </button>
          </div>

        </div>
      </div>

      {/* Main Viewport Content: Editable Floor Plan OR Calendar View OR Interactive Floor Plan OR Desk Grid */}
      {isEditingLayout ? (
        <EditableFloorPlan
          floor={currentFloor}
          desks={floorDesks}
          onClose={() => setIsEditingLayout(false)}
        />
      ) : viewMode === 'calendar' ? (
        <DeskAvailabilityCalendarView
          location={currentLocation}
          onSelectDateAndSwitchToMap={(date) => {
            setSelectedDate(date);
            setViewMode('map');
          }}
          onSelectDateAndSwitchToGrid={(date) => {
            setSelectedDate(date);
            setViewMode('grid');
          }}
        />
      ) : viewMode === 'map' ? (
        <InteractiveFloorPlan
          floor={currentFloor}
          desks={filteredDesks}
          selectedDate={selectedDate}
          selectedSlot={selectedSlot}
          onSelectDesk={desk => setSelectedDesk(desk)}
          selectedDeskId={selectedDesk?.id}
          onOpenEditor={() => setIsEditingLayout(true)}
        />
      ) : (
        /* Grid Card View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDesks.length === 0 ? (
            <div className="col-span-full bg-white rounded-xl border border-slate-200 p-8 text-center">
              <p className="text-sm font-medium text-slate-700">No desks match the selected filter criteria.</p>
              <button
                onClick={() => {
                  setSelectedTypeFilter('all');
                  setSelectedAllocationFilter('all');
                  setOnlyAvailableFilter(false);
                  setSearchQuery('');
                }}
                className="mt-3 px-3 py-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            filteredDesks.map(desk => {
              const avail = getDeskAvailability(desk.id, selectedDate);
              const isAvailable = 
                selectedSlot === 'morning' ? avail.morning :
                selectedSlot === 'afternoon' ? avail.afternoon :
                avail.full_day;

              // Check if booked or requested by current user
              const userActiveBooking = bookings.find(
                b => b.deskId === desk.id && b.date === selectedDate && b.userId === currentUser.id && 
                (b.status === 'confirmed' || b.status === 'checked_in')
              );

              const userPendingRequest = bookings.find(
                b => b.deskId === desk.id && b.date === selectedDate && b.userId === currentUser.id && 
                b.status === 'pending_approval'
              );

              // Check who booked if not user
              const otherBooking = bookings.find(
                b => b.deskId === desk.id && b.date === selectedDate && b.userId !== currentUser.id && 
                (b.status === 'confirmed' || b.status === 'checked_in')
              );

              const isDesignated = desk.allocationType === 'designated';
              const isDesignatedToMe = isDesignated && (
                desk.designatedUserId === currentUser.id || 
                (Boolean(desk.designatedDepartment) && desk.designatedDepartment === currentUser.department)
              );
              const isDesignatedToOther = isDesignated && !isDesignatedToMe && currentUser.role !== 'admin';
              const requiresApproval = (desk.allocationType === 'requires_approval' || desk.requiresApproval) && currentUser.role !== 'admin';

              return (
                <div
                  key={desk.id}
                  className={`bg-white rounded-xl border p-5 shadow-xs transition-all hover:shadow-md flex flex-col justify-between ${
                    userActiveBooking
                      ? 'border-indigo-500 ring-1 ring-indigo-500'
                      : userPendingRequest
                      ? 'border-amber-400 ring-1 ring-amber-300 bg-amber-50/20'
                      : desk.status === 'maintenance'
                      ? 'border-slate-200 opacity-60 bg-slate-50'
                      : isAvailable
                      ? 'border-slate-200 hover:border-slate-300'
                      : 'border-slate-200 bg-slate-50/50'
                  }`}
                >
                  <div>
                    {/* Card Top */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-900 text-white">
                            {desk.code}
                          </span>
                          
                          {/* Allocation Policy Tag */}
                          {isDesignated ? (
                            <span className="text-[10px] font-semibold text-purple-800 bg-purple-100 px-2 py-0.5 rounded flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" />
                              {desk.designatedUserName ? `Designated: ${desk.designatedUserName.split(' ')[0]}` : desk.designatedDepartment ? `Designated: ${desk.designatedDepartment}` : 'Designated'}
                            </span>
                          ) : requiresApproval ? (
                            <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded flex items-center gap-1">
                              <Shield className="w-2.5 h-2.5" /> Approval Req.
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                              Hot Desk
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-semibold text-slate-900 mt-1.5">{desk.name}</h4>
                        <div className="text-xs text-slate-500 capitalize mt-0.5">
                          {desk.deskType.replace('_', ' ')}
                        </div>
                      </div>

                      {/* Status indicator */}
                      <div>
                        {desk.status === 'maintenance' ? (
                          <span className="text-[11px] font-medium text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
                            Maintenance
                          </span>
                        ) : userActiveBooking ? (
                          <span className="text-[11px] font-medium text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded flex items-center gap-1">
                            <Check className="w-3 h-3" /> Booked by You
                          </span>
                        ) : userPendingRequest ? (
                          <span className="text-[11px] font-medium text-amber-800 bg-amber-100 px-2 py-0.5 rounded flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Approval Pending
                          </span>
                        ) : isAvailable ? (
                          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                            Available
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            Occupied {otherBooking ? `(${otherBooking.userName.split(' ')[0]})` : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Equipment list */}
                    <div className="mt-4 space-y-1">
                      {desk.equipment.slice(0, 3).map((eq, i) => (
                        <div key={i} className="text-xs text-slate-600 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span>
                          <span className="truncate">{eq}</span>
                        </div>
                      ))}
                    </div>

                    {desk.notes && (
                      <p className="mt-2 text-[11px] text-slate-500 italic line-clamp-1">
                        {desk.notes}
                      </p>
                    )}
                  </div>

                  {/* Card Bottom CTA */}
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-mono">
                      {currentFloor.name.split('-')[0]}
                    </span>

                    <button
                      onClick={() => setSelectedDesk(desk)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        userActiveBooking
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                          : userPendingRequest
                          ? 'bg-amber-600 text-white hover:bg-amber-700'
                          : requiresApproval
                          ? 'bg-amber-700 text-white hover:bg-amber-800'
                          : isDesignatedToOther
                          ? 'bg-purple-700 text-white hover:bg-purple-800'
                          : isAvailable
                          ? 'bg-slate-900 text-white hover:bg-slate-800'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {userActiveBooking 
                        ? 'Manage Booking' 
                        : userPendingRequest
                        ? 'View Request'
                        : requiresApproval || isDesignatedToOther
                        ? 'Request Reservation'
                        : isAvailable 
                        ? 'Reserve Desk' 
                        : 'View Details'}
                    </button>
                  </div>

                </div>
              );
            })
          )}
        </div>
      )}

      {/* Desk Details & Booking Confirmation Modal */}
      <DeskModal
        desk={selectedDesk}
        onClose={() => setSelectedDesk(null)}
      />

    </div>
  );
};
