import React from 'react';
import {
  Building2,
  Calendar,
  CheckCircle2,
  LogIn,
  Map,
  MapPin,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react';

export interface WelcomeLandingViewProps {
  onSignIn: () => void;
  onCreateAccount: () => void;
  onOpenCookiePreferences?: () => void;
}

const CORE_FEATURES = [
  {
    id: 'floorplans',
    title: 'Interactive Floorplans',
    description:
      'Browse live floor layouts, filter by desk equipment, and reserve unreserved, designated, or approval-gated desks.',
    icon: Map,
    accentClass: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  },
  {
    id: 'calendar',
    title: 'Availability Calendar',
    description:
      'Check multi-day desk availability and book Morning, Afternoon, or Full Day slots with automatic conflict prevention.',
    icon: Calendar,
    accentClass: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  },
  {
    id: 'directory',
    title: 'Office Directory & Check-In',
    description:
      'See which colleagues are in the office today, filter by department, and check into confirmed reservations.',
    icon: Users,
    accentClass: 'bg-amber-50 text-amber-700 border-amber-100',
  },
] as const;

const OFFICE_HUBS = [
  {
    id: 'belfast',
    name: 'Belfast Hub',
    location: 'Belfast, United Kingdom',
    summary: 'Titanic Quarter workspace',
  },
  {
    id: 'london',
    name: 'London Hub',
    location: 'London, United Kingdom',
    summary: 'Central collaborative floors',
  },
  {
    id: 'dubai',
    name: 'Dubai Hub',
    location: 'Dubai, United Arab Emirates',
    summary: 'Regional hub workspace',
  },
] as const;

export const WelcomeLandingView: React.FC<WelcomeLandingViewProps> = ({
  onSignIn,
  onCreateAccount,
  onOpenCookiePreferences,
}) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              DN
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900 block leading-tight">
                Deskination
              </span>
              <span className="text-[11px] text-slate-500 block leading-tight">
                Internal Office Desk Booking
              </span>
            </div>
          </div>

          <nav aria-label="Authentication" className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onSignIn}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-lg border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 text-xs sm:text-sm font-semibold transition-colors"
            >
              <LogIn className="w-4 h-4" aria-hidden="true" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={onCreateAccount}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors"
            >
              <UserPlus className="w-4 h-4" aria-hidden="true" />
              <span>Create Account</span>
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-14">
        {/* Hero / Overview */}
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-10 lg:p-12">
          <div className="max-w-3xl space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Single-Company Hybrid Workspace</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
              Welcome to Deskination
            </h1>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              A lightweight internal office desk booking tool for planning your in-office days.
              Explore interactive floorplans, check upcoming desk availability across morning,
              afternoon, or full-day slots, and coordinate attendance across our Belfast, London,
              and Dubai hubs.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onSignIn}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold shadow-xs transition-colors"
              >
                <LogIn className="w-4 h-4" aria-hidden="true" />
                <span>Sign In</span>
              </button>
              <button
                type="button"
                onClick={onCreateAccount}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 text-sm font-semibold transition-colors"
              >
                <UserPlus className="w-4 h-4" aria-hidden="true" />
                <span>Create Account</span>
              </button>
            </div>

            <ul
              role="list"
              className="pt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-600 border-t border-slate-100"
            >
              <li className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                <span>Morning, Afternoon &amp; Full Day slots</span>
              </li>
              <li className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                <span>Unreserved, designated &amp; approval-gated desks</span>
              </li>
              <li className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                <span>Secured with Firebase Authentication</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Core Features */}
        <section className="space-y-6">
          <div className="max-w-2xl">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Everything you need for hybrid office days
            </h2>
            <p className="mt-1.5 text-sm text-slate-600">
              Built for employees and workplace managers to reserve seats, manage desk policies,
              and see who is on site.
            </p>
          </div>

          <ul role="list" className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {CORE_FEATURES.map(feature => {
              const Icon = feature.icon;
              return (
                <li
                  key={feature.id}
                  className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col gap-3"
                >
                  <div
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${feature.accentClass}`}
                  >
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{feature.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{feature.description}</p>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Supported Office Hubs */}
        <section className="space-y-6">
          <div className="max-w-2xl">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Supported Office Hubs
            </h2>
            <p className="mt-1.5 text-sm text-slate-600">
              Switch seamlessly between company office locations with local hours and floor maps.
            </p>
          </div>

          <ul role="list" className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {OFFICE_HUBS.map(hub => (
              <li
                key={hub.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-2"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-tight">
                      {hub.name}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
                      <span>{hub.location}</span>
                    </p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 pt-1">{hub.summary}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white pt-6 pb-28 sm:pb-24 mt-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Deskination</span>
            <span>· Internal Office Desk Booking</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-slate-500">
            {OFFICE_HUBS.map(hub => (
              <span key={hub.id} className="hidden sm:inline">
                {hub.name}
              </span>
            ))}
            {onOpenCookiePreferences && (
              <button
                type="button"
                onClick={onOpenCookiePreferences}
                className="text-slate-600 hover:text-slate-900 underline underline-offset-2 font-medium transition-colors min-h-[24px]"
              >
                Cookie Preferences
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};
