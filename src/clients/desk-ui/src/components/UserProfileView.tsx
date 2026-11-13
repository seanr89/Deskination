import React from 'react';
import { useDeskBooking } from '../context/DeskBookingContext';
import { useAuth } from '../hooks/useAuth';
import {
  User as UserIcon,
  Shield,
  Mail,
  Building2,
  Briefcase,
  KeyRound,
  CheckCircle2,
  Lock,
  LogOut,
  CalendarDays,
  BookmarkCheck,
  Clock,
  Fingerprint,
} from 'lucide-react';

interface PermissionItem {
  label: string;
  description: string;
  granted: boolean;
  requiresAdmin?: boolean;
}

function getInitials(name: string): string {
  const parts = (name || 'U').trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('') || 'U';
}

interface UserProfileViewProps {
  onOpenCookiePreferences?: () => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  onOpenCookiePreferences,
}) => {
  const { currentUser, locations, currentLocationId, getUserStats } = useDeskBooking();
  const { firebaseUser, signOut } = useAuth();

  const isAdmin = currentUser.role === 'admin';
  const initials = getInitials(currentUser.name);

  let preferredLocationId = currentLocationId;
  try {
    const savedLocId = localStorage.getItem(`deskination_pref_loc_${currentUser.id}`);
    if (savedLocId && locations.some(loc => loc.id === savedLocId)) {
      preferredLocationId = savedLocId;
    }
  } catch {
    // Ignore storage access errors in SSR/restricted environments
  }

  const preferredLocation =
    locations.find(loc => loc.id === preferredLocationId) || locations[0] || null;

  const stats = getUserStats(currentUser.id) ?? {
    totalBookings: 0,
    upcomingCount: 0,
    completedCount: 0,
    cancelledCount: 0,
    pendingApprovalsCount: 0,
    cancellationRate: 0,
    mostCommonDesk: null,
    preferredSlot: 'balanced' as const,
    daysInOfficeThisMonth: 0,
  };

  const employeePermissions: PermissionItem[] = [
    {
      label: 'Book unreserved hot desks',
      description: 'Reserve morning, afternoon, or full-day slots across office hubs.',
      granted: true,
    },
    {
      label: 'Request approval for restricted desks',
      description: 'Submit reservation requests with justification for approval-gated desks.',
      granted: true,
    },
    {
      label: 'Manage reservations & calendar invites',
      description: 'Check in, release upcoming bookings, and export .ics calendar events.',
      granted: true,
    },
    {
      label: 'View Office Directory & colleague attendance',
      description: 'See which teammates are booked in the office on a given day.',
      granted: true,
    },
  ];

  const adminPermissions: PermissionItem[] = [
    {
      label: 'Approve or reject pending desk requests',
      description: 'Review employee justifications and manage approval queues.',
      granted: isAdmin,
      requiresAdmin: true,
    },
    {
      label: 'Configure office hubs, floorplans & zones',
      description: 'Edit interactive floor maps, desk positions, and location settings.',
      granted: isAdmin,
      requiresAdmin: true,
    },
    {
      label: 'Assign designated desks & allocation policies',
      description: 'Control unreserved, designated, and approval-required desk rules.',
      granted: isAdmin,
      requiresAdmin: true,
    },
    {
      label: 'Export master booking & occupancy reports',
      description: 'Download CSV occupancy summaries and attendance rosters.',
      granted: isAdmin,
      requiresAdmin: true,
    },
  ];

  const allPermissions = [...employeePermissions, ...adminPermissions];

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <section
        aria-label="Profile overview"
        className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`w-16 h-16 rounded-2xl ${currentUser.avatarColor || 'bg-slate-900'} text-white flex items-center justify-center text-xl font-bold shrink-0 shadow-xs`}
              aria-hidden="true"
            >
              {initials}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  {currentUser.name}
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    isAdmin
                      ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                      : 'bg-slate-100 text-slate-800 border-slate-200'
                  }`}
                >
                  {isAdmin ? (
                    <Shield className="w-3.5 h-3.5 text-indigo-600" aria-hidden="true" />
                  ) : (
                    <UserIcon className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
                  )}
                  {isAdmin ? 'Office Operations Admin' : 'Workspace Employee'}
                </span>
              </div>
              <p className="text-sm text-slate-600">
                {currentUser.jobTitle || 'Team Member'}
                {currentUser.department ? ` · ${currentUser.department}` : ''}
              </p>
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                <span>{currentUser.email}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:text-rose-700 hover:border-rose-200 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              Sign Out
            </button>
          </div>
        </div>
      </section>

      {/* Activity Summary Strip */}
      <section aria-label="Workspace activity summary" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <CalendarDays className="w-3.5 h-3.5 text-indigo-600" aria-hidden="true" />
            <span>Days in Office (This Month)</span>
          </div>
          <div className="mt-1.5 text-2xl font-bold text-slate-900">
            {stats.daysInOfficeThisMonth}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <BookmarkCheck className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
            <span>Upcoming Bookings</span>
          </div>
          <div className="mt-1.5 text-2xl font-bold text-slate-900">
            {stats.upcomingCount}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Building2 className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
            <span>Favorite Desk</span>
          </div>
          <div className="mt-1.5 text-lg font-bold text-slate-900 font-mono">
            {stats.mostCommonDesk?.deskCode || 'None yet'}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Clock className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
            <span>Preferred Slot</span>
          </div>
          <div className="mt-1.5 text-lg font-bold text-slate-900 capitalize">
            {stats.preferredSlot.replace('_', ' ')}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Details + Authentication Session */}
        <div className="space-y-6">
          <section
            aria-labelledby="profile-details-heading"
            className="bg-white rounded-xl border border-slate-200 p-5 space-y-4"
          >
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Briefcase className="w-4 h-4 text-slate-600" aria-hidden="true" />
              <h2 id="profile-details-heading" className="text-sm font-semibold text-slate-900">
                Profile Details
              </h2>
            </div>

            <dl className="space-y-3 text-xs">
              <div>
                <dt className="text-slate-500 font-medium">Full Name</dt>
                <dd className="text-slate-900 font-semibold mt-0.5">{currentUser.name}</dd>
              </div>
              <div>
                <dt className="text-slate-500 font-medium">Email Address</dt>
                <dd className="text-slate-900 font-medium mt-0.5 break-all">{currentUser.email}</dd>
              </div>
              <div>
                <dt className="text-slate-500 font-medium">Department</dt>
                <dd className="text-slate-900 font-medium mt-0.5">
                  {currentUser.department || 'Not assigned'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 font-medium">Job Title</dt>
                <dd className="text-slate-900 font-medium mt-0.5">
                  {currentUser.jobTitle || 'Not assigned'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 font-medium">Workspace User ID</dt>
                <dd className="mt-0.5">
                  <code className="font-mono text-[11px] bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded">
                    {currentUser.id}
                  </code>
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 font-medium">Preferred Office Hub</dt>
                <dd className="text-slate-900 font-medium mt-0.5">
                  {preferredLocation
                    ? `${preferredLocation.name} (${preferredLocation.city})`
                    : 'Not set'}
                </dd>
              </div>
            </dl>
          </section>

          <section
            aria-labelledby="auth-session-heading"
            className="bg-white rounded-xl border border-slate-200 p-5 space-y-4"
          >
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <KeyRound className="w-4 h-4 text-emerald-600" aria-hidden="true" />
              <h2 id="auth-session-heading" className="text-sm font-semibold text-slate-900">
                Authentication &amp; Session
              </h2>
            </div>

            <dl className="space-y-3 text-xs">
              <div>
                <dt className="text-slate-500 font-medium">Authentication Provider</dt>
                <dd className="text-slate-900 font-medium mt-0.5">Firebase Authentication</dd>
              </div>
              <div>
                <dt className="text-slate-500 font-medium">Email Verification</dt>
                <dd className="mt-0.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                      firebaseUser?.emailVerified
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {firebaseUser?.emailVerified ? 'Verified' : 'Standard Session'}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 font-medium flex items-center gap-1">
                  <Fingerprint className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                  <span>Firebase UID</span>
                </dt>
                <dd className="mt-0.5">
                  <code className="font-mono text-[11px] bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded break-all">
                    {firebaseUser?.uid || currentUser.id}
                  </code>
                </dd>
              </div>
            </dl>

            <div className="pt-2 border-t border-slate-100 space-y-2">
              {onOpenCookiePreferences && (
                <button
                  type="button"
                  onClick={onOpenCookiePreferences}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Manage Cookie &amp; Privacy Preferences
                </button>
              )}
              <button
                type="button"
                onClick={() => void signOut()}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-rose-200 bg-rose-50/60 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                Sign Out of Deskination
              </button>
            </div>
          </section>
        </div>

        {/* Role Access & Permissions Card */}
        <section
          aria-labelledby="role-access-heading"
          className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-600" aria-hidden="true" />
              <h2 id="role-access-heading" className="text-sm font-semibold text-slate-900">
                Role Access &amp; Permissions
              </h2>
            </div>
            <span className="text-xs font-medium text-slate-500">
              Current role:{' '}
              <strong className="text-slate-900 uppercase">{currentUser.role}</strong>
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            {isAdmin
              ? 'Your account has Office Operations Admin access, granting full workspace management privileges alongside standard employee desk booking capabilities.'
              : 'Your account has Workspace Employee access. You can book available desks, submit approval requests, and view office attendance.'}
          </p>

          <ul className="divide-y divide-slate-100">
            {allPermissions.map(permission => (
              <li
                key={permission.label}
                className="py-3 first:pt-1 last:pb-1 flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  {permission.granted ? (
                    <CheckCircle2
                      className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0"
                      aria-hidden="true"
                    />
                  ) : (
                    <Lock
                      className="w-4 h-4 text-slate-400 mt-0.5 shrink-0"
                      aria-hidden="true"
                    />
                  )}
                  <div>
                    <div
                      className={`text-xs font-semibold ${
                        permission.granted ? 'text-slate-900' : 'text-slate-500'
                      }`}
                    >
                      {permission.label}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{permission.description}</p>
                  </div>
                </div>

                <span
                  className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                    permission.granted
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-slate-50 text-slate-500 border-slate-200'
                  }`}
                >
                  {permission.granted ? 'Enabled' : 'Admin role required'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
};
