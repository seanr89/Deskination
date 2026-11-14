---
name: code-security
description: >-
  Performs security audits, threat checks, and secure-coding verification across Deskination's
  React/Firebase client (src/clients/desk-ui), .NET 10 Booking API (src/services/booking-api),
  and container/environment configurations. Use this skill when reviewing authentication,
  authorization policies, role escalation risks, input validation, CORS, secrets/config handling,
  or cookie/localStorage privacy controls.
---

# Code Security Skill (`code-security`)

This skill guides security-focused audits and hardening across `src/clients/desk-ui`, `src/services/booking-api`, and deployment configs (`docker-compose.yml`, `.env*`).

## Security Audit Workflow

1. **Identify Attack Surfaces in the Diff or Target Area**:
   - **API Authentication & Role Enforcement** (`src/services/booking-api/Auth/`, `Endpoints/`):
     - Confirm all endpoints outside `GET /api/health` and `GET /api/auth/status` enforce `AuthPolicies.EmployeeOrAdmin` or `AuthPolicies.AdminOnly`.
     - Verify Firebase JWT validation (`Authority`, `ValidIssuer`, `ValidAudience`, `ValidateLifetime`) targets project `officewho-53cec`.
     - Check for privilege escalation or IDOR: user identity, email, and role must come from validated `ClaimsPrincipal` claims or server-trusted records, never from unverified request body fields (for example, `PUT /api/users/me` in `UsersEndpoints.cs` must not let a non-admin caller supply another user's email or ID to inherit `Role.Admin`).
     - Verify ownership/role guards on state-changing routes (booking cancellation, check-in, approval/rejection, designated desk booking).
   - **Input Validation, State Transitions & Persistence** (`src/services/booking-api/Endpoints/`, `Data/`):
     - Verify `YYYY-MM-DD` date validation, `AdvanceBookingDaysLimit`, `DeskStatus.Maintenance` checks, and valid booking status transitions inside transactions.
     - Confirm EF Core queries avoid raw SQL string interpolation and bind parameters safely.
     - Check `DatabaseConfigurationExtensions` and `Program.cs` so production environments do not silently mask misconfigured PostgreSQL connections or expose overly permissive CORS origins.
   - **Client Auth, Storage & Privacy** (`src/clients/desk-ui/src/`):
     - Verify Firebase ID tokens are only retrieved via `getCurrentIdToken()` (`src/services/authService.ts`) and sent in `Authorization: Bearer` headers via `apiRequest` (`src/services/apiClient.ts`)—never logged, persisted in URLs, or stored manually in plaintext.
     - Confirm `CookieConsentBanner.tsx` and `src/utils/cookieConsent.ts` keep `analytics` and `marketing` opt-in (`false` until explicit user consent) and gate non-essential tracking on `deskination_cookie_consent_v1`.
     - Inspect DOM rendering for XSS sinks (`dangerouslySetInnerHTML`, unvalidated `href`/`src`), `localStorage` parsing (`try/catch` around `JSON.parse`), and `.ics` export injection (`src/utils/calendarExport.ts`).
   - **Secrets & Dependency Hygiene**:
     - Confirm `.env` and service account credentials are excluded by `.gitignore` and never committed; inspect `docker-compose.yml` for hardcoded non-dev secrets.

2. **Cross-Check Detailed Vectors**:
   - Read [references/security-audit-checklist.md](./references/security-audit-checklist.md) for Deskination's severity classification and file-by-file threat checklist.

3. **Run Verification & Dependency Audits**:
   - Check backend package advisories and build integrity:
     ```bash
     dotnet list src/services/booking-api/booking-api.csproj package --vulnerable --include-transitive
     dotnet test src/services/booking-api.Tests
     ```
   - Check frontend dependency advisories and type/build checks:
     ```bash
     cd src/clients/desk-ui && npm audit --omit=dev && npm run lint && npm test
     ```

4. **Report Findings Clearly**:
   - Group findings by severity (`Critical`, `High`, `Medium`, `Low`), citing exact `file:line`, exploit scenario, and concrete remediation. Do not report speculative vulnerabilities without reading the target code.
