import React, { useState, useMemo } from 'react';
import { useDeskBooking } from '../context/DeskBookingContext';
import { Location, Desk, Booking, DeskType, Floor, DeskAllocationType } from '../types/deskBooking';
import { 
  Building2, 
  MapPin, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Sliders, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  User, 
  Check, 
  RefreshCw,
  Layers,
  Wrench,
  FileSpreadsheet,
  Lock,
  Shield,
  Hourglass,
  Send,
  X,
  Filter
} from 'lucide-react';

import { EditableFloorPlan } from './EditableFloorPlan';
import { DailyOccupancyReportModal } from './DailyOccupancyReportModal';

export const AdminConsole: React.FC = () => {
  const {
    currentUser,
    setCurrentUser,
    users,
    locations,
    addLocation,
    updateLocation,
    deleteLocation,
    desks,
    addDesk,
    updateDesk,
    deleteDesk,
    bookings,
    cancelBooking,
    approveBookingRequest,
    rejectBookingRequest,
    selectedDate
  } = useDeskBooking();

  const [activeTab, setActiveTab] = useState<'bookings' | 'approvals' | 'desks' | 'locations' | 'layout' | 'analytics'>('bookings');
  const [layoutLocId, setLayoutLocId] = useState(locations[0]?.id || '');
  const [layoutFloorId, setLayoutFloorId] = useState(locations[0]?.floors[0]?.id || '');
  const [showOccupancyReportModal, setShowOccupancyReportModal] = useState<boolean>(false);
  
  // Bookings Filter State
  const [bkgSearchQuery, setBkgSearchQuery] = useState('');
  const [bkgLocationFilter, setBkgLocationFilter] = useState('all');
  const [bkgStatusFilter, setBkgStatusFilter] = useState('all');
  const [bkgDateFilter, setBkgDateFilter] = useState('');

  // Approvals Tab State
  const [approvalTabFilter, setApprovalTabFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [rejectingBooking, setRejectingBooking] = useState<Booking | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Desk Inventory Filter State
  const [deskFilterLoc, setDeskFilterLoc] = useState('all');
  const [deskFilterAllocation, setDeskFilterAllocation] = useState<'all' | 'unreserved' | 'designated' | 'requires_approval'>('all');
  const [deskSearchQuery, setDeskSearchQuery] = useState('');

  // Desk Form State
  const [showAddDeskModal, setShowAddDeskModal] = useState(false);
  const [editingDesk, setEditingDesk] = useState<Desk | null>(null);
  const [deskFormCode, setDeskFormCode] = useState('');
  const [deskFormName, setDeskFormName] = useState('');
  const [deskFormLocationId, setDeskFormLocationId] = useState(locations[0]?.id || '');
  const [deskFormFloorId, setDeskFormFloorId] = useState(locations[0]?.floors[0]?.id || '');
  const [deskFormType, setDeskFormType] = useState<DeskType>('standing');
  const [deskFormAllocationType, setDeskFormAllocationType] = useState<DeskAllocationType>('unreserved');
  const [deskFormDesignatedUserId, setDeskFormDesignatedUserId] = useState('');
  const [deskFormDesignatedDepartment, setDeskFormDesignatedDepartment] = useState('');
  const [deskFormRequiresApproval, setDeskFormRequiresApproval] = useState(false);
  const [deskFormEquipment, setDeskFormEquipment] = useState('Dual 27" 4K Displays, Electric Sit-Stand Desk, USB-C 90W');
  const [deskFormStatus, setDeskFormStatus] = useState<'active' | 'maintenance'>('active');
  const [deskFormX, setDeskFormX] = useState(30);
  const [deskFormY, setDeskFormY] = useState(40);
  const [deskFormNotes, setDeskFormNotes] = useState('');

  // Location Form State
  const [showAddLocModal, setShowAddLocModal] = useState(false);
  const [locFormName, setLocFormName] = useState('');
  const [locFormCity, setLocFormCity] = useState('');
  const [locFormCountry, setLocFormCountry] = useState('');
  const [locFormAddress, setLocFormAddress] = useState('');
  const [locFormTimezone, setLocFormTimezone] = useState('Europe/London');
  const [locFormAdvanceLimit, setLocFormAdvanceLimit] = useState(30);
  const [locFormOpening, setLocFormOpening] = useState('08:00 - 19:30 (Mon - Fri)');

  // Notification Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // Pending approvals list & count
  const pendingApprovals = useMemo(() => {
    return bookings.filter(b => b.status === 'pending_approval');
  }, [bookings]);

  // Approval requests (all states: pending, confirmed with approvalReason, rejected)
  const allApprovalRequests = useMemo(() => {
    return bookings.filter(b => 
      b.status === 'pending_approval' || 
      b.status === 'rejected' || 
      Boolean(b.approvalReason)
    ).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [bookings]);

  const filteredApprovalRequests = useMemo(() => {
    return allApprovalRequests.filter(req => {
      if (approvalTabFilter === 'pending') return req.status === 'pending_approval';
      if (approvalTabFilter === 'approved') return req.status === 'confirmed' || req.status === 'checked_in';
      if (approvalTabFilter === 'rejected') return req.status === 'rejected';
      return true;
    });
  }, [allApprovalRequests, approvalTabFilter]);

  // Filtered Master Bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      if (bkgLocationFilter !== 'all' && b.locationId !== bkgLocationFilter) return false;
      if (bkgStatusFilter !== 'all' && b.status !== bkgStatusFilter) return false;
      if (bkgDateFilter && b.date !== bkgDateFilter) return false;
      if (bkgSearchQuery.trim()) {
        const q = bkgSearchQuery.toLowerCase();
        const matchesUser = b.userName.toLowerCase().includes(q);
        const matchesDesk = b.deskCode.toLowerCase().includes(q);
        const matchesDept = b.userDepartment.toLowerCase().includes(q);
        if (!matchesUser && !matchesDesk && !matchesDept) return false;
      }
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [bookings, bkgLocationFilter, bkgStatusFilter, bkgDateFilter, bkgSearchQuery]);

  // Filtered Desks for Inventory
  const filteredDesks = useMemo(() => {
    return desks.filter(desk => {
      if (deskFilterLoc !== 'all' && desk.locationId !== deskFilterLoc) return false;
      if (deskFilterAllocation === 'unreserved') {
        if (desk.allocationType && desk.allocationType !== 'unreserved') return false;
      } else if (deskFilterAllocation === 'designated') {
        if (desk.allocationType !== 'designated') return false;
      } else if (deskFilterAllocation === 'requires_approval') {
        if (desk.allocationType !== 'requires_approval' && !desk.requiresApproval) return false;
      }

      if (deskSearchQuery.trim()) {
        const q = deskSearchQuery.toLowerCase();
        const matchesCode = desk.code.toLowerCase().includes(q);
        const matchesName = desk.name.toLowerCase().includes(q);
        const matchesUser = desk.designatedUserName?.toLowerCase().includes(q) || false;
        const matchesDept = desk.designatedDepartment?.toLowerCase().includes(q) || false;
        if (!matchesCode && !matchesName && !matchesUser && !matchesDept) return false;
      }

      return true;
    });
  }, [desks, deskFilterLoc, deskFilterAllocation, deskSearchQuery]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Booking ID', 'Date', 'Slot', 'Desk Code', 'Desk Name', 'Location', 'Employee Name', 'Department', 'Email', 'Status', 'Created At'];
    const rows = filteredBookings.map(b => [
      b.id,
      b.date,
      b.slot,
      b.deskCode,
      `"${b.deskName.replace(/"/g, '""')}"`,
      `"${b.locationName.replace(/"/g, '""')}"`,
      `"${b.userName.replace(/"/g, '""')}"`,
      `"${b.userDepartment.replace(/"/g, '""')}"`,
      b.userEmail,
      b.status,
      b.createdAt
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `flexdesk-master-bookings-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'Master booking report exported to CSV successfully.');
  };

  // Quick Approve Booking
  const handleApprove = (booking: Booking) => {
    approveBookingRequest(booking.id, `Approved by ${currentUser.name}`);
    showToast('success', `Approved reservation request for ${booking.userName} (${booking.deskCode} on ${booking.date})`);
  };

  // Open Decline Modal
  const handleOpenReject = (booking: Booking) => {
    setRejectingBooking(booking);
    setRejectionReason('Workstation required for scheduled executive audit / client demonstration.');
  };

  // Confirm Decline
  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingBooking) return;
    rejectBookingRequest(rejectingBooking.id, rejectionReason.trim() || 'Declined by office manager');
    showToast('success', `Reservation request for ${rejectingBooking.userName} was declined.`);
    setRejectingBooking(null);
    setRejectionReason('');
  };

  // Save Desk Handler
  const handleSaveDesk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deskFormCode.trim() || !deskFormName.trim()) {
      showToast('error', 'Please provide a desk code and name.');
      return;
    }

    const eqList = deskFormEquipment.split(',').map(s => s.trim()).filter(Boolean);

    // Find designated user name if user selected
    let designatedUserName: string | undefined = undefined;
    if (deskFormAllocationType === 'designated' && deskFormDesignatedUserId) {
      const match = users.find(u => u.id === deskFormDesignatedUserId);
      designatedUserName = match?.name;
    }

    if (editingDesk) {
      updateDesk({
        ...editingDesk,
        code: deskFormCode.trim(),
        name: deskFormName.trim(),
        locationId: deskFormLocationId,
        floorId: deskFormFloorId,
        deskType: deskFormType,
        allocationType: deskFormAllocationType,
        designatedUserId: deskFormAllocationType === 'designated' && deskFormDesignatedUserId ? deskFormDesignatedUserId : undefined,
        designatedUserName: deskFormAllocationType === 'designated' ? designatedUserName : undefined,
        designatedDepartment: deskFormAllocationType === 'designated' && deskFormDesignatedDepartment ? deskFormDesignatedDepartment.trim() : undefined,
        requiresApproval: deskFormAllocationType === 'requires_approval' ? true : deskFormRequiresApproval,
        equipment: eqList,
        status: deskFormStatus,
        position: { x: Number(deskFormX), y: Number(deskFormY) },
        notes: deskFormNotes.trim() || undefined
      });
      showToast('success', `Desk ${deskFormCode} policy updated successfully.`);
    } else {
      addDesk({
        code: deskFormCode.trim(),
        name: deskFormName.trim(),
        locationId: deskFormLocationId,
        floorId: deskFormFloorId,
        zoneId: 'zn-custom',
        deskType: deskFormType,
        allocationType: deskFormAllocationType,
        designatedUserId: deskFormAllocationType === 'designated' && deskFormDesignatedUserId ? deskFormDesignatedUserId : undefined,
        designatedUserName: deskFormAllocationType === 'designated' ? designatedUserName : undefined,
        designatedDepartment: deskFormAllocationType === 'designated' && deskFormDesignatedDepartment ? deskFormDesignatedDepartment.trim() : undefined,
        requiresApproval: deskFormAllocationType === 'requires_approval' ? true : deskFormRequiresApproval,
        equipment: eqList,
        status: deskFormStatus,
        position: { x: Number(deskFormX), y: Number(deskFormY) },
        notes: deskFormNotes.trim() || undefined
      });
      showToast('success', `Desk ${deskFormCode} added to inventory.`);
    }

    setShowAddDeskModal(false);
    setEditingDesk(null);
  };

  // Save Location Handler
  const handleSaveLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!locFormName.trim() || !locFormCity.trim()) {
      showToast('error', 'Please provide a location name and city.');
      return;
    }

    const newLoc = addLocation({
      name: locFormName.trim(),
      city: locFormCity.trim(),
      country: locFormCountry.trim(),
      address: locFormAddress.trim(),
      timezone: locFormTimezone.trim(),
      advanceBookingDaysLimit: Number(locFormAdvanceLimit),
      openingHours: locFormOpening.trim(),
      description: `${locFormName} regional office hub.`,
      floors: [
        {
          id: `flr-${Date.now()}`,
          locationId: 'placeholder',
          name: 'Main Floor 1',
          level: 1,
          zones: [
            {
              id: `zn-${Date.now()}`,
              floorId: 'placeholder',
              name: 'Open Workspace Area',
              code: 'ZONE-A',
              description: 'General workstation seating'
            }
          ]
        }
      ]
    });

    showToast('success', `Location "${newLoc.name}" added successfully.`);
    setShowAddLocModal(false);
  };

  const handleOpenEditDesk = (desk: Desk) => {
    setEditingDesk(desk);
    setDeskFormCode(desk.code);
    setDeskFormName(desk.name);
    setDeskFormLocationId(desk.locationId);
    setDeskFormFloorId(desk.floorId);
    setDeskFormType(desk.deskType);
    setDeskFormAllocationType(desk.allocationType || 'unreserved');
    setDeskFormDesignatedUserId(desk.designatedUserId || '');
    setDeskFormDesignatedDepartment(desk.designatedDepartment || '');
    setDeskFormRequiresApproval(Boolean(desk.requiresApproval || desk.allocationType === 'requires_approval'));
    setDeskFormEquipment(desk.equipment.join(', '));
    setDeskFormStatus(desk.status);
    setDeskFormX(desk.position.x);
    setDeskFormY(desk.position.y);
    setDeskFormNotes(desk.notes || '');
    setShowAddDeskModal(true);
  };

  const handleOpenNewDesk = () => {
    setEditingDesk(null);
    setDeskFormCode('');
    setDeskFormName('');
    setDeskFormLocationId(locations[0]?.id || '');
    setDeskFormFloorId(locations[0]?.floors[0]?.id || '');
    setDeskFormType('standing');
    setDeskFormAllocationType('unreserved');
    setDeskFormDesignatedUserId('');
    setDeskFormDesignatedDepartment('');
    setDeskFormRequiresApproval(false);
    setDeskFormEquipment('Dual 27" 4K Displays, Electric Sit-Stand Desk, USB-C 90W');
    setDeskFormStatus('active');
    setDeskFormX(40);
    setDeskFormY(40);
    setDeskFormNotes('');
    setShowAddDeskModal(true);
  };

  return (
    <div className="space-y-6">
      
      {/* Toast */}
      {toast && (
        <div className={`p-3 rounded-lg border text-xs font-medium flex items-center justify-between ${
          toast.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)}>&times;</button>
        </div>
      )}

      {/* Admin Header Banner */}
      <div className="bg-slate-900 rounded-xl p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <span className="text-xs uppercase tracking-wider font-semibold text-indigo-300">
              Workplace Management Layer
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">
            Office Operations Manager Console
          </h1>
          <p className="text-xs text-indigo-200 mt-1">
            Manage global office locations, desk policies, review reservation requests, and supervise employee attendance.
          </p>
        </div>

        {currentUser.role !== 'admin' && (
          <div className="flex items-center gap-2 bg-indigo-800/80 p-2.5 rounded-lg border border-indigo-700 text-xs">
            <span>Viewing as {currentUser.name}.</span>
            <button
              onClick={() => {
                const adminUser = users.find(u => u.role === 'admin') || {
                  id: 'usr-admin-elena',
                  name: 'Elena Rostova',
                  email: 'elena.rostova@acme-corp.internal',
                  role: 'admin',
                  department: 'Workplace Operations',
                  jobTitle: 'Director of Workplace & Facilities',
                  avatarColor: 'bg-blue-700'
                };
                setCurrentUser(adminUser);
                showToast('success', 'Switched to Workplace Admin persona (Elena Rostova)');
              }}
              className="px-2.5 py-1 bg-white text-indigo-900 font-semibold rounded hover:bg-indigo-50 transition-colors"
            >
              Switch to Elena Rostova (Admin)
            </button>
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg max-w-fit text-xs font-medium overflow-x-auto">
        <button
          onClick={() => setActiveTab('bookings')}
          className={`px-4 py-2 rounded-md transition-all whitespace-nowrap ${
            activeTab === 'bookings' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Master Bookings ({filteredBookings.length})
        </button>

        {/* Dedicated Approvals & Requests Tab */}
        <button
          onClick={() => setActiveTab('approvals')}
          className={`px-4 py-2 rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'approvals' 
              ? 'bg-white text-amber-900 shadow-xs font-semibold' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Hourglass className="w-3.5 h-3.5 text-amber-600" />
          <span>Requests &amp; Approvals</span>
          {pendingApprovals.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
              {pendingApprovals.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('desks')}
          className={`px-4 py-2 rounded-md transition-all whitespace-nowrap ${
            activeTab === 'desks' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Desk Inventory ({desks.length})
        </button>

        <button
          onClick={() => setActiveTab('locations')}
          className={`px-4 py-2 rounded-md transition-all whitespace-nowrap ${
            activeTab === 'locations' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Locations &amp; Hubs ({locations.length})
        </button>

        <button
          onClick={() => setActiveTab('layout')}
          className={`px-4 py-2 rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'layout' ? 'bg-white text-indigo-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-indigo-600" />
          Floor Map Designer
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 rounded-md transition-all whitespace-nowrap ${
            activeTab === 'analytics' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Occupancy Metrics
        </button>
      </div>

      {/* TAB 1: MASTER BOOKINGS LEDGER */}
      {activeTab === 'bookings' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              {/* Search */}
              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search employee, desk, department..."
                  value={bkgSearchQuery}
                  onChange={e => setBkgSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {/* Location filter */}
              <select
                value={bkgLocationFilter}
                onChange={e => setBkgLocationFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="all">All Locations</option>
                {locations.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>

              {/* Status filter */}
              <select
                value={bkgStatusFilter}
                onChange={e => setBkgStatusFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="all">All Statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="checked_in">Checked In</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>

              {/* Date Filter */}
              <input
                type="date"
                value={bkgDateFilter}
                onChange={e => setBkgDateFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
              {bkgDateFilter && (
                <button
                  onClick={() => setBkgDateFilter('')}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Clear Date
                </button>
              )}
            </div>

            {/* Export Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowOccupancyReportModal(true)}
                className="px-3.5 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
                title="Export structured daily desk occupancy and attendance records by location"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
                <span>Daily Occupancy Report</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
                title="Export raw booking ledger to CSV"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Raw Bookings CSV</span>
              </button>
            </div>
          </div>

          {/* Bookings Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-medium bg-slate-50/60">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Slot</th>
                  <th className="py-2.5 px-3">Employee</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Desk</th>
                  <th className="py-2.5 px-3">Location</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Manager Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No bookings found for the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map(b => (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-900">
                        {b.date}
                      </td>
                      <td className="py-2.5 px-3 capitalize">
                        {b.slot.replace('_', ' ')}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">
                        {b.userName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {b.userDepartment}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                        {b.deskCode}
                      </td>
                      <td className="py-2.5 px-3 truncate max-w-[150px]">
                        {b.locationName.split('(')[0]}
                      </td>
                      <td className="py-2.5 px-3">
                        {b.status === 'confirmed' ? (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                            Confirmed
                          </span>
                        ) : b.status === 'checked_in' ? (
                          <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-medium">
                            Checked In
                          </span>
                        ) : b.status === 'pending_approval' ? (
                          <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded font-medium">
                            Pending Approval
                          </span>
                        ) : b.status === 'rejected' ? (
                          <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-medium">
                            Declined
                          </span>
                        ) : (
                          <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-medium">
                            Cancelled
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {b.status === 'pending_approval' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleApprove(b)}
                              className="text-emerald-700 hover:text-emerald-900 font-semibold px-2 py-1 bg-emerald-50 hover:bg-emerald-100 rounded"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleOpenReject(b)}
                              className="text-rose-600 hover:text-rose-800 font-medium px-2 py-1 bg-rose-50 hover:bg-rose-100 rounded"
                            >
                              Decline
                            </button>
                          </div>
                        ) : b.status !== 'cancelled' && b.status !== 'rejected' ? (
                          <button
                            onClick={() => {
                              const reason = prompt('Reason for manager cancellation (e.g., facilities maintenance or desk reallocation):');
                              if (reason !== null) {
                                cancelBooking(b.id, reason || 'Cancelled by office manager');
                                showToast('success', `Booking for ${b.userName} on ${b.deskCode} cancelled.`);
                              }
                            }}
                            className="text-rose-600 hover:text-rose-800 font-medium px-2 py-1 rounded hover:bg-rose-50"
                          >
                            Cancel
                          </button>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* TAB 2: REQUESTS & APPROVALS INBOX */}
      {activeTab === 'approvals' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-600" />
                <h3 className="text-base font-semibold text-slate-900">
                  Workstation Reservation Requests &amp; Approvals
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Review employee requests for restricted desks, executive demo suites, and designated workstation exceptions
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-medium">
              <button
                onClick={() => setApprovalTabFilter('pending')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  approvalTabFilter === 'pending'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pending Review ({pendingApprovals.length})
              </button>
              <button
                onClick={() => setApprovalTabFilter('approved')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  approvalTabFilter === 'approved'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Approved
              </button>
              <button
                onClick={() => setApprovalTabFilter('rejected')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  approvalTabFilter === 'rejected'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Declined
              </button>
              <button
                onClick={() => setApprovalTabFilter('all')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  approvalTabFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Records
              </button>
            </div>
          </div>

          {/* List of Requests */}
          <div className="space-y-3 pt-2">
            {filteredApprovalRequests.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 rounded-lg border border-slate-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <h4 className="text-sm font-semibold text-slate-900 mt-2">All requests cleared!</h4>
                <p className="text-xs text-slate-500 mt-1">
                  There are no {approvalTabFilter !== 'all' ? approvalTabFilter : ''} desk requests requiring review at this time.
                </p>
              </div>
            ) : (
              filteredApprovalRequests.map(req => {
                const isPending = req.status === 'pending_approval';
                const isApproved = req.status === 'confirmed' || req.status === 'checked_in';
                const isRejected = req.status === 'rejected';

                return (
                  <div 
                    key={req.id}
                    className={`rounded-xl border p-5 shadow-xs transition-all ${
                      isPending 
                        ? 'border-amber-300 bg-amber-50/20 hover:border-amber-400' 
                        : isApproved 
                        ? 'border-slate-200 bg-white' 
                        : 'border-slate-200 bg-slate-50/60'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      
                      {/* Left: Request details */}
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
                            {req.deskCode}
                          </span>
                          <span className="text-sm font-semibold text-slate-900">
                            {req.deskName}
                          </span>
                          <span className="text-xs text-slate-500">
                            ({req.locationName} · {req.floorName})
                          </span>

                          {/* Status Pill */}
                          {isPending ? (
                            <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              <Hourglass className="w-3 h-3" /> Awaiting Manager Review
                            </span>
                          ) : isApproved ? (
                            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              <Check className="w-3 h-3" /> Approved
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              <X className="w-3 h-3" /> Declined
                            </span>
                          )}
                        </div>

                        {/* Employee & Date info */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                          <div className="flex items-center gap-1.5 font-medium text-slate-900">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{req.userName}</span>
                            <span className="text-slate-400">({req.userDepartment})</span>
                          </div>
                          <span>·</span>
                          <div className="flex items-center gap-1.5 font-mono">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{req.date}</span>
                          </div>
                          <span>·</span>
                          <div className="capitalize font-medium text-slate-700">
                            {req.slot.replace('_', ' ')}
                          </div>
                          <span>·</span>
                          <span className="text-slate-400 text-[11px]">
                            Submitted: {new Date(req.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Business Justification */}
                        <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs">
                          <span className="font-semibold text-slate-900">Employee Justification:</span>
                          <p className="mt-0.5 text-slate-700 italic">
                            "{req.approvalReason || req.notes || 'No specific reason provided.'}"
                          </p>
                        </div>

                        {/* Review record if already actioned */}
                        {req.reviewedBy && (
                          <div className="text-[11px] text-slate-500 pt-1">
                            Reviewed by <strong>{req.reviewedBy}</strong>: {req.reviewNotes}
                          </div>
                        )}
                      </div>

                      {/* Right: Actions */}
                      {isPending && (
                        <div className="flex sm:flex-col lg:flex-row items-center gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0">
                          <button
                            onClick={() => handleApprove(req)}
                            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                          >
                            <Check className="w-4 h-4" />
                            <span>Approve Request</span>
                          </button>
                          <button
                            onClick={() => handleOpenReject(req)}
                            className="px-3.5 py-2 text-xs font-medium text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors flex items-center gap-1.5"
                          >
                            <X className="w-4 h-4 text-rose-600" />
                            <span>Decline</span>
                          </button>
                        </div>
                      )}

                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: DESK INVENTORY WITH ALLOCATION POLICIES */}
      {activeTab === 'desks' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Desk Inventory &amp; Allocation Policies</h3>
              <p className="text-xs text-slate-500">Configure designated permanent desks, unreserved hot desks, approval rules, and equipment</p>
            </div>
            <button
              onClick={handleOpenNewDesk}
              className="px-3.5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              Add New Desk
            </button>
          </div>

          {/* Sub Filter */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <select
              value={deskFilterLoc}
              onChange={e => setDeskFilterLoc(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg"
            >
              <option value="all">All Locations</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>

            <select
              value={deskFilterAllocation}
              onChange={e => setDeskFilterAllocation(e.target.value as any)}
              className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg"
            >
              <option value="all">All Allocation Policies</option>
              <option value="unreserved">Unreserved Hot Desks Only</option>
              <option value="designated">Designated Desks Only</option>
              <option value="requires_approval">Requires Approval Only</option>
            </select>

            <input
              type="text"
              placeholder="Search code, name, or assigned..."
              value={deskSearchQuery}
              onChange={e => setDeskSearchQuery(e.target.value)}
              className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg flex-1 min-w-[180px]"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-medium bg-slate-50/60">
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Desk Name</th>
                  <th className="py-2.5 px-3">Policy / Allocation</th>
                  <th className="py-2.5 px-3">Location / Floor</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Equipment</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredDesks.map(desk => {
                  const loc = locations.find(l => l.id === desk.locationId);
                  const fl = loc?.floors.find(f => f.id === desk.floorId);
                  const isDesignated = desk.allocationType === 'designated';
                  const requiresApproval = desk.allocationType === 'requires_approval' || desk.requiresApproval;

                  return (
                    <tr key={desk.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {desk.code}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">
                        {desk.name}
                      </td>
                      <td className="py-2.5 px-3">
                        {isDesignated ? (
                          <span className="text-purple-800 bg-purple-100 px-2 py-0.5 rounded font-semibold flex items-center gap-1 max-w-fit">
                            <Lock className="w-3 h-3" />
                            <span>
                              {desk.designatedUserName ? `Designated: ${desk.designatedUserName}` : desk.designatedDepartment ? `Designated: ${desk.designatedDepartment}` : 'Designated'}
                            </span>
                          </span>
                        ) : requiresApproval ? (
                          <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded font-semibold flex items-center gap-1 max-w-fit">
                            <Shield className="w-3 h-3" />
                            <span>Requires Approval</span>
                          </span>
                        ) : (
                          <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded font-medium">
                            Unreserved Hot Desk
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {loc?.name.split('(')[0]} · {fl?.name.split('-')[0]}
                      </td>
                      <td className="py-2.5 px-3 capitalize">
                        {desk.deskType.replace('_', ' ')}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">
                        {desk.equipment.join(', ')}
                      </td>
                      <td className="py-2.5 px-3">
                        {desk.status === 'active' ? (
                          <span className="text-emerald-700 font-medium">Active</span>
                        ) : (
                          <span className="text-amber-700 font-medium">Maintenance</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEditDesk(desk)}
                          className="text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded hover:bg-indigo-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete desk ${desk.code}?`)) {
                              deleteDesk(desk.id);
                              showToast('success', `Desk ${desk.code} deleted.`);
                            }
                          }}
                          className="text-rose-600 hover:text-rose-800 font-medium px-2 py-1 rounded hover:bg-rose-50"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: LOCATIONS MANAGEMENT */}
      {activeTab === 'locations' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Workplace Locations</h3>
              <p className="text-xs text-slate-500">Corporate offices, floors, and advance reservation limits</p>
            </div>
            <button
              onClick={() => setShowAddLocModal(true)}
              className="px-3.5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Location
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {locations.map(loc => {
              const locDesks = desks.filter(d => d.locationId === loc.id);

              return (
                <div key={loc.id} className="border border-slate-200 rounded-xl p-5 bg-white space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">{loc.name}</h4>
                      <p className="text-xs text-slate-500">{loc.city}, {loc.country}</p>
                    </div>
                    <span className="font-mono text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      {locDesks.length} Desks
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2">
                    {loc.address}
                  </p>

                  <div className="text-[11px] text-slate-500 space-y-1 border-t border-slate-100 pt-2">
                    <div><strong>Timezone:</strong> {loc.timezone}</div>
                    <div><strong>Advance Booking Window:</strong> {loc.advanceBookingDaysLimit} days</div>
                    <div><strong>Hours:</strong> {loc.openingHours}</div>
                  </div>

                  <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">{loc.floors.length} Floors Configured</span>
                    {locations.length > 1 && (
                      <button
                        onClick={() => {
                          if (confirm(`Delete location ${loc.name}? This removes its desks.`)) {
                            deleteLocation(loc.id);
                            showToast('success', `Location ${loc.name} deleted.`);
                          }
                        }}
                        className="text-rose-600 hover:text-rose-800 text-xs font-medium"
                      >
                        Delete Location
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: FLOOR MAP DESIGNER */}
      {activeTab === 'layout' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600" />
                <span>Floor Map Layout Designer</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Adjust desk coordinates, rotation angles, and architectural elements so digital booking matches the physical office.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={layoutLocId}
                onChange={e => {
                  setLayoutLocId(e.target.value);
                  const l = locations.find(loc => loc.id === e.target.value);
                  if (l && l.floors.length > 0) {
                    setLayoutFloorId(l.floors[0].id);
                  }
                }}
                className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg"
              >
                {locations.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>

              <select
                value={layoutFloorId}
                onChange={e => setLayoutFloorId(e.target.value)}
                className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg"
              >
                {locations.find(l => l.id === layoutLocId)?.floors.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          </div>

          {(() => {
            const loc = locations.find(l => l.id === layoutLocId) || locations[0];
            const floor = loc?.floors.find(f => f.id === layoutFloorId) || loc?.floors[0];
            const floorDesks = desks.filter(d => d.locationId === loc.id && d.floorId === floor?.id);

            if (!floor) return null;

            return (
              <EditableFloorPlan
                floor={floor}
                desks={floorDesks}
                onClose={() => setActiveTab('bookings')}
              />
            );
          })()}
        </div>
      )}

      {/* TAB 6: OCCUPANCY METRICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="text-xs font-medium text-slate-500">Total Workstations</div>
              <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
                {desks.length}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {desks.filter(d => d.allocationType === 'designated').length} designated · {desks.filter(d => d.allocationType === 'requires_approval' || d.requiresApproval).length} approval required
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="text-xs font-medium text-slate-500">Total Bookings Recorded</div>
              <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
                {bookings.length}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {bookings.filter(b => b.status === 'confirmed').length} active · {bookings.filter(b => b.status === 'pending_approval').length} pending approval
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="text-xs font-medium text-slate-500">Global Hub Count</div>
              <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
                {locations.length}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {locations.reduce((acc, l) => acc + l.floors.length, 0)} floors across 3 countries
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Workplace Policy Summary</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="font-semibold text-slate-900">Hybrid Advance Booking</div>
                <p className="text-slate-600">Standard advance window is configured up to 30 days ahead per office hub to empower employees to coordinate in-office collaboration.</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="font-semibold text-slate-900">Desk Allocation Governance</div>
                <p className="text-slate-600">Desks can be designated to specific staff members, restricted for manager approval, or left open as unreserved hot desks.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Decline Booking Reason Modal */}
      {rejectingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900">
                Decline Reservation Request
              </h3>
              <button onClick={() => setRejectingBooking(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="p-6 space-y-4">
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 space-y-1">
                <div><strong>Request:</strong> {rejectingBooking.userName} ({rejectingBooking.userDepartment})</div>
                <div><strong>Desk &amp; Date:</strong> {rejectingBooking.deskCode} on {rejectingBooking.date} ({rejectingBooking.slot.replace('_', ' ')})</div>
                <div><strong>Justification:</strong> "{rejectingBooking.approvalReason || rejectingBooking.notes || 'N/A'}"</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Manager Decline Reason (Sent to Employee)
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRejectingBooking(null)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded shadow-xs"
                >
                  Confirm Decline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Desk Modal */}
      {showAddDeskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900">
                {editingDesk ? `Edit Desk ${editingDesk.code}` : 'Add New Workstation'}
              </h3>
              <button onClick={() => setShowAddDeskModal(false)} className="text-slate-400 hover:text-slate-600">
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveDesk} className="p-6 space-y-3.5 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Desk Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. LDN-430"
                    value={deskFormCode}
                    onChange={e => setDeskFormCode(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Desk Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Desk 430 - Agile Pod"
                    value={deskFormName}
                    onChange={e => setDeskFormName(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded"
                  />
                </div>
              </div>

              {/* Allocation Policy Configuration */}
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-900 mb-1">
                    Allocation Policy
                  </label>
                  <select
                    value={deskFormAllocationType}
                    onChange={e => setDeskFormAllocationType(e.target.value as DeskAllocationType)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded bg-white font-medium"
                  >
                    <option value="unreserved">Unreserved (Hot Desk) — Open to any employee</option>
                    <option value="designated">Designated Workstation — Assigned to employee or department</option>
                    <option value="requires_approval">Requires Approval — Bookings require manager authorization</option>
                  </select>
                </div>

                {deskFormAllocationType === 'designated' && (
                  <div className="space-y-2 pt-1 border-t border-slate-200">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Assigned Employee (Optional)
                      </label>
                      <select
                        value={deskFormDesignatedUserId}
                        onChange={e => setDeskFormDesignatedUserId(e.target.value)}
                        className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded bg-white"
                      >
                        <option value="">None (or Department Assignment below)</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>{u.name} ({u.jobTitle} - {u.department})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Or Assigned Department / Team
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Executive & Legal, Platform Infrastructure, Finance..."
                        value={deskFormDesignatedDepartment}
                        onChange={e => setDeskFormDesignatedDepartment(e.target.value)}
                        className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </div>
                  </div>
                )}

                {deskFormAllocationType !== 'requires_approval' && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="deskRequiresApproval"
                      checked={deskFormRequiresApproval}
                      onChange={e => setDeskFormRequiresApproval(e.target.checked)}
                      className="rounded border-slate-300 text-slate-900"
                    />
                    <label htmlFor="deskRequiresApproval" className="text-xs text-slate-700">
                      Also require manager approval for exceptions or special bookings
                    </label>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Location</label>
                  <select
                    value={deskFormLocationId}
                    onChange={e => {
                      setDeskFormLocationId(e.target.value);
                      const loc = locations.find(l => l.id === e.target.value);
                      if (loc && loc.floors.length > 0) {
                        setDeskFormFloorId(loc.floors[0].id);
                      }
                    }}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded"
                  >
                    {locations.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Desk Type</label>
                  <select
                    value={deskFormType}
                    onChange={e => setDeskFormType(e.target.value as DeskType)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded"
                  >
                    <option value="standing">Electric Standing Desk</option>
                    <option value="dual_screen">Dual 4K Screens</option>
                    <option value="ultrawide">Curved UltraWide</option>
                    <option value="quiet_booth">Silent Focus Pod</option>
                    <option value="window_view">Window View</option>
                    <option value="standard">Standard Hot Desk</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Equipment (comma separated)</label>
                <input
                  type="text"
                  placeholder="Dual 27in 4K Displays, Electric Sit-Stand Desk, USB-C 90W"
                  value={deskFormEquipment}
                  onChange={e => setDeskFormEquipment(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Map X (%)</label>
                  <input
                    type="number"
                    min="5"
                    max="95"
                    value={deskFormX}
                    onChange={e => setDeskFormX(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Map Y (%)</label>
                  <input
                    type="number"
                    min="5"
                    max="95"
                    value={deskFormY}
                    onChange={e => setDeskFormY(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={deskFormStatus}
                    onChange={e => setDeskFormStatus(e.target.value as 'active' | 'maintenance')}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded"
                  >
                    <option value="active">Active</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notes / Instructions</label>
                <input
                  type="text"
                  placeholder="e.g. Monitor arm positioned for left-handed work"
                  value={deskFormNotes}
                  onChange={e => setDeskFormNotes(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddDeskModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded shadow-xs"
                >
                  {editingDesk ? 'Save Changes' : 'Create Desk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Location Modal */}
      {showAddLocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900">Add New Workplace Hub</h3>
              <button onClick={() => setShowAddLocModal(false)} className="text-slate-400 hover:text-slate-600">
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveLocation} className="p-6 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Location Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amsterdam Studio (Canal Hub)"
                  value={locFormName}
                  onChange={e => setLocFormName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    required
                    placeholder="Amsterdam"
                    value={locFormCity}
                    onChange={e => setLocFormCity(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Country</label>
                  <input
                    type="text"
                    required
                    placeholder="Netherlands"
                    value={locFormCountry}
                    onChange={e => setLocFormCountry(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Street Address</label>
                <input
                  type="text"
                  required
                  placeholder="Keizersgracht 421, 1016 EK Amsterdam"
                  value={locFormAddress}
                  onChange={e => setLocFormAddress(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Timezone</label>
                  <input
                    type="text"
                    value={locFormTimezone}
                    onChange={e => setLocFormTimezone(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Advance Limit (Days)</label>
                  <input
                    type="number"
                    min="7"
                    max="90"
                    value={locFormAdvanceLimit}
                    onChange={e => setLocFormAdvanceLimit(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddLocModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded"
                >
                  Create Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Daily Occupancy & Attendance Report Modal */}
      <DailyOccupancyReportModal
        isOpen={showOccupancyReportModal}
        onClose={() => setShowOccupancyReportModal(false)}
        locations={locations}
        desks={desks}
        bookings={bookings}
        initialLocationId={bkgLocationFilter !== 'all' ? bkgLocationFilter : locations[0]?.id}
      />

    </div>
  );
};
