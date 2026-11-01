# Deskination UI Client Rules (`src/clients/desk-ui/GEMINI.md`)

## Technology Stack

- **Framework**: React 19 (`react@^19.0.1`), TypeScript (`~7.0.2`), Vite 8 (`vite@^8.3.0`)
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`, `@import "tailwindcss";` in `src/index.css`)
- **Icons**: `lucide-react`
- **Authentication**: Firebase Web SDK (`firebase/auth`) with Email/Password authentication and Demo Mode fallback.

## Architectural Conventions

1. **Firebase Auth & Session State**:
   - Always access Firebase instances through `src/config/firebase.ts` (`getFirebaseApp`, `getFirebaseAuth`, `resolveFirebaseConfig`).
   - Consume authentication state in components via `useAuth()` (`src/hooks/useAuth.ts`), never by calling `getAuth()` directly inside UI components.
   - Keep `DeskBookingContext` (`src/context/DeskBookingContext.tsx`) synchronized with `AuthContext` (`src/context/AuthContext.tsx`) via `upsertUser(mappedUser)` so authenticated Firebase users are matched by email (case-insensitive) to existing workspace profiles or defaulted to `'employee'`.
2. **Backend API Requests**:
   - Route all HTTP calls to the .NET `booking-api` through `apiRequest<T>()` in `src/services/apiClient.ts`, which reads `VITE_API_BASE_URL` (`http://localhost:8080`) and injects the `Authorization: Bearer <idToken>` header.
3. **Forms & Accessibility**:
   - Consult the `modern-web-guidance` skill before creating or modifying HTML/CSS/form components.
   - Use semantic `<form>`, explicit `<label htmlFor>`, proper `autocomplete` attributes (`username`, `current-password`, `new-password`, `name`), and `:user-invalid` / `:user-valid` validation feedback.
4. **Verification**:
   - After any code change in `src/clients/desk-ui`, run:
     ```bash
     npm run lint && npm run build
     ```
