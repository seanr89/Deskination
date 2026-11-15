# EF Core Persistence, Slot Overlap Matrix & Canonical Seeding Reference

## 1. Slot Overlap Truth Table

| Existing Active Booking on `(DeskId, Date)` | Requested `morning` | Requested `afternoon` | Requested `full_day` |
| :--- | :--- | :--- | :--- |
| **None** | Allowed | Allowed | Allowed |
| **`morning`** | Conflict | Allowed | Conflict |
| **`afternoon`** | Allowed | Conflict | Conflict |
| **`full_day`** | Conflict | Conflict | Conflict |
| **`morning` + `afternoon`** | Conflict | Conflict | Conflict |

Predicate in `src/services/booking-api/Data/DeskinationDbContext.cs` (`BookingDomainRules`):

```csharp
public static bool SlotsOverlap(SlotType existing, SlotType requested) =>
    existing == SlotType.FullDay ||
    requested == SlotType.FullDay ||
    existing == requested;

public static bool IsActiveBooking(BookingStatus status) =>
    status != BookingStatus.Cancelled && status != BookingStatus.Rejected;
```

`BookingDomainRules` also implements `ComputeDeskAvailability(Desk, IEnumerable<Booking>, User)` and `ComputeUserStats(IReadOnlyList<Booking>, string? referenceDate, string? month)`.

## 2. Actual EF Core `DeskinationDbContext` Mapping (`Data/DeskinationDbContext.cs`)

`DeskinationDbContext` exposes `Users`, `Locations`, `Desks`, and `Bookings` `DbSet<T>` properties and persists nested collections/value objects as camelCase JSON strings via explicit `ValueConverter` + `ValueComparer` definitions so the schema works identically on both PostgreSQL 17 (`Npgsql`) and EF Core `InMemory`:

- `User`: primary key `Id`, unique index on `Email`, `Role` stored as string.
- `Location`: primary key `Id`, `Floors` (`IReadOnlyList<Floor>`, including nested `Zones` and `Elements`) serialized via `floorsConverter` / `floorsComparer`.
- `Desk`: primary key `Id`, composite index on `(LocationId, FloorId)`, `DeskType`/`AllocationType`/`Status` stored as strings, `Equipment` (`IReadOnlyList<string>`) via `equipmentConverter`, and `Position` (`DeskPosition`) via `positionConverter`.
- `Booking`: primary key `Id`, composite indexes on `(DeskId, Date)` and `(UserId, Date)`, `Slot`/`Status` stored as strings.

Database startup (`Program.cs`) uses:
- `builder.Services.AddDeskinationDatabase(builder.Configuration)` — probes PostgreSQL (`ConnectionStrings:DefaultConnection`) with a 350ms TCP connect timeout and falls back to `UseInMemoryDatabase("DeskinationWorkspaceDb")` if unreachable or when `Database:Provider == "InMemory"`.
- `await DeskinationSeeder.EnsureSeededAsync(app.Services)` — calls `await db.Database.EnsureCreatedAsync()` and inserts seed entities when tables are empty (note: EF Core migrations are not yet used; tracked in `TODO.md`).

## 3. Canonical Seed Dataset (`src/services/booking-api/Data/DeskinationSeeder.cs`)

`DeskinationSeeder` is the single source of truth for initial workspace data (client-side mock seeding was removed in favor of backend hydration):

- **`InitialUsers`**:
  - `usr-sarah`: `sarah.chen@acme-corp.internal` (`Role.Employee`)
  - `usr-marcus`: `marcus.vance@acme-corp.internal` (`Role.Employee`)
  - `usr-priya`: `priya.patel@acme-corp.internal` (`Role.Employee`)
  - `usr-david`: `david.kim@acme-corp.internal` (`Role.Employee`)
  - `usr-admin-elena`: `elena.rostova@acme-corp.internal` (`Role.Admin`)
- **`InitialLocations`**:
  - `loc-london` (London HQ — Level 4 & Level 5)
  - `loc-belfast` (Belfast Hub — Titanic Quarter)
  - `loc-dubai` (Dubai Hub — DIFC)
- **`InitialDesks` & `InitialBookings`**:
  - Seeded workstations across all three hubs (covering `unreserved`, `designated`, and `requires_approval` policies, plus `active` and `maintenance` statuses) and initial bookings across `confirmed`, `checked_in`, `pending_approval`, and `cancelled` states (including `bkg-pending-1` used in integration tests).

## 4. Test Harness Persistence (`src/services/booking-api.Tests/TestWebApplicationFactory.cs`)

`TestWebApplicationFactory` isolates each test run by overriding:
- `Database:Provider = "InMemory"`
- `Database:InMemoryName = "DeskinationTestDb_<guid>"`
- `ConnectionStrings:DefaultConnection = ""`

This ensures `BookingApiIntegrationTests` runs deterministically without touching local or Docker PostgreSQL instances.
