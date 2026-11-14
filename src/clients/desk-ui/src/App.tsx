import React, { Suspense, lazy, useState } from 'react';
import { DeskBookingProvider, useDeskBooking } from './context/DeskBookingContext';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { Header, type WorkspaceView } from './components/Header';
import { BookDeskView } from './components/BookDeskView';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import { AuthView, type AuthScreenTab } from './components/AuthView';
import { WelcomeLandingView } from './components/WelcomeLandingView';
import { AlertCircle, RefreshCw, X } from 'lucide-react';

const EmployeeDashboard = lazy(() =>
  import('./components/EmployeeDashboard').then(m => ({ default: m.EmployeeDashboard }))
);
const AdminConsole = lazy(() =>
  import('./components/AdminConsole').then(m => ({ default: m.AdminConsole }))
);
const OfficeDirectory = lazy(() =>
  import('./components/OfficeDirectory').then(m => ({ default: m.OfficeDirectory }))
);
const UserProfileView = lazy(() =>
  import('./components/UserProfileView').then(m => ({ default: m.UserProfileView }))
);

function MainApp() {
  const [currentView, setCurrentView] = useState<WorkspaceView>('book');
  const [unauthScreen, setUnauthScreen] = useState<'welcome' | 'auth'>('welcome');
  const [authInitialTab, setAuthInitialTab] = useState<AuthScreenTab>('signin');
  const [isCookieModalOpen, setIsCookieModalOpen] = useState(false);
  const { locations, isHydrating, apiError, clearApiError, refreshWorkspace } = useDeskBooking();
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 text-slate-600">
        <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm animate-pulse">
          DN
        </div>
        <p className="text-xs font-medium">Verifying Firebase Authentication session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        {unauthScreen === 'welcome' ? (
          <WelcomeLandingView
            onSignIn={() => {
              setAuthInitialTab('signin');
              setUnauthScreen('auth');
            }}
            onCreateAccount={() => {
              setAuthInitialTab('signup');
              setUnauthScreen('auth');
            }}
            onOpenCookiePreferences={() => setIsCookieModalOpen(true)}
          />
        ) : (
          <AuthView
            initialTab={authInitialTab}
            onBackToWelcome={() => setUnauthScreen('welcome')}
          />
        )}
        <CookieConsentBanner
          isPreferencesOpen={isCookieModalOpen}
          onOpenPreferences={() => setIsCookieModalOpen(true)}
          onClosePreferences={() => setIsCookieModalOpen(false)}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      
      {/* Header Contract */}
      <Header
        currentView={currentView}
        onNavigate={view => setCurrentView(view)}
      />

      {/* Non-blocking API synchronization & error banners */}
      {isHydrating && (
        <div className="bg-indigo-50 border-b border-indigo-100 px-4 py-2 text-xs text-indigo-800">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 font-medium">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" aria-hidden="true" />
            <span>Synchronizing workspace with Booking API...</span>
          </div>
        </div>
      )}

      {apiError && (
        <div
          role="alert"
          aria-live="assertive"
          className="bg-rose-50 border-b border-rose-200 px-4 py-2.5 text-xs text-rose-900"
        >
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
              <span className="font-medium">{apiError}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void refreshWorkspace()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-rose-200 text-rose-800 hover:bg-rose-100 font-semibold transition-colors"
              >
                <RefreshCw className="w-3 h-3" aria-hidden="true" />
                Retry Connection
              </button>
              <button
                type="button"
                onClick={clearApiError}
                aria-label="Dismiss API error"
                className="p-1 rounded-md text-rose-600 hover:text-rose-900 hover:bg-rose-100 transition-colors"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Suspense
          fallback={
            <div className="py-16 flex items-center justify-center gap-2 text-xs font-medium text-slate-500">
              <RefreshCw className="w-4 h-4 animate-spin text-slate-400" aria-hidden="true" />
              <span>Loading workspace view...</span>
            </div>
          }
        >
          {currentView === 'book' && <BookDeskView />}
          {currentView === 'dashboard' && <EmployeeDashboard onNavigateToBooking={() => setCurrentView('book')} />}
          {currentView === 'directory' && <OfficeDirectory />}
          {currentView === 'admin' && <AdminConsole />}
          {currentView === 'profile' && (
            <UserProfileView onOpenCookiePreferences={() => setIsCookieModalOpen(true)} />
          )}
        </Suspense>
      </main>

      {/* Clean quiet footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Deskination</span>
            <span>· Internal Office Desk Booking</span>
          </div>

          <div className="flex items-center gap-4 text-slate-500">
            {locations.map(l => (
              <span key={l.id} className="hidden sm:inline">
                {l.city} Hub
              </span>
            ))}
            <button
              type="button"
              onClick={() => setIsCookieModalOpen(true)}
              className="text-slate-600 hover:text-slate-900 underline underline-offset-2 font-medium transition-colors"
            >
              Cookie Preferences
            </button>
          </div>
        </div>
      </footer>

      <CookieConsentBanner
        isPreferencesOpen={isCookieModalOpen}
        onOpenPreferences={() => setIsCookieModalOpen(true)}
        onClosePreferences={() => setIsCookieModalOpen(false)}
      />

    </div>
  );
}

export default function App() {
  return (
    <DeskBookingProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </DeskBookingProvider>
  );
}
