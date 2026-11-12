# Deskination — Bugs & Technical Debt (`TODO.md`)

Generated from a codebase review of `src/services/booking-api` and `src/clients/desk-ui`.

---

## Bugs

- [ ] **Occupancy & colleague queries include `rejected` bookings**
  - `src/services/booking-api/Endpoints/LocationsEndpoints.cs` (`GetLocationOccupancy`, `GetColleaguesInOffice`) only filter `b.Status != BookingStatus.Cancelled`, missing `BookingStatus.Rejected` (unlike `BookingDomainRules.IsActiveBooking`).
  - `src/clients/desk-ui/src/context/DeskBookingContext.tsx` (`getLocationOccupancy`, `getColleaguesInOfficeToday`) has the same bug (`b.status !== 'cancelled'`).

- [ ] **Hardcoded fallback date `"2026-10-25"` in API domain rules & endpoints**
  - `BookingDomainRules.ComputeUserStats` (`src/services/booking-api/Data/DeskinationDbContext.cs`), `GetDeskAvailability` (`DesksEndpoints.cs`), and `GetLocationOccupancy` / `GetColleaguesInOffice` (`LocationsEndpoints.cs`) fall back to `"2026-10-25"` when `date` or `referenceDate` is omitted instead of using the current UTC date.

- [ ] **Optimistic UI mutations do not roll back on API failure**
  - In `src/clients/desk-ui/src/context/DeskBookingContext.tsx`, mutations (`bookDesk`, `requestDeskBooking`, `approveBookingRequest`, `rejectBookingRequest`, `deleteDesk`, `updateDeskPosition`, `batchUpdateDeskPositions`, `updateFloorElements`) update local state immediately and fire `void runAuthenticatedApi(...)` without reverting state if the API returns an error (e.g., `409 Conflict` or `403 Forbidden`).
  - `bookDesk` and `requestDeskBooking` also return `{ success: true }` synchronously before the backend transaction completes.

- [ ] **Missing booking status transition guards in `BookingsEndpoints.cs`**
  - `POST /api/bookings/{id}/check-in` does not verify the booking is `Confirmed` (allows checking into `Cancelled`, `Rejected`, or `PendingApproval` bookings).
  - `POST /api/bookings/{id}/approve` and `POST /api/bookings/{id}/reject` do not verify the booking is `PendingApproval`, and `approve` does not re-check for slot conflicts.
  - `CancelBookingInternalAsync` (`DELETE /api/bookings/{id}` and `POST /api/bookings/{id}/cancel`) allows cancelling already `Cancelled` or `Rejected` bookings and appends duplicate cancellation notes.

- [ ] **Potential role elevation via `PUT /api/users/me`**
  - `src/services/booking-api/Endpoints/UsersEndpoints.cs` (`UpsertCurrentUserProfile`) prefers `request.Email` over `principal.GetEmail()` and matches existing users by `request.Id` or email. A non-admin caller supplying an admin's email or ID in the request body can match the admin record and inherit `Role.Admin`.

- [ ] **Orphaned bookings on desk deletion**
  - `DELETE /api/desks/{id}` (`src/services/booking-api/Endpoints/DesksEndpoints.cs`) deletes the desk without removing or cancelling associated `Booking` records (unlike `DELETE /api/locations/{id}`, which cascades).

---

## Technical Debt

- [ ] **Duplicated domain logic between frontend and backend**
  - `DeskBookingContext.tsx` re-implements slot availability (`getDeskAvailability`), user stats (`getUserStats`), location occupancy (`getLocationOccupancy`), and conflict checks in TypeScript, duplicating `BookingDomainRules` in `DeskinationDbContext.cs`.

- [ ] **Full-table `.ToListAsync()` loads before filtering**
  - `BookingsEndpoints.GetBookings`, `DesksEndpoints.GetDesks`, `UsersEndpoints.GetUsers`, and `FirebaseAuthExtensions.ResolveWorkspaceUserAsync` load entire tables into memory with `.ToListAsync()` before applying LINQ filters instead of composing EF Core `IQueryable` queries.

- [ ] **No EF Core migrations**
  - `Program.cs` relies on `DeskinationSeeder.EnsureSeededAsync` rather than EF Core migrations, making PostgreSQL schema changes manual or destructive.

- [ ] **Silent fallback from PostgreSQL to InMemory database**
  - `DatabaseConfigurationExtensions.AddDeskinationDatabase` (`DeskinationDbContext.cs`) probes Postgres with a 350ms TCP timeout and silently falls back to `UseInMemoryDatabase` if unreachable, which can mask database misconfiguration in non-local environments.

- [ ] **Hardcoded CORS origins in `Program.cs`**
  - `Program.cs` hardcodes `http://localhost:3000` and `http://localhost:5173` instead of reading allowed origins from `IConfiguration`.

- [ ] **Monolithic `DeskBookingContext.tsx` (922 lines)**
  - Hydration, auth subscription, optimistic state, CRUD actions, availability logic, and analytics all live in a single context file; splitting into smaller hooks/modules would improve maintainability.

- [ ] **N+1 query pattern in `BatchUpdateDeskPositions`**
  - `PATCH /api/desks/positions` (`DesksEndpoints.cs`) calls `await db.Desks.FindAsync(deskId)` inside a `foreach` loop instead of loading all target desks in a single query.

- [ ] **Missing date & policy validation on booking creation**
  - `POST /api/bookings` (`BookingsEndpoints.cs`) does not validate `YYYY-MM-DD` date formatting or enforce `Location.AdvanceBookingDaysLimit`.
