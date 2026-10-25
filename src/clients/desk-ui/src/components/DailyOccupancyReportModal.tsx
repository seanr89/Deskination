import React, { useState, useMemo } from 'react';
import { Location, Desk, Booking } from '../types/deskBooking';
import { 
  X, 
  Download, 
  Calendar, 
  Building2, 
  Users, 
  CheckCircle2, 
  TrendingUp, 
  FileSpreadsheet, 
  Check, 
  AlertCircle,
  Clock,
  Filter
} from 'lucide-react';

interface DailyOccupancyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  locations: Location[];
  desks: Desk[];
  bookings: Booking[];
  initialLocationId?: string;
}

export const DailyOccupancyReportModal: React.FC<DailyOccupancyReportModalProps> = ({
  isOpen,
  onClose,
  locations,
  desks,
  bookings,
  initialLocationId
}) => {
  const [selectedLocationId, setSelectedLocationId] = useState<string>(
    initialLocationId && initialLocationId !== 'all' ? initialLocationId : (locations[0]?.id || 'all')
  );
  const [startDate, setStartDate] = useState<string>('2026-10-01');
  const [endDate, setEndDate] = useState<string>('2026-10-31');
  const [reportFormat, setReportFormat] = useState<'daily_summary' | 'detailed_attendance'>('daily_summary');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  if (!isOpen) return null;

  // Generate continuous list of dates between start and end
  const dateRange = useMemo(() => {
    if (!startDate || !endDate || startDate > endDate) return [];
    const dates: string[] = [];
    const current = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);

    // Guard against excessive range (> 120 days)
    let count = 0;
    while (current <= end && count < 120) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
      count++;
    }
    return dates;
  }, [startDate, endDate]);

  // Target locations
  const targetLocations = useMemo(() => {
    if (selectedLocationId === 'all') return locations;
    return locations.filter(l => l.id === selectedLocationId);
  }, [selectedLocationId, locations]);

  // Calculate daily rows for the summary
  const dailySummaryData = useMemo(() => {
    const rows: {
      date: string;
      locationId: string;
      locationName: string;
      city: string;
      country: string;
      totalDesks: number;
      bookedDesksCount: number;
      occupancyRate: number;
      morningCount: number;
      afternoonCount: number;
      fullDayCount: number;
      checkedInCount: number;
      uniqueAttendeesCount: number;
      attendeeNames: string;
      attendeeDepartments: string;
      cancellationsCount: number;
    }[] = [];

    for (const date of dateRange) {
      for (const loc of targetLocations) {
        const activeDesksInLoc = desks.filter(d => d.locationId === loc.id && d.status === 'active');
        const totalDesks = activeDesksInLoc.length;

        // Active bookings for this date and location
        const activeBookings = bookings.filter(
          b => b.locationId === loc.id && b.date === date && b.status !== 'cancelled'
        );

        // Cancelled bookings
        const cancelledBookings = bookings.filter(
          b => b.locationId === loc.id && b.date === date && b.status === 'cancelled'
        );

        const uniqueBookedDeskIds = new Set(activeBookings.map(b => b.deskId));
        const bookedDesksCount = uniqueBookedDeskIds.size;
        const occupancyRate = totalDesks > 0 ? Math.round((bookedDesksCount / totalDesks) * 100) : 0;

        const morningCount = activeBookings.filter(b => b.slot === 'morning').length;
        const afternoonCount = activeBookings.filter(b => b.slot === 'afternoon').length;
        const fullDayCount = activeBookings.filter(b => b.slot === 'full_day').length;
        const checkedInCount = activeBookings.filter(b => b.status === 'checked_in').length;

        const uniqueAttendees = Array.from(new Set(activeBookings.map(b => b.userName)));
        const uniqueDepartments = Array.from(new Set(activeBookings.map(b => b.userDepartment)));

        rows.push({
          date,
          locationId: loc.id,
          locationName: loc.name,
          city: loc.city,
          country: loc.country,
          totalDesks,
          bookedDesksCount,
          occupancyRate,
          morningCount,
          afternoonCount,
          fullDayCount,
          checkedInCount,
          uniqueAttendeesCount: uniqueAttendees.length,
          attendeeNames: uniqueAttendees.join('; '),
          attendeeDepartments: uniqueDepartments.join('; '),
          cancellationsCount: cancelledBookings.length
        });
      }
    }

    return rows;
  }, [dateRange, targetLocations, desks, bookings]);

  // Aggregate Metrics for Live Preview
  const aggregateMetrics = useMemo(() => {
    if (dailySummaryData.length === 0) {
      return { avgOccupancy: 0, totalBookings: 0, uniqueEmployees: 0, totalCancellations: 0 };
    }

    const totalRates = dailySummaryData.reduce((acc, row) => acc + row.occupancyRate, 0);
    const avgOccupancy = Math.round(totalRates / dailySummaryData.length);
    const totalBookings = dailySummaryData.reduce((acc, row) => acc + row.morningCount + row.afternoonCount + row.fullDayCount, 0);
    const totalCancellations = dailySummaryData.reduce((acc, row) => acc + row.cancellationsCount, 0);

    // Filter all bookings in the window for unique employees
    const inWindowBookings = bookings.filter(
      b => (selectedLocationId === 'all' || b.locationId === selectedLocationId) &&
           b.date >= startDate &&
           b.date <= endDate &&
           b.status !== 'cancelled'
    );
    const uniqueEmployees = new Set(inWindowBookings.map(b => b.userId)).size;

    return { avgOccupancy, totalBookings, uniqueEmployees, totalCancellations };
  }, [dailySummaryData, bookings, selectedLocationId, startDate, endDate]);

  // Presets handler
  const handleApplyPreset = (preset: 'this_month' | 'past_7' | 'past_30' | 'next_14') => {
    if (preset === 'this_month') {
      setStartDate('2026-10-01');
      setEndDate('2026-10-31');
    } else if (preset === 'past_7') {
      setStartDate('2026-10-18');
      setEndDate('2026-10-25');
    } else if (preset === 'past_30') {
      setStartDate('2026-09-25');
      setEndDate('2026-10-25');
    } else if (preset === 'next_14') {
      setStartDate('2026-10-25');
      setEndDate('2026-11-08');
    }
  };

  // CSV Generator & Downloader
  const handleDownloadCSV = () => {
    setIsExporting(true);

    const escapeCsv = (val: any) => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    let csvContent = '';
    const locSlug = selectedLocationId === 'all' 
      ? 'all-locations' 
      : (locations.find(l => l.id === selectedLocationId)?.name.split('(')[0].trim().toLowerCase().replace(/\s+/g, '-') || 'office');

    if (reportFormat === 'daily_summary') {
      // 1. Daily Summary Format
      const headers = [
        'Date',
        'Office Location',
        'City',
        'Country',
        'Total Active Desks',
        'Unique Desks Occupied',
        'Occupancy Rate (%)',
        'Morning Slots Booked',
        'Afternoon Slots Booked',
        'Full Day Slots Booked',
        'Check-Ins Recorded',
        'Attendee Headcount',
        'Attendee Names',
        'Departments Represented',
        'Cancellations'
      ];

      const rows = dailySummaryData.map(r => [
        escapeCsv(r.date),
        escapeCsv(r.locationName),
        escapeCsv(r.city),
        escapeCsv(r.country),
        r.totalDesks,
        r.bookedDesksCount,
        `${r.occupancyRate}%`,
        r.morningCount,
        r.afternoonCount,
        r.fullDayCount,
        r.checkedInCount,
        r.uniqueAttendeesCount,
        escapeCsv(r.attendeeNames),
        escapeCsv(r.attendeeDepartments),
        r.cancellationsCount
      ]);

      csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    } else {
      // 2. Detailed Individual Attendance Log Format
      const targetBookings = bookings.filter(b => {
        if (selectedLocationId !== 'all' && b.locationId !== selectedLocationId) return false;
        if (b.date < startDate || b.date > endDate) return false;
        return true;
      }).sort((a, b) => a.date.localeCompare(b.date));

      const headers = [
        'Booking ID',
        'Date',
        'Location Name',
        'Floor Name',
        'Desk Code',
        'Desk Name',
        'Employee Name',
        'Employee Email',
        'Department',
        'Slot Type',
        'Attendance Status',
        'Check-In Timestamp',
        'Created At',
        'Booking Notes'
      ];

      const rows = targetBookings.map(b => [
        escapeCsv(b.id),
        escapeCsv(b.date),
        escapeCsv(b.locationName),
        escapeCsv(b.floorName),
        escapeCsv(b.deskCode),
        escapeCsv(b.deskName),
        escapeCsv(b.userName),
        escapeCsv(b.userEmail),
        escapeCsv(b.userDepartment),
        escapeCsv(b.slot),
        escapeCsv(b.status),
        escapeCsv(b.checkInAt || 'Not Checked In'),
        escapeCsv(b.createdAt),
        escapeCsv(b.notes || '')
      ]);

      csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download', 
      `flexdesk-${reportFormat === 'daily_summary' ? 'daily-occupancy' : 'attendance-roster'}-${locSlug}-${startDate}-to-${endDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setIsExporting(false);
    setSuccessToast(`Report exported successfully! Downloaded: flexdesk-${locSlug}-${startDate}-to-${endDate}.csv`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const selectedLocObj = locations.find(l => l.id === selectedLocationId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Export Daily Desk Occupancy &amp; Attendance Report
              </h3>
              <p className="text-xs text-slate-500">
                Generate CSV records for workplace analytics, hybrid attendance, and facilities planning
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast */}
        {successToast && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Modal Form Body */}
        <div className="p-6 space-y-5 max-h-[72vh] overflow-y-auto">
          
          {/* 1. Location Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Select Office Location
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setSelectedLocationId('all')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  selectedLocationId === 'all'
                    ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-600'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <div className="text-xs font-semibold text-slate-900">All Offices</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Global Rollup</div>
                <div className="text-[10px] text-indigo-700 font-mono mt-1">
                  {desks.filter(d => d.status === 'active').length} total desks
                </div>
              </button>

              {locations.map(loc => {
                const locDesks = desks.filter(d => d.locationId === loc.id && d.status === 'active');
                const isSelected = selectedLocationId === loc.id;

                return (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => setSelectedLocationId(loc.id)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-600'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-semibold text-slate-900 truncate">{loc.name.split('(')[0]}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{loc.city}</div>
                    <div className="text-[10px] text-indigo-700 font-mono mt-1">
                      {locDesks.length} desks
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Date Range & Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">
                Reporting Date Window
              </label>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleApplyPreset('this_month')}
                  className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                >
                  This Month (Oct)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('past_7')}
                  className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                >
                  Past 7 Days
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('next_14')}
                  className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                >
                  Next 14 Days
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="block text-[11px] text-slate-500 mb-1">Start Date</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
              <div>
                <span className="block text-[11px] text-slate-500 mb-1">End Date</span>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>
          </div>

          {/* 3. Report Granularity / Format Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              CSV Report Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setReportFormat('daily_summary')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  reportFormat === 'daily_summary'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="text-xs font-semibold">Daily Occupancy Summary</div>
                <div className={`text-[11px] mt-1 ${reportFormat === 'daily_summary' ? 'text-slate-300' : 'text-slate-500'}`}>
                  1 row per day showing capacity, booked desks, occupancy rate %, slot breakdown, and attendee headcount.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setReportFormat('detailed_attendance')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  reportFormat === 'detailed_attendance'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="text-xs font-semibold">Individual Attendance Log</div>
                <div className={`text-[11px] mt-1 ${reportFormat === 'detailed_attendance' ? 'text-slate-300' : 'text-slate-500'}`}>
                  Detailed line-by-line employee log with desk codes, check-in timestamps, and departments.
                </div>
              </button>
            </div>
          </div>

          {/* 4. Live Report Preview Metrics */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                Report Metrics Preview ({dateRange.length} Days Analyzed)
              </span>
              <span className="text-slate-500 font-mono text-[11px]">
                {startDate} → {endDate}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <div className="text-[11px] text-slate-500">Avg Occupancy</div>
                <div className="text-base font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                  {aggregateMetrics.avgOccupancy}%
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <div className="text-[11px] text-slate-500">Desk Bookings</div>
                <div className="text-base font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                  {aggregateMetrics.totalBookings}
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <div className="text-[11px] text-slate-500">Unique Staff</div>
                <div className="text-base font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                  {aggregateMetrics.uniqueEmployees}
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <div className="text-[11px] text-slate-500">Cancellations</div>
                <div className="text-base font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                  {aggregateMetrics.totalCancellations}
                </div>
              </div>
            </div>

            {/* Quick table preview of top 4 rows */}
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
              <div className="px-3 py-1.5 bg-slate-100/70 border-b border-slate-200 text-[11px] font-semibold text-slate-700 flex justify-between">
                <span>Sample Data Rows</span>
                <span className="text-slate-500 font-normal">{dailySummaryData.length} total rows generated</span>
              </div>
              <div className="overflow-x-auto max-h-32 divide-y divide-slate-100 text-xs">
                {dailySummaryData.slice(0, 4).map((row, idx) => (
                  <div key={idx} className="px-3 py-1.5 flex items-center justify-between text-[11px] text-slate-700">
                    <span className="font-mono font-medium text-slate-900">{row.date}</span>
                    <span className="truncate max-w-[140px] text-slate-600">{row.locationName.split('(')[0]}</span>
                    <span className="font-mono font-semibold text-slate-900">{row.occupancyRate}% ({row.bookedDesksCount}/{row.totalDesks})</span>
                    <span className="text-slate-500">{row.uniqueAttendeesCount} attendees</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* Modal Action Bar */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDownloadCSV}
            disabled={isExporting || dateRange.length === 0}
            className="px-5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 rounded-lg shadow-xs flex items-center gap-2 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV Report ({dailySummaryData.length} records)</span>
          </button>
        </div>

      </div>
    </div>
  );
};
