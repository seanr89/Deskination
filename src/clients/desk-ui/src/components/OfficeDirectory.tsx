import React, { useState } from 'react';
import { useDeskBooking } from '../context/DeskBookingContext';
import { Search, MapPin, Building2, User as UserIcon, Monitor, Calendar } from 'lucide-react';

export const OfficeDirectory: React.FC = () => {
  const { locations, desks, users, bookings, selectedDate } = useDeskBooking();
  const [tab, setTab] = useState<'colleagues' | 'desks'>('colleagues');
  const [search, setSearch] = useState('');

  const filteredUsers = users.filter(u => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.department.toLowerCase().includes(q) || u.jobTitle.toLowerCase().includes(q);
  });

  const filteredDesks = desks.filter(d => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return d.code.toLowerCase().includes(q) || d.name.toLowerCase().includes(q) || d.equipment.some(e => e.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Workplace Directory &amp; Colleague Locator
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Discover colleagues across engineering, design, and sales, and see desk allocations for hybrid coordination.
          </p>
        </div>

        {/* Tab & Search */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search colleagues or desks..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-medium">
            <button
              onClick={() => setTab('colleagues')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                tab === 'colleagues' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Colleagues ({filteredUsers.length})
            </button>
            <button
              onClick={() => setTab('desks')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                tab === 'desks' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Desks ({filteredDesks.length})
            </button>
          </div>
        </div>
      </div>

      {tab === 'colleagues' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map(user => {
            // Check if this user has a booking today (2026-10-25)
            const todayBooking = bookings.find(
              b => b.userId === user.id && b.date === selectedDate && b.status !== 'cancelled'
            );

            return (
              <div key={user.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-start gap-4">
                <div className={`w-11 h-11 rounded-full ${user.avatarColor} text-white flex items-center justify-center font-bold text-sm shrink-0`}>
                  {user.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-900 truncate">{user.name}</h4>
                    {user.role === 'admin' && (
                      <span className="text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded font-medium">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 truncate">{user.jobTitle}</p>
                  <p className="text-[11px] text-slate-400 truncate">{user.department}</p>
                  
                  {/* Today's status */}
                  <div className="pt-2 text-xs">
                    {todayBooking ? (
                      <div className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                        <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="truncate">In Office ({todayBooking.deskCode} · {todayBooking.slot.replace('_', ' ')})</span>
                      </div>
                    ) : (
                      <div className="text-slate-400 text-[11px]">
                        Remote / No desk booked today
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDesks.map(desk => {
            const loc = locations.find(l => l.id === desk.locationId);

            return (
              <div key={desk.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
                    {desk.code}
                  </span>
                  <span className="text-xs text-slate-500 capitalize">{desk.deskType.replace('_', ' ')}</span>
                </div>
                <h4 className="text-sm font-semibold text-slate-900">{desk.name}</h4>
                <p className="text-xs text-slate-500">{loc?.name.split('(')[0]}</p>
                <div className="space-y-1 pt-1">
                  {desk.equipment.slice(0, 3).map((e, idx) => (
                    <div key={idx} className="text-xs text-slate-600 truncate">
                      · {e}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
