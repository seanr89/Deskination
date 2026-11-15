# Deskination UI Component & State Contracts

## 1. Unauthenticated Gate (`src/App.tsx`)

When `isLoading` is `false` and `isAuthenticated` is `false`, `MainApp` renders:
- `unauthScreen === 'welcome'` -> `src/components/WelcomeLandingView.tsx`: Single-company landing page presenting core features (Interactive Floorplans, Availability Calendar, Office Directory & Check-In), office hubs (`Belfast Hub`, `London Hub`, `Dubai Hub`), and callbacks `onSignIn`, `onCreateAccount`, and `onOpenCookiePreferences`.
- `unauthScreen === 'auth'` -> `src/components/AuthView.tsx`: Tabbed authentication screen (`initialTab`: `'signin' | 'signup' | 'reset'`) with `onBackToWelcome` navigation, `:user-invalid` / `:user-valid` + `aria-invalid` form validation, and a collapsible runtime Firebase config panel (`saveRuntimeConfig` / `clearRuntimeConfig`).

## 2. Authenticated Workspace Views (`src/App.tsx`, `src/components/Header.tsx`)

`Header` navigates between five `WorkspaceView` tabs (`'book' | 'dashboard' | 'directory' | 'admin' | 'profile'`):
- `'book'` -> `src/components/BookDeskView.tsx` (eagerly loaded): Interactive floorplan (`InteractiveFloorPlan.tsx`), multi-day availability calendar (`DeskAvailabilityCalendarView.tsx`), and desk booking modal (`DeskModal.tsx`). Guards against empty `locations` or `floors` while hydrating.
- `'dashboard'` -> `src/components/EmployeeDashboard.tsx` (lazy-loaded): Personal upcoming/past reservations, check-in and release actions, `.ics` export (`src/utils/calendarExport.ts`), and `UserStats` metrics.
- `'directory'` -> `src/components/OfficeDirectory.tsx` (lazy-loaded): Colleagues in the office today, department filter, and daily occupancy report modal (`DailyOccupancyReportModal.tsx`).
- `'admin'` -> `src/components/AdminConsole.tsx` (lazy-loaded): Office manager console for approving/rejecting `pending_approval` requests, editing floorplan layout (`EditableFloorPlan.tsx`), managing locations/desks/allocation policies (`unreserved`, `designated`, `requires_approval`), and triggering workspace reset (`POST /api/workspace/reset`).
- `'profile'` -> `src/components/UserProfileView.tsx` (lazy-loaded): Displays user identity, preferred office hub (`localStorage` key `deskination_pref_loc_<userId>`), employee/admin permission checklist, `UserStats`, cookie preferences trigger (`onOpenCookiePreferences`), and sign-out button.

## 3. Cookie Consent & Privacy Controls

- `src/components/CookieConsentBanner.tsx`: Renders a bottom region banner (`role="region"`, `aria-label="Cookie consent banner"`) until a choice is saved, plus an accessible preferences dialog (`role="dialog"`, Escape-dismissible) with:
  - `Strictly Necessary` (always active, disabled toggle)
  - `Analytics & Performance` (opt-in)
  - `Marketing & Tracking` (opt-in)
- Backed by `src/utils/cookieConsent.ts` (`COOKIE_CONSENT_STORAGE_KEY = 'deskination_cookie_consent_v1'`, `getStoredCookieConsent`, `saveCookieConsent`, `clearCookieConsent`, `isCookieCategoryAllowed`). Re-openable from `WelcomeLandingView`, the authenticated footer, and `UserProfileView`.

## 4. Floorplan Coordinate System

- `Desk.position` (`{ x: number, y: number }`) and `FloorElement` (`{ x, y, width, height }`) use **percentage coordinates (`0` to `100`)** relative to the floorplan canvas container.
- `Desk.rotation` is constrained to `0 | 90 | 180 | 270` degrees.
- When updating multiple desks in `EditableFloorPlan.tsx`, use `batchUpdateDeskPositions` in `DeskBookingContext` (backed by `PATCH /api/desks/positions`).

## 5. Frontend Test Suites

- **Vitest Unit & SSR Tests (`npm test`)**:
  - `src/components/__tests__/BookDeskView.test.tsx`
  - `src/components/__tests__/CookieConsentBanner.test.tsx`
  - `src/components/__tests__/UserProfileView.test.tsx`
  - `src/components/__tests__/WelcomeLandingView.test.tsx`
  - `src/services/__tests__/apiClient.test.ts`
  - `src/utils/__tests__/cookieConsent.test.ts`
  - `src/utils/__tests__/dateUtils.test.ts`
- **Playwright E2E Tests (`npm run test:e2e`, `playwright.config.ts` against `http://127.0.0.1:4173`)**:
  - `e2e/auth-and-api-gate.spec.ts`: Verifies `WelcomeLandingView`, removal of demo personas/client mock `localStorage` keys, and `AuthView` navigation/config panel.
  - `e2e/cookie-consent.spec.ts`: Verifies banner actions, preference modal toggles, and `deskination_cookie_consent_v1` persistence.
