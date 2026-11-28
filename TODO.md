# Deskination — Bugs & Technical Debt (`TODO.md`)

Generated from a codebase review of `src/services/booking-api` and `src/clients/desk-ui`.

---

## Bugs

- [x] **Occupancy & colleague queries include `rejected` bookings**
  - `src/services/booking-api/Endpoints/LocationsEndpoints.cs` (`GetLocationOccupancy`, `GetColleaguesInOffice`) only filter `b.Status != BookingStatus.Cancelled`, missing `BookingStatus.Rejected` (unlike `BookingDomainRules.IsActiveBooking`).
  - `src/clients/desk-ui/src/context/DeskBookingContext.tsx` (`getLocationOccupancy`, `getColleaguesInOfficeToday`) has the same bug (`b.status !== 'cancelled'`).

- [x] **Hardcoded fallback date `"2026-10-25"` in API domain rules & endpoints**
  - `BookingDomainRules.ComputeUserStats` (`src/services/booking-api/Data/DeskinationDbContext.cs`), `GetDeskAvailability` (`DesksEndpoints.cs`), and `GetLocationOccupancy` / `GetColleaguesInOffice` (`LocationsEndpoints.cs`) fall back to `"2026-10-25"` when `date` or `referenceDate` is omitted instead of using the current UTC date.

- [x] **Optimistic UI mutations do not roll back on API failure**
  - In `src/clients/desk-ui/src/context/DeskBookingContext.tsx`, mutations (`bookDesk`, `requestDeskBooking`, `approveBookingRequest`, `rejectBookingRequest`, `deleteDesk`, `updateDeskPosition`, `batchUpdateDeskPositions`, `updateFloorElements`) update local state immediately and fire `void runAuthenticatedApi(...)` without reverting state if the API returns an error (e.g., `409 Conflict` or `403 Forbidden`).
  - `bookDesk` and `requestDeskBooking` also return `{ success: true }` synchronously before the backend transaction completes.

- [x] **Missing booking status transition guards in `BookingsEndpoints.cs`**
  - `POST /api/bookings/{id}/check-in` does not verify the booking is `Confirmed` (allows checking into `Cancelled`, `Rejected`, or `PendingApproval` bookings).
  - `POST /api/bookings/{id}/approve` and `POST /api/bookings/{id}/reject` do not verify the booking is `PendingApproval`, and `approve` does not re-check for slot conflicts.
  - `CancelBookingInternalAsync` (`DELETE /api/bookings/{id}` and `POST /api/bookings/{id}/cancel`) allows cancelling already `Cancelled` or `Rejected` bookings and appends duplicate cancellation notes.

- [x] **Potential role elevation via `PUT /api/users/me`**
  - `src/services/booking-api/Endpoints/UsersEndpoints.cs` (`UpsertCurrentUserProfile`) prefers `request.Email` over `principal.GetEmail()` and matches existing users by `request.Id` or email. A non-admin caller supplying an admin's email or ID in the request body can match the admin record and inherit `Role.Admin`.

- [x] **Orphaned bookings on desk deletion**
  - `DELETE /api/desks/{id}` (`src/services/booking-api/Endpoints/DesksEndpoints.cs`) deletes the desk without removing or cancelling associated `Booking` records (unlike `DELETE /api/locations/{id}`, which cascades).

---

## Technical Debt

- [x] **Duplicated domain logic between frontend and backend**
  - Removed TypeScript re-implementations of `getDeskAvailability`, `getUserStats`, `getLocationOccupancy`, `getColleaguesInOfficeToday`, and client-side conflict/policy checks from `DeskBookingContext`; replaced with backend-authoritative `POST /api/bookings` validation (`useBookingActions.ts`) and cached backend analytics (`useWorkspaceAnalytics.ts`) backed by `GET /api/desks/availability`, `GET /api/locations/{id}/occupancy/range`, `GET /api/locations/{id}/colleagues`, and `GET /api/users/{id}/stats`.

- [x] **Full-table `.ToListAsync()` loads before filtering**
  - Replaced full-table `.ToListAsync()` loads with composable EF Core `IQueryable` SQL queries in `BookingsEndpoints.GetBookings`, `DesksEndpoints.GetDesks` (pushing structured filters to SQL prior to optional `Equipment` text search), `UsersEndpoints` (`GetUsers`, `UpsertCurrentUserProfile`, `CreateUser`), `FirebaseAuthExtensions.ResolveAuthenticatedUserAsync` / `ResolveWorkspaceUserAsync`, and `AuthEndpoints`.

- [x] **No EF Core migrations**
  - Resolved via `Data/Migrations/InitialCreate`, `DeskinationDbContextFactory`, `DatabaseMigrationExtensions.ApplyDatabaseMigrationsAsync` (invoked on startup before `DeskinationSeeder.EnsureSeededAsync`, configurable via `Database:AutoMigrate`, with automatic baselining for legacy `EnsureCreatedAsync` schemas), `Makefile` EF migration targets, and model-drift/migration verification tests in `DatabaseMigrationsTests.cs`.

- [x] **Silent fallback from PostgreSQL to InMemory database**
  - Removed `Microsoft.EntityFrameworkCore.InMemory` and the 350ms TCP fallback from `AddDeskinationDatabase` (`DeskinationDbContext.cs`), `DatabaseMigrationExtensions.cs`, and `DeskinationSeeder.cs` so `booking-api` strictly requires PostgreSQL (`Npgsql`) and fails fast on missing/unsupported database configuration, while `TestWebApplicationFactory` runs isolated tests against relational SQLite (`DataSource=:memory:`).

- [x] **Hardcoded CORS origins in `Program.cs`**
  - Resolved via `Program.ResolveCorsAllowedOrigins` reading `Cors:AllowedOrigins` (scalar or array configuration) with default fallback to `http://localhost:3000` and `http://localhost:5173`.

- [x] **Monolithic `DeskBookingContext.tsx` (922 lines)**
  - Decomposed `src/clients/desk-ui/src/context/DeskBookingContext.tsx` (~105 lines) into `src/context/deskBookingTypes.ts` and focused hooks (`src/hooks/useWorkspaceData.ts`, `src/hooks/useWorkspaceAnalytics.ts`, `src/hooks/useBookingActions.ts`, `src/hooks/useAdminWorkspaceActions.ts`).

- [x] **N+1 query pattern in `BatchUpdateDeskPositions`**
  - Updated `PATCH /api/desks/positions` (`DesksEndpoints.cs`) to deduplicate updates, load all target desks in a single `Where(d => targetIds.Contains(d.Id))` query, and persist via `db.Desks.UpdateRange(...)`.

- [ ] **Missing date & policy validation on booking creation**
  - `POST /api/bookings` (`BookingsEndpoints.cs`) does not validate `YYYY-MM-DD` date formatting or enforce `Location.AdvanceBookingDaysLimit`.
