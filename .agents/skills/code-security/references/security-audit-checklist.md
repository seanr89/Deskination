# Deskination Security Audit Checklist

## 1. Severity Classification

| Severity | Criteria in Deskination |
| :--- | :--- |
| **Critical** | Unauthenticated access to protected `/api/*` data, arbitrary `Role.Admin` privilege escalation, or committed production secrets/private keys. |
| **High** | Cross-user booking tampering (IDOR on cancel/check-in), bypassed `designated` or `maintenance` desk rules, XSS via user-controlled workspace fields, or silent auth bypass. |
| **Medium** | Missing server-side input/date/limit validation, overly broad CORS origins in non-dev environments, or non-essential cookies/tracking active before consent. |
| **Low** | Verbose error details leaking internal paths/stack traces, missing security headers, or hardening gaps limited to local dev defaults. |

## 2. Backend Security Targets (`src/services/booking-api`)

- **`Auth/FirebaseAuthExtensions.cs`**:
  - Verify `AddJwtBearer` validates `Issuer`, `Audience`, and `Lifetime`.
  - Check `AdminOnly` assertion logic (`role == "admin"`, `admin == "true"`, or designated bootstrap admin email) so claims cannot be forged by unsigned/unverified tokens.
- **`Endpoints/UsersEndpoints.cs`**:
  - Inspect `PUT /api/users/me`: ensure email/ID matching uses `principal.GetEmail()` and `principal.GetFirebaseUid()` rather than trusting `request.Email` or `request.Id` to look up and inherit an existing `Role.Admin` record.
- **`Endpoints/BookingsEndpoints.cs`**:
  - Verify `POST /api/bookings` validates `YYYY-MM-DD` dates, enforces `Location.AdvanceBookingDaysLimit`, checks `DeskStatus.Maintenance`, enforces `designatedUserId`/`designatedDepartment`, and forces `BookingStatus.PendingApproval` on `requires_approval` desks for non-admin callers.
  - Verify `POST /api/bookings/{id}/check-in`, `cancel`, `approve`, and `reject` guard against invalid state transitions and verify caller ownership (or `AdminOnly` for approve/reject and cancelling another user's booking).
- **`Endpoints/DesksEndpoints.cs` & `Endpoints/LocationsEndpoints.cs`**:
  - Confirm all create/update/delete/position/allocation mutations require `AuthPolicies.AdminOnly`.
  - Confirm `DELETE` routes clean up or reject orphaned child records (`Booking` rows referencing deleted desks).
- **`Program.cs`**:
  - Ensure `AddCors` origins come from `IConfiguration` rather than hardcoded values when deploying beyond local `localhost:3000`/`5173`.
  - Ensure `MapOpenApi()` remains scoped to `IsDevelopment()`.

## 3. Frontend Security & Privacy Targets (`src/clients/desk-ui`)

- **`src/config/firebase.ts` & `src/services/authService.ts`**:
  - Runtime Firebase config in `localStorage` (`deskination_firebase_config_v1`) only stores public Firebase web app config, never admin service account keys.
  - `mapFirebaseUserToWorkspaceUser` must not grant `'admin'` solely from editable profile inputs.
- **`src/services/apiClient.ts`**:
  - All authenticated requests attach the Firebase ID token via `Authorization: Bearer <token>` and propagate HTTP failures cleanly without exposing token strings in error messages.
- **`src/components/CookieConsentBanner.tsx` & `src/utils/cookieConsent.ts`**:
  - Non-essential categories (`analytics`, `marketing`) default to `false` and remain inactive until explicit consent is saved in `deskination_cookie_consent_v1`.
- **`src/utils/calendarExport.ts`**:
  - Sanitize/escape newlines and `.ics` control characters in user-supplied desk/location names when generating calendar payloads.
