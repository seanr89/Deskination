import React from 'react';
import { useDeskBooking } from '../context/DeskBookingContext';
import { useAuth } from '../hooks/useAuth';
import { Building2, User, Shield, ChevronDown, RefreshCw, LogOut, KeyRound } from 'lucide-react';

interface HeaderProps {
  currentView: 'book' | 'dashboard' | 'admin' | 'directory';
  onNavigate: (view: 'book' | 'dashboard' | 'admin' | 'directory') => void;
  onOpenUserModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onNavigate, onOpenUserModal }) => {
  const { currentUser } = useDeskBooking();
  const { authMode, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          
          {/* Zone 1: Single text element Brand Zone */}
          <div className="flex items-center gap-3 shrink-0">
            <button 
              onClick={() => onNavigate('book')} 
              className="flex items-center gap-2 text-left group focus:outline-none"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                FD
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
                  FlexDesk
                </span>
                <span className="hidden sm:inline-block ml-2 text-xs font-normal text-slate-500">
                  Hybrid Workspace
                </span>
              </div>
            </button>
          </div>

          {/* Zone 2: 4 Clean single-line navigation links */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <button
              onClick={() => onNavigate('book')}
              className={`px-3 py-2 rounded-md transition-colors whitespace-nowrap ${
                currentView === 'book'
                  ? 'text-slate-900 bg-slate-100 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Book a Desk
            </button>
            <button
              onClick={() => onNavigate('dashboard')}
              className={`px-3 py-2 rounded-md transition-colors whitespace-nowrap ${
                currentView === 'dashboard'
                  ? 'text-slate-900 bg-slate-100 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              My Dashboard
            </button>
            <button
              onClick={() => onNavigate('directory')}
              className={`px-3 py-2 rounded-md transition-colors whitespace-nowrap ${
                currentView === 'directory'
                  ? 'text-slate-900 bg-slate-100 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Office Directory
            </button>
            <button
              onClick={() => onNavigate('admin')}
              className={`px-3 py-2 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                currentView === 'admin'
                  ? 'text-indigo-900 bg-indigo-50 font-semibold'
                  : 'text-slate-600 hover:text-indigo-900 hover:bg-indigo-50/50'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-indigo-600" />
              Office Management
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action & Profile Switcher */}
          <div className="flex items-center gap-2.5 shrink-0">
            <span
              className={`hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium border ${
                authMode === 'firebase'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
              title={
                authMode === 'firebase'
                  ? 'Authenticated via Firebase Auth'
                  : 'Running in Demo Workspace mode'
              }
            >
              <KeyRound className="w-3 h-3" />
              {authMode === 'firebase' ? 'Firebase Auth' : 'Demo Mode'}
            </span>

            <button
              onClick={onOpenUserModal}
              className="flex items-center gap-2.5 py-1.5 px-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors text-left"
              title="Click to inspect session details, switch persona, or manage authentication"
            >
              <div className={`w-7 h-7 rounded-full ${currentUser.avatarColor} text-white flex items-center justify-center text-xs font-semibold shrink-0`}>
                {currentUser.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="hidden lg:block">
                <div className="text-xs font-semibold text-slate-900 leading-tight">
                  {currentUser.name}
                </div>
                <div className="text-[11px] text-slate-500 leading-tight">
                  {currentUser.role === 'admin' ? 'Office Admin' : currentUser.department}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => void signOut()}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-rose-700 hover:border-rose-200 hover:bg-rose-50 transition-colors"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Mobile Sub-Navigation Bar */}
        <div className="flex md:hidden border-t border-slate-200 py-2 gap-2 overflow-x-auto text-xs">
          <button
            onClick={() => onNavigate('book')}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap font-medium ${
              currentView === 'book' ? 'bg-slate-900 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            Book a Desk
          </button>
          <button
            onClick={() => onNavigate('dashboard')}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap font-medium ${
              currentView === 'dashboard' ? 'bg-slate-900 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            My Dashboard
          </button>
          <button
            onClick={() => onNavigate('directory')}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap font-medium ${
              currentView === 'directory' ? 'bg-slate-900 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            Directory
          </button>
          <button
            onClick={() => onNavigate('admin')}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap font-medium flex items-center gap-1 ${
              currentView === 'admin' ? 'bg-indigo-700 text-white' : 'text-indigo-700 bg-indigo-50'
            }`}
          >
            <Shield className="w-3 h-3" />
            Office Admin
          </button>
        </div>

      </div>
    </header>
  );
};
