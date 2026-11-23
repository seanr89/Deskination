---
name: dotnet-booking-api
description: >-
  Designs, implements, and extends the .NET 10 Deskination Booking API (src/services/booking-api),
  including C# 14 domain models, ASP.NET Core Minimal API endpoints, OpenAPI specs, CORS, and
  Firebase JWT Bearer authentication for project officewho-53cec. Use this skill whenever working
  in src/services/booking-api, src/services/booking-api.Tests, or integrating desk-ui with API endpoints.
---

# .NET 10 Booking API Skill (`dotnet-booking-api`)

This skill guides development of the .NET 10 (`net10.0`) Web API in `src/services/booking-api` and its xUnit integration test suite in `src/services/booking-api.Tests`.

## 1. Domain Models & Wire Compatibility

All C# models and DTOs in `src/services/booking-api/Models/DeskBookingModels.cs` must serialize identically to the TypeScript interfaces in `src/clients/desk-ui/src/types/deskBooking.ts`.

- `Program.cs` configures `ConfigureHttpJsonOptions` with `JsonNamingPolicy.CamelCase` for `PropertyNamingPolicy` and `DictionaryKeyPolicy`.
- Read [references/csharp-domain-models.md](./references/csharp-domain-models.md) for the canonical C# 14 domain records (`User`, `Location`, `Floor`, `Zone`, `FloorElement`, `Desk`, `Booking`, `SlotAvailability`, `UserStats`, `LocationOccupancyResponse`), request/response DTOs, and `[JsonStringEnumConverter<T>]` / `[JsonStringEnumMemberName]` attributes.

## 2. Startup, Auth & CORS (`Program.cs`, `Auth/FirebaseAuthExtensions.cs`)

- **OpenAPI & CORS**: `Program.cs` registers `AddOpenApi()` (mapped via `app.MapOpenApi()` in `Development`) and CORS policy `"DeskUiClient"` allowing `http://localhost:3000` and `http://localhost:5173`.
- **Database & Seeding**: Calls `builder.Services.AddDeskinationDatabase(builder.Configuration)` (strict PostgreSQL via `Npgsql`), `await app.Services.ApplyDatabaseMigrationsAsync(app.Configuration, app.Logger)`, and `await DeskinationSeeder.EnsureSeededAsync(app.Services)` on startup.
- **Firebase JWT Bearer (`AddFirebaseAuthentication`)**:
  - Reads `Firebase:ProjectId` (default `"officewho-53cec"`), configuring `Authority = https://securetoken.google.com/{ProjectId}` and `ValidAudience = {ProjectId}`.
  - Extracts UID (`user_id`, `ClaimTypes.NameIdentifier`, `sub`) and email (`email`, `ClaimTypes.Email`).
  - Registers `AuthPolicies.EmployeeOrAdmin` (`RequireAuthenticatedUser()`) and `AuthPolicies.AdminOnly` (`role=admin`, `admin=true`, or `elena.rostova@acme-corp.internal`).
  - `ResolveWorkspaceUserAsync(db)` maps the authenticated `ClaimsPrincipal` to a `User` in `db.Users` (matching by email or `usr-{uid}`, or synthesizing a fallback profile).
- **Testability**: `Program.cs` ends with `public partial class Program;` for `WebApplicationFactory<Program>`.

## 3. Implemented Minimal API Endpoints

- **Diagnostics (`Program.cs`)**:
  - `GET /api/health` (unauthenticated): returns service health, environment, `firebaseProjectId`, `databaseProvider`, and seeded entity counts.
- **Authentication (`Endpoints/AuthEndpoints.cs`, `/api/auth`)**:
  - `GET /api/auth/status` (unauthenticated): Firebase config & current caller claim summary.
  - `GET /api/auth/me` (`EmployeeOrAdmin`): returns `AuthenticatedUserResponse`.
  - `GET /api/auth/admin-check` (`AdminOnly`): verifies admin policy enforcement.
- **Users (`Endpoints/UsersEndpoints.cs`, `/api/users`, `EmployeeOrAdmin`)**:
  - `GET /api/users` (optional `search`, `department`, `role`), `GET /api/users/me`, `PUT /api/users/me`, `GET /api/users/{id}`, `POST /api/users`, `GET /api/users/{id}/stats` (`referenceDate`, `month`).
- **Locations (`Endpoints/LocationsEndpoints.cs`, `/api/locations`, `EmployeeOrAdmin`)**:
  - `GET /api/locations`, `GET /api/locations/{id}`, `POST /api/locations` (`AdminOnly`), `PUT /api/locations/{id}` (`AdminOnly`), `DELETE /api/locations/{id}` (`AdminOnly`, cascades desks/bookings), `PUT /api/locations/{locationId}/floors/{floorId}/elements` (`AdminOnly`), `GET /api/locations/{id}/occupancy?date=YYYY-MM-DD`, `GET /api/locations/{id}/colleagues?date=YYYY-MM-DD`.
- **Desks (`Endpoints/DesksEndpoints.cs`, `/api/desks`, `EmployeeOrAdmin`)**:
  - `GET /api/desks` (filters: `locationId`, `floorId`, `zoneId`, `deskType`, `allocationType`, `status`, `search`), `GET /api/desks/{id}`, `GET /api/desks/{id}/availability?date=YYYY-MM-DD`, `POST /api/desks` (`AdminOnly`), `PUT /api/desks/{id}` (`AdminOnly`), `PATCH /api/desks/{id}/allocation` (`AdminOnly`), `PATCH /api/desks/{id}/position` (`AdminOnly`), `PATCH /api/desks/positions` (`AdminOnly`, batch transaction), `DELETE /api/desks/{id}` (`AdminOnly`).
- **Bookings (`Endpoints/BookingsEndpoints.cs`, `/api/bookings`, `EmployeeOrAdmin`)**:
  - `GET /api/bookings` (filters: `locationId`, `floorId`, `deskId`, `userId`, `date`, `startDate`, `endDate`, `status`, `slot`, `search`), `GET /api/bookings/{id}`, `POST /api/bookings` (transactional create/request returning `BookingActionResponse`), `PUT /api/bookings/{id}`, `DELETE /api/bookings/{id}`, `POST /api/bookings/{id}/cancel`, `POST /api/bookings/{id}/check-in`, `POST /api/bookings/{id}/approve` (`AdminOnly`), `POST /api/bookings/{id}/reject` (`AdminOnly`).
- **Workspace (`Endpoints/WorkspaceEndpoints.cs`, `/api/workspace`, `AdminOnly`)**:
  - `POST /api/workspace/reset`: resets tables to `DeskinationSeeder` defaults and returns `WorkspaceSnapshotResponse`.

## 4. Integration Testing (`src/services/booking-api.Tests/`)

- `TestWebApplicationFactory`: boots `Program` and swaps `DeskinationDbContext` in `ConfigureTestServices` to an isolated relational SQLite (`DataSource=:memory:`) database with EF Core migrations, and registers `TestAuthHandler` (`TestAuth` scheme reading `X-Test-User-Email`, `X-Test-User-Role`, `X-Test-User-Uid`, `X-Test-User-Name` headers).
- `BookingApiIntegrationTests`: covers `/api/health`, 401 auth gates, `PUT /api/users/me` upsert, camelCase/snake_case wire format, slot conflict & `requires_approval` rules, `AdminOnly` approve/reject, and check-in/cancel transitions.

## 5. Verification

```bash
dotnet build src/services/booking-api/booking-api.csproj
dotnet test src/services/booking-api.Tests/BookingApi.Tests.csproj
```
