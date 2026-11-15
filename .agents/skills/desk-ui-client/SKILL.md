---
name: desk-ui-client
description: >-
  Develops, extends, and troubleshoots the Deskination React 19 + TypeScript + Tailwind CSS v4 UI client
  (src/clients/desk-ui) and its Firebase Authentication integration. Use this skill when modifying UI components,
  interactive floorplans, DeskBookingContext, AuthContext, Firebase Auth flows, cookie consent, utilities, or apiClient requests.
---

# Deskination UI Client Skill (`desk-ui-client`)

This skill guides development of the Deskination frontend (`src/clients/desk-ui`).

## Core Architecture

1. **Provider Hierarchy (`src/App.tsx`)**:
   - `<DeskBookingProvider>` (`src/context/DeskBookingContext.tsx`) wraps `<AuthProvider>` (`src/context/AuthContext.tsx`), which wraps `<MainApp />`.
   - `DeskBookingProvider` subscribes to Firebase auth changes (`subscribeToAuthChanges`) and hydrates `users`, `locations`, `desks`, and `bookings` from `booking-api` when authenticated (clearing state on sign-out). There is no client-side mock data.
   - `AuthProvider` synchronizes the signed-in Firebase user into `DeskBookingContext` via `upsertUser(mappedUser)` (`PUT /api/users/me`).
2. **Firebase Authentication Layer**:
   - **Config (`src/config/firebase.ts`)**: Resolves `VITE_FIREBASE_*` variables from `.env` (project `officewho-53cec`) or runtime `localStorage` fallback (`deskination_firebase_config_v1`), including optional Firebase Auth Emulator connection.
   - **Service (`src/services/authService.ts`)**: Provides `signInWithEmail`, `signUpWithEmail`, `signOutFirebaseUser`, `sendPasswordReset`, `updateCurrentUserPassword`, `getCurrentIdToken`, and `mapFirebaseUserToWorkspaceUser`.
   - **Role Mapping**: `mapFirebaseUserToWorkspaceUser` matches the Firebase user's email (case-insensitive) against hydrated workspace `users` from `booking-api`, checks custom claims (`tokenResult.claims.role` / `admin`), and defaults new sign-ups to `'employee'`.
3. **Authenticated Backend Calls (`src/services/apiClient.ts`)**:
   - Use `apiRequest<T>(endpoint, options)` and its typed endpoint wrappers (`fetchUsers`, `fetchLocations`, `fetchDesks`, `fetchBookings`, `createBookingApi`, `resetWorkspaceApi`, etc.) to call `booking-api` (`VITE_API_BASE_URL`, default `http://localhost:8080`). `buildAuthHeaders` automatically injects `Authorization: Bearer <idToken>`.
4. **Utilities & Build Configuration**:
   - **Utilities**: `src/utils/cookieConsent.ts` (`deskination_cookie_consent_v1`), `src/utils/calendarExport.ts` (`downloadCalendarEvent` `.ics` export), `src/utils/dateUtils.ts` (`formatIsoDate`, `getTodayIsoDate`, `getCurrentYearMonth`).
   - **Vite Chunking (`vite.config.ts`)**: Uses `build.rolldownOptions.output.codeSplitting.groups` to split `firebase`, `react-vendor`, and `lucide-icons` chunks alongside lazy-loaded workspace views in `src/App.tsx`.

## Workflow for UI & Auth Changes

1. **Consult Web Standards First**:
   - Before modifying HTML, CSS, dialogs, or form inputs, consult the `modern-web-guidance` skill.
2. **Component & Floorplan Modifications**:
   - Read [references/ui-component-contracts.md](./references/ui-component-contracts.md) for component responsibilities, unauthenticated landing/auth flows, cookie consent modal contracts, floorplan percentage coordinates (`0–100`), and test suites.
3. **Verify Type Safety, Build & Tests**:
   ```bash
   cd src/clients/desk-ui && npm run lint && npm run build
   cd src/clients/desk-ui && npm test
   cd src/clients/desk-ui && npm run test:e2e
   ```
