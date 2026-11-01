---
name: desk-ui-client
description: >-
  Develops, extends, and troubleshoots the Deskination React 19 + TypeScript + Tailwind CSS v4 UI client
  (src/clients/desk-ui) and its Firebase Authentication integration. Use this skill when modifying UI components,
  interactive floorplans, DeskBookingContext, AuthContext, Firebase Auth flows, or apiClient requests.
---

# Deskination UI Client Skill (`desk-ui-client`)

This skill guides development of the Deskination frontend (`src/clients/desk-ui`).

## Core Architecture

1. **Provider Hierarchy** (`src/App.tsx`):
   - `<DeskBookingProvider>` (`src/context/DeskBookingContext.tsx`) wraps `<AuthProvider>` (`src/context/AuthContext.tsx`), which wraps `<MainApp />`.
   - `AuthProvider` listens to Firebase Authentication state changes via `subscribeToAuthChanges` (`src/services/authService.ts`) and synchronizes the authenticated user into `DeskBookingContext` via `upsertUser(mappedUser)`.
2. **Firebase Authentication Layer**:
   - **Config**: `src/config/firebase.ts` resolves `VITE_FIREBASE_*` variables from `.env` (project `officewho-53cec`) or runtime `localStorage` fallback (`flexdesk_firebase_config_v1`).
   - **Service**: `src/services/authService.ts` provides `signInWithEmail`, `signUpWithEmail`, `signOutFirebaseUser`, `sendPasswordReset`, `updateCurrentUserPassword`, `getCurrentIdToken`, and `mapFirebaseUserToWorkspaceUser`.
   - **Role Mapping**: `mapFirebaseUserToWorkspaceUser` matches the Firebase user's email (case-insensitive) against existing workspace profiles (`INITIAL_USERS` / `users`), inspects custom claims (`tokenResult.claims.role` / `admin`), and defaults new sign-ups to `'employee'`.
3. **Authenticated Backend Calls**:
   - Use `apiRequest<T>(endpoint, options)` from `src/services/apiClient.ts` to call the .NET 10 `booking-api` (`VITE_API_BASE_URL=http://localhost:8080`). It automatically attaches `Authorization: Bearer <idToken>`.

## Workflow for UI & Auth Changes

1. **Consult Web Standards First**:
   - Before modifying HTML, CSS, dialogs, or form inputs, run the `modern-web-guidance` skill (`npx -y modern-web-guidance@latest search "<query>"`).
2. **Component & Floorplan Modifications**:
   - Read [references/ui-component-contracts.md](./references/ui-component-contracts.md) for component responsibilities, floorplan percentage coordinates (`0–100`), and desk availability state logic.
3. **Verify Type Safety & Production Build**:
   - Run the following command from `src/clients/desk-ui` after every change:
     ```bash
     cd src/clients/desk-ui && npm run lint && npm run build
     ```
