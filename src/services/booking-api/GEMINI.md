# Deskination Booking API Rules (`src/services/booking-api/GEMINI.md`)

## Technology Stack

- **Runtime & SDK**: .NET 10 (`net10.0`), C# 14, ASP.NET Core Minimal APIs
- **Persistence**: Entity Framework Core 10 with PostgreSQL 17 (`Npgsql.EntityFrameworkCore.PostgreSQL`) and EF Core migrations (`Data/Migrations/`)
- **OpenAPI**: `Microsoft.AspNetCore.OpenApi` (`AddOpenApi()`, mapped via `app.MapOpenApi()` in `Development`)
- **Authentication**: Firebase JWT Bearer (`Microsoft.AspNetCore.Authentication.JwtBearer`) for project `officewho-53cec`
- **Testing**: xUnit integration suite in `src/services/booking-api.Tests/` (`TestWebApplicationFactory`, `TestAuthHandler`, `BookingApiIntegrationTests`)

## Architectural Conventions

1. **JSON Serialization & Wire Format**:
   - `Program.cs` configures `JsonNamingPolicy.CamelCase` for properties and dictionary keys to match `src/clients/desk-ui/src/types/deskBooking.ts`.
   - `Models/DeskBookingModels.cs` decorates domain enums (`Role`, `SlotType`, `DeskType`, `DeskAllocationType`, `DeskStatus`, `FloorElementType`, `BookingStatus`) with `[JsonConverter(typeof(JsonStringEnumConverter<T>))]` and `[JsonStringEnumMemberName("...")]` for exact snake_case values (`full_day`, `quiet_booth`, `requires_approval`, `pending_approval`).
2. **Firebase JWT Authentication & Authorization (`Auth/FirebaseAuthExtensions.cs`)**:
   - Authority / Issuer: `https://securetoken.google.com/officewho-53cec`; Audience: `officewho-53cec`.
   - `GetFirebaseUid()` reads `user_id`, `ClaimTypes.NameIdentifier`, or `sub`; `GetEmail()` reads `email` or `ClaimTypes.Email`.
   - Policies: `AuthPolicies.EmployeeOrAdmin` (authenticated user) and `AuthPolicies.AdminOnly` (`role=admin`, `admin=true`, or `elena.rostova@acme-corp.internal`).
   - `ResolveWorkspaceUserAsync` matches callers against `db.Users` by email or `usr-{uid}` and synthesizes a fallback `User` if not yet persisted.
3. **Persistence, Migrations, Rules & Seeding (`Data/`)**:
   - `DeskinationDbContext.cs` stores `Location.Floors`, `Desk.Equipment`, and `Desk.Position` as camelCase JSON strings via EF Core `ValueConverter`/`ValueComparer`, and converts enums to strings.
   - `DatabaseConfigurationExtensions.AddDeskinationDatabase` strictly registers PostgreSQL (`UseNpgsql` with the `booking-api` migrations assembly), throwing `InvalidOperationException` if `ConnectionStrings:DefaultConnection` is missing/blank or if `Database:Provider` specifies an unsupported provider.
   - `DeskinationDbContextFactory` provides design-time `IDesignTimeDbContextFactory<DeskinationDbContext>` support targeting PostgreSQL for `dotnet ef` CLI commands (`Data/Migrations/`).
   - `DatabaseMigrationExtensions.ApplyDatabaseMigrationsAsync` runs on startup before seeding: requires a relational provider, applies pending EF Core migrations when `Database:AutoMigrate` is enabled (baselining legacy `EnsureCreatedAsync` schemas to `InitialCreate`), and throws if a non-relational provider is used.
   - `BookingDomainRules` centralizes `SlotsOverlap`, `IsActiveBooking`, `ComputeDeskAvailability`, and `ComputeUserStats`.
   - `DeskinationSeeder.EnsureSeededAsync` seeds empty tables on startup after migrations run; `ResetToDefaultsAsync` powers `POST /api/workspace/reset`.
4. **Minimal API Endpoint Groups (`Endpoints/` + `Program.cs`)**:
   - `Program.cs`: `UseForwardedHeaders()` (`X-Forwarded-For` / `X-Forwarded-Proto`), `GET /api/health` (unauthenticated status, provider, and entity counts), and CORS policy `"DeskUiClient"` resolved from `Cors:AllowedOrigins` (defaulting to `http://localhost:3000`, `http://localhost:5173`).
   - `AuthEndpoints.cs`: `/api/auth` (`/status`, `/me`, `/admin-check`).
   - `UsersEndpoints.cs`: `/api/users` (list, `/me` GET/PUT, `/{id}`, `/` POST, `/{id}/stats`).
   - `LocationsEndpoints.cs`: `/api/locations` (CRUD, `/{locationId}/floors/{floorId}/elements`, `/{id}/occupancy`, `/{id}/colleagues`).
   - `DesksEndpoints.cs`: `/api/desks` (CRUD, `/{id}/availability`, `/{id}/allocation`, `/{id}/position`, `/positions` batch tx).
   - `BookingsEndpoints.cs`: `/api/bookings` (list/get, `/` POST transactional booking/request, `/{id}` PUT/DELETE, `/{id}/cancel`, `/{id}/check-in`, `/{id}/approve`, `/{id}/reject`).
   - `WorkspaceEndpoints.cs`: `/api/workspace/reset` (`AdminOnly`).
   - `Program.cs` declares `public partial class Program;` for `WebApplicationFactory<Program>`.

## Verification

Run from `src/services/booking-api` (or via root `make build-api`, `make test-api`):

```bash
dotnet build
dotnet test ../booking-api.Tests/BookingApi.Tests.csproj
```
