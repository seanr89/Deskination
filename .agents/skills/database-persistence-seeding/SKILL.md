---
name: database-persistence-seeding
description: >-
  Configures and maintains EF Core persistence (PostgreSQL 17 via Npgsql with InMemory fallback),
  BookingDomainRules slot concurrency & availability logic, and canonical workspace seeding via
  DeskinationSeeder in src/services/booking-api/Data/.
---

# Database Persistence & Seeding Skill (`database-persistence-seeding`)

This skill governs EF Core persistence, transactional booking invariants, and canonical seed data in `src/services/booking-api/Data/`.

## 1. Booking Slot Conflict & Concurrency Rules (`BookingDomainRules` & `BookingsEndpoints.cs`)

Whenever persisting a new `Booking` inside `POST /api/bookings` (`BeginTransactionAsync()`), enforce:

1. **Maintenance Block**:
   - Reject with `400 Bad Request` if `targetDesk.Status == DeskStatus.Maintenance`.
2. **Desk Allocation Policy Enforcement**:
   - Computed via `BookingDomainRules.ComputeDeskAvailability(targetDesk, deskBookingsOnDate, caller)`:
   - If `IsDesignatedToOther == true` (`DesignatedUserId != caller.Id` or `DesignatedDepartment != caller.Department`) and `caller.Role != Role.Admin` and `!isApprovalRequest`, return `403 Forbidden`.
   - If `isApprovalRequest` is `true` (requested explicitly or `RequiresApproval == true`) and `caller.Role != Role.Admin`, create the booking with `Status = BookingStatus.PendingApproval`.
3. **Desk Slot Conflict**:
   - Active bookings satisfy `BookingDomainRules.IsActiveBooking(status)` (`status != Cancelled && status != Rejected`).
   - A desk cannot hold two active bookings on the same `Date` (`YYYY-MM-DD`) when `BookingDomainRules.SlotsOverlap(existing.Slot, requested.Slot)` is `true` (`full_day` overlaps everything; `morning` overlaps `morning`; `afternoon` overlaps `afternoon`). Return `409 Conflict`.
4. **User Double-Booking Prevention**:
   - A user (`caller.Id`) cannot hold two active bookings or pending requests on the same `Date` with overlapping slots. Return `409 Conflict`.

## 2. EF Core Persistence & Seeding (`Data/DeskinationDbContext.cs`, `Data/DeskinationSeeder.cs`)

- **Provider Selection (`DatabaseConfigurationExtensions.AddDeskinationDatabase`)**:
  - Uses `Npgsql` (`UseNpgsql`) when `ConnectionStrings:DefaultConnection` is configured, `Database:Provider` is not `"InMemory"`, and a 350ms TCP reachability probe succeeds; otherwise falls back to `UseInMemoryDatabase` (suppressing `InMemoryEventId.TransactionIgnoredWarning`).
- **Entity Mappings (`DeskinationDbContext.OnModelCreating`)**:
  - Uses camelCase JSON `ValueConverter`/`ValueComparer` mappings for `Location.Floors`, `Desk.Equipment`, and `Desk.Position`, and stores enums as strings (`HasConversion<string>()`).
- **Canonical Seeding (`DeskinationSeeder`)**:
  - `EnsureSeededAsync` calls `EnsureCreatedAsync()` and populates empty `Users`, `Locations`, `Desks`, and `Bookings` tables from `InitialUsers`, `InitialLocations`, `InitialDesks`, and `InitialBookings`.
  - `ResetToDefaultsAsync` clears all four tables and re-seeds canonical records (invoked by `POST /api/workspace/reset`).
- Read [references/slot-conflict-and-seeding.md](./references/slot-conflict-and-seeding.md) for the slot overlap matrix, actual `DeskinationDbContext` configuration, `BookingDomainRules`, and canonical seed summary.
- Consult `TODO.md` before refactoring persistence (tracks missing EF Core migrations, full-table `.ToListAsync()` loads, and missing `Rejected` booking filters in `LocationsEndpoints.cs`).

## 3. Verification

```bash
dotnet build src/services/booking-api/booking-api.csproj
dotnet test src/services/booking-api.Tests/BookingApi.Tests.csproj
```
