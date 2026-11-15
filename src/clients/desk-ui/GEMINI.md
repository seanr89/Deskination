# Deskination UI Client Rules (`src/clients/desk-ui/GEMINI.md`)

## Technology Stack

- **Framework**: React 19 (`react@^19.0.1`), TypeScript (`~7.0.2`), Vite 8 (`vite@^8.3.0`)
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`, `@import "tailwindcss";` in `src/index.css`)
- **Icons**: `lucide-react`
- **Authentication**: Firebase Web SDK (`firebase/auth@^13.1.0`) with Email/Password authentication
- **Testing**: Vitest (`^5.1.0`) unit/SSR tests + Playwright (`^1.64.0`) E2E tests

## Application Structure & Views (`src/App.tsx`)

1. **Unauthenticated Gate**:
   - `WelcomeLandingView.tsx`: Single-company landing screen highlighting core features and hubs (`Belfast`, `London`, `Dubai`), routing to Sign In, Create Account, or Cookie Preferences.
   - `AuthView.tsx`: Tabbed `'signin' | 'signup' | 'reset'` authentication screen with runtime Firebase configuration override panel and `Back to Welcome` navigation.
2. **Authenticated Workspace (`Header.tsx` + `WorkspaceView`)**:
   - `'book'` -> `BookDeskView.tsx` (eagerly loaded): Interactive floorplan (`InteractiveFloorPlan.tsx`), multi-day availability calendar (`DeskAvailabilityCalendarView.tsx`), and booking modal (`DeskModal.tsx`).
   - `'dashboard'` -> `EmployeeDashboard.tsx` (lazy-loaded): Reservations, check-in/cancel actions, `.ics` calendar export, and `UserStats`.
   - `'directory'` -> `OfficeDirectory.tsx` (lazy-loaded): Colleagues in office today, department filter, and `DailyOccupancyReportModal.tsx`.
   - `'admin'` -> `AdminConsole.tsx` (lazy-loaded): Manager approval queue, floorplan editor (`EditableFloorPlan.tsx`), desk/location management, and workspace reset.
   - `'profile'` -> `UserProfileView.tsx` (lazy-loaded): User identity, preferred office hub, role access checklist, `UserStats`, cookie preferences trigger, and sign out.
3. **Privacy & Utilities**:
   - `CookieConsentBanner.tsx` + `src/utils/cookieConsent.ts`: Stores consent (`strictlyNecessary` always enabled; `analytics` & `marketing` opt-in) under `deskination_cookie_consent_v1`.
   - `src/utils/calendarExport.ts`: Generates `.ics` downloads (`downloadCalendarEvent`) for reservations.
   - `src/utils/dateUtils.ts`: Local `YYYY-MM-DD` / `YYYY-MM` helpers (`formatIsoDate`, `getTodayIsoDate`, `getCurrentYearMonth`).

## Architectural Conventions

1. **Firebase Auth & Session State**:
   - Access Firebase instances exclusively through `src/config/firebase.ts` (`getFirebaseApp`, `getFirebaseAuth`, `resolveFirebaseConfig`), supporting `VITE_FIREBASE_*` env vars or runtime `localStorage` (`deskination_firebase_config_v1`).
   - Consume auth state via `useAuth()` (`src/hooks/useAuth.ts`), never `getAuth()` directly in components.
   - Keep `DeskBookingContext` (`src/context/DeskBookingContext.tsx`) synchronized with `AuthContext` (`src/context/AuthContext.tsx`) via `upsertUser(mappedUser)` (`PUT /api/users/me`). No client-side mock data exists; all workspace data hydrates from `booking-api`.
2. **Backend API Requests**:
   - Route all HTTP calls to `booking-api` through `apiRequest<T>()` and typed wrappers in `src/services/apiClient.ts`, which resolves `VITE_API_BASE_URL` (`http://localhost:8080`) and injects `Authorization: Bearer <idToken>`.
3. **Bundle Splitting (`vite.config.ts`)**:
   - Preserve lazy imports in `src/App.tsx` and `build.rolldownOptions.output.codeSplitting.groups` (`firebase`, `react-vendor`, `lucide-icons`) to keep production chunks under Vite's 500 kB warning limit.
4. **Forms & Accessibility**:
   - Consult the `modern-web-guidance` skill before modifying HTML, CSS, dialogs, or form components.
   - Use semantic `<form>`, explicit `<label htmlFor>`, proper `autocomplete` attributes, and `:user-invalid` / `:user-valid` feedback with `aria-invalid` synchronization.

## Verification

Run from `src/clients/desk-ui` (or via root `make lint`, `make build-ui`, `make test-ui`, `make test-e2e`):

```bash
npm run lint && npm run build
npm test
npm run test:e2e
```
