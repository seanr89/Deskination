# Deskination — Workspace Rules & Architecture (`GEMINI.md`)

Deskination is a lightweight, internal office desk booking tool built for a single company and straightforward internal integration.

## End-to-End Architecture

```text
desk-ui (React 19 SPA :3000)
  ├── Firebase Auth (officewho-53cec) ──► Issues JWT ID tokens
  └── apiClient.ts (Bearer <idToken>) ──► booking-api (.NET 10 Minimal API :8080)
                                            ├── Firebase JWT validation & AdminOnly policies
                                            └── EF Core (DeskinationDbContext)
                                                  └── PostgreSQL 17 (Npgsql)
```

1. **Authentication Gate**: Unauthenticated users see `WelcomeLandingView`, then sign in or register via `AuthView` (`firebase/auth` Email/Password).
2. **Workspace Hydration**: Once signed in, `DeskBookingContext` fetches `/api/users`, `/api/locations`, `/api/desks`, and `/api/bookings` from `booking-api` (`VITE_API_BASE_URL`) and syncs the caller profile via `PUT /api/users/me`.
3. **Database, Migrations & Seeding**: `booking-api` requires PostgreSQL (`ConnectionStrings:DefaultConnection` via `AddDeskinationDatabase`) and fails fast if the connection string is missing or an unsupported `Database:Provider` is configured (xUnit tests substitute relational SQLite in `TestWebApplicationFactory`). On startup, `DatabaseMigrationExtensions.ApplyDatabaseMigrationsAsync` applies EF Core migrations from `Data/Migrations/` (configurable via `Database:AutoMigrate`, automatically baselining legacy `EnsureCreatedAsync` schemas), after which `DeskinationSeeder.EnsureSeededAsync` seeds empty tables with canonical hubs (`loc-london`, `loc-belfast`, `loc-dubai`), floors, desks, users, and bookings.

## Repository Layout

- **`src/clients/desk-ui/`**: React 19 + TypeScript + Vite 8 + Tailwind CSS v4 frontend client (`src/`, `e2e/`, `vite.config.ts`, `playwright.config.ts`, [GEMINI.md](file:///Users/seanrafferty/Documents/development/repos/Deskination/src/clients/desk-ui/GEMINI.md)).
- **`src/services/booking-api/`**: .NET 10 (`net10.0`) ASP.NET Core Minimal Web API (`Auth/`, `Data/`, `Endpoints/`, `Models/`, `Program.cs`, `Dockerfile`, [GEMINI.md](file:///Users/seanrafferty/Documents/development/repos/Deskination/src/services/booking-api/GEMINI.md)).
- **`src/services/booking-api.Tests/`**: xUnit integration test suite (`TestWebApplicationFactory`, `TestAuthHandler`, `BookingApiIntegrationTests`).
- **`Makefile` & `docker-compose.yml`**: Unified build, lint, test, and containerized local development workflows.
- **`TODO.md`**: Tracked codebase bugs and technical debt across UI and API (review before refactoring domain rules or endpoints).
- **`.agents/agents/` & `.agents/skills/`**: Specialist subagents and domain skills.

## Firebase & Environment Configuration

- **Firebase Project ID**: `officewho-53cec`
- **Firebase Auth Domain**: `officewho-53cec.firebaseapp.com`
- **JWT Issuer / Audience**: `https://securetoken.google.com/officewho-53cec` / `officewho-53cec`
- **Client Dev Server**: `http://localhost:3000` (Playwright E2E serves on `http://127.0.0.1:4173`)
- **Booking API Base URL**: `http://localhost:8080` (`VITE_API_BASE_URL`)
- **PostgreSQL (Compose / Local)**: `Host=localhost;Port=5432;Database=deskination;Username=deskination`

## Developer Workflows (`Makefile` & `docker-compose.yml`)

- **`make dev`**: Starts `postgres` (`postgres:17-alpine`) + `booking-api` in Docker Compose and runs `desk-ui` locally on `:3000`.
- **`make dev-docker`**: Runs the full stack (`postgres`, `booking-api`, and `desk-ui` under `--profile dev`) inside Docker Compose.
- **`make up` / `make down` / `make logs` / `make docker-reset`**: Manage Docker Compose containers and volumes (`postgres_data`, `desk_ui_node_modules`).
- **`make build` / `make lint`**: Verifies .NET build (`dotnet build`) and UI type-checking/build (`npm run lint && npm run build`).
- **`make test`**: Runs all three test tiers:
  - `make test-api`: `dotnet test src/services/booking-api.Tests/BookingApi.Tests.csproj`
  - `make test-ui`: `cd src/clients/desk-ui && npm test` (Vitest)
  - `make test-e2e`: `cd src/clients/desk-ui && npm run test:e2e` (Playwright)

## Shared Domain Contract Invariants

All changes across `src/clients/desk-ui/src/types/deskBooking.ts` and `src/services/booking-api/Models/DeskBookingModels.cs` must preserve 1:1 wire compatibility (camelCase properties, snake_case enum strings):

1. **Roles (`Role`)**: `'employee' | 'admin'`
2. **Time Slots (`SlotType`)**: `'morning' | 'afternoon' | 'full_day'`
   - `full_day` conflicts with `morning`, `afternoon`, and `full_day` on the same desk and `YYYY-MM-DD` date.
   - `morning` and `afternoon` can coexist on the same desk and date for different bookings.
3. **Desk Allocation Policies (`DeskAllocationType`)**: `'unreserved' | 'designated' | 'requires_approval'`
   - `designated` desks are restricted to `designatedUserId` or `designatedDepartment` unless overridden by an `admin` or submitted as an approval request.
   - `requires_approval` desks create bookings in `'pending_approval'` status for non-admin users until approved/rejected by an `admin`.
4. **Booking Statuses (`BookingStatus`)**: `'confirmed' | 'cancelled' | 'checked_in' | 'pending_approval' | 'rejected'`

## Available Skills & Specialist Agents

- **UI Client**: Activate `desk-ui-client` (`.agents/skills/desk-ui-client/SKILL.md`) or delegate to `desk-ui-specialist` for React components, floorplans, utilities, or Firebase Auth flows.
- **Booking API**: Activate `dotnet-booking-api` (`.agents/skills/dotnet-booking-api/SKILL.md`) or delegate to `dotnet-api-architect` for C# models, Minimal API endpoints, or JWT auth in `src/services/booking-api`.
- **Persistence & Seeding**: Activate `database-persistence-seeding` (`.agents/skills/database-persistence-seeding/SKILL.md`) or delegate to `data-persistence-engineer` for `DeskinationDbContext`, `BookingDomainRules`, or `DeskinationSeeder`.
- **Quality, Security & Testing**: Use `.agents/skills/` cross-cutting skills when available (`code-review` for PR/diff reviews, `code-security` for auth/validation/privacy audits, `testing` for Vitest/Playwright/xUnit patterns), and check `TODO.md` for known bugs and technical debt.
