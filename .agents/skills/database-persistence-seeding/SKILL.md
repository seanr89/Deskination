---
name: database-persistence-seeding
description: >-
  Configures and maintains EF Core persistence (PostgreSQL 17 via Npgsql), EF Core migrations,
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

## 2. EF Core Persistence, Migrations & Seeding (`Data/DeskinationDbContext.cs`, `Data/DatabaseMigrationExtensions.cs`, `Data/DeskinationDbContextFactory.cs`, `Data/DeskinationSeeder.cs`)

- **Provider Selection (`DatabaseConfigurationExtensions.AddDeskinationDatabase`)**:
  - Strictly registers `Npgsql` (`UseNpgsql` with `MigrationsAssembly("booking-api")`) using `ConnectionStrings:DefaultConnection`, throwing `InvalidOperationException` if the connection string is missing/blank or if `Database:Provider` specifies an unsupported provider (`PostgreSQL`, `Postgres`, or `Npgsql` only).
- **EF Core Migrations (`Data/Migrations/`, `DatabaseMigrationExtensions`, `DeskinationDbContextFactory`)**:
  - `Program.cs` calls `await app.Services.ApplyDatabaseMigrationsAsync(app.Configuration, app.Logger)` before `DeskinationSeeder.EnsureSeededAsync(app.Services)`.
  - Requires a relational provider (`Npgsql`, or `Sqlite` in tests); `ApplyDatabaseMigrationsAsync` applies pending EF Core migrations when `Database:AutoMigrate` is `true` (default) and baselines pre-migration `EnsureCreatedAsync` schemas to `InitialCreate`.
  - Design-time CLI tooling (`dotnet ef`) uses `DeskinationDbContextFactory` (`IDesignTimeDbContextFactory<DeskinationDbContext>`) and the local `.config/dotnet-tools.json` manifest (`dotnet-ef` `10.0.15`).
- **Entity Mappings (`DeskinationDbContext.OnModelCreating`)**:
  - Uses camelCase JSON `ValueConverter`/`ValueComparer` mappings for `Location.Floors`, `Desk.Equipment`, and `Desk.Position`, and stores enums as strings (`HasConversion<string>()`).
- **Canonical Seeding (`DeskinationSeeder`)**:
  - `EnsureSeededAsync` populates empty `Users`, `Locations`, `Desks`, and `Bookings` tables from `InitialUsers`, `InitialLocations`, `InitialDesks`, and `InitialBookings` after migrations have run.
  - `ResetToDefaultsAsync` clears all four tables and re-seeds canonical records (invoked by `POST /api/workspace/reset`).
- Read [references/slot-conflict-and-seeding.md](./references/slot-conflict-and-seeding.md) for the slot overlap matrix, actual `DeskinationDbContext` configuration, `BookingDomainRules`, and canonical seed summary.
- Consult `TODO.md` before refactoring persistence (tracks full-table `.ToListAsync()` loads and other remaining debt).

## 3. Verification

```bash
dotnet build src/services/booking-api/booking-api.csproj
dotnet test src/services/booking-api.Tests/BookingApi.Tests.csproj
```
