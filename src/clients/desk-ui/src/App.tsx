import React, { useState } from 'react';
import { DeskBookingProvider, useDeskBooking } from './context/DeskBookingContext';
import { Header } from './components/Header';
import { BookDeskView } from './components/BookDeskView';
import { EmployeeDashboard } from './components/EmployeeDashboard';
import { AdminConsole } from './components/AdminConsole';
import { OfficeDirectory } from './components/OfficeDirectory';
import { UserSwitcherModal } from './components/UserSwitcherModal';

function MainApp() {
  const [currentView, setCurrentView] = useState<'book' | 'dashboard' | 'admin' | 'directory'>('book');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const { locations } = useDeskBooking();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      
      {/* Header Contract */}
      <Header
        currentView={currentView}
        onNavigate={view => setCurrentView(view)}
        onOpenUserModal={() => setIsUserModalOpen(true)}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentView === 'book' && <BookDeskView />}
        {currentView === 'dashboard' && <EmployeeDashboard onNavigateToBooking={() => setCurrentView('book')} />}
        {currentView === 'directory' && <OfficeDirectory />}
        {currentView === 'admin' && <AdminConsole />}
      </main>

      {/* Clean quiet footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">FlexDesk</span>
            <span>· Enterprise Hybrid Workplace Platform</span>
          </div>

          <div className="flex items-center gap-4 text-slate-500">
            {locations.map(l => (
              <span key={l.id} className="hidden sm:inline">
                {l.city} Hub
              </span>
            ))}
            <button
              onClick={() => setIsUserModalOpen(true)}
              className="text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Switch User Persona
            </button>
          </div>
        </div>
      </footer>

      {/* User Switcher Modal */}
      <UserSwitcherModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
      />

    </div>
  );
}

export default function App() {
  return (
    <DeskBookingProvider>
      <MainApp />
    </DeskBookingProvider>
  );
}
