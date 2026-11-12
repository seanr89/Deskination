# Deskination

Deskination (branded **FlexDesk** in the UI) is an office desk booking platform designed for a single organization.

## Source App Structure

```text
.
├── docker-compose.yml              # Local PostgreSQL + Booking API stack
└── src/
    ├── services/
    │   ├── booking-api/            # .NET 10 ASP.NET Core Minimal Web API
    │   │   ├── Auth/               # Firebase JWT Bearer auth & policy setup
    │   │   ├── Data/               # EF Core DbContext, domain rules, & seeder
    │   │   ├── Endpoints/          # Minimal API route groups (auth, users, locations, desks, bookings, workspace)
    │   │   ├── Models/             # C# domain records & request/response DTOs
    │   │   └── Program.cs          # App startup, CORS, OpenAPI, & health endpoint
    │   └── booking-api.Tests/      # Integration tests for the Booking API
    └── clients/
        └── desk-ui/                # React 19 + TypeScript + Vite + Tailwind CSS v4 UI client
            ├── src/                # Components, contexts (Auth, DeskBooking), hooks, services, types, & utils
            ├── e2e/                # Playwright end-to-end tests
            ├── package.json        # Frontend scripts & dependencies
            └── vite.config.ts      # Vite configuration
```

### Booking API (`src/services/booking-api`)
- **Stack:** .NET 10 (`net10.0`), ASP.NET Core Minimal APIs, Entity Framework Core (PostgreSQL with InMemory fallback for local dev), and Firebase JWT Bearer authentication.
- **Default URL:** `http://localhost:8080`
- **Health Check:** `GET /api/health`

### UI Client (`src/clients/desk-ui`)
- **Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, and Firebase Authentication (`firebase/auth`).
- **Default URL:** `http://localhost:3000`
- **API Configuration:** Connects to the Booking API via `VITE_API_BASE_URL` (defaults to `http://localhost:8080`).

## Quick Start (Local Development)

### 1. Start the Booking API (and PostgreSQL)
Using Docker Compose from the repository root:
```bash
docker compose up --build
```
Or run the .NET API directly (falls back to an in-memory database if PostgreSQL is not running):
```bash
cd src/services/booking-api
dotnet run
```

### 2. Start the UI Client
```bash
cd src/clients/desk-ui
npm install
npm run dev
```

### 3. Run Tests
- **API Integration Tests:** `dotnet test src/services/booking-api.Tests`
- **UI Unit Tests:** `cd src/clients/desk-ui && npm test`
- **UI E2E Tests:** `cd src/clients/desk-ui && npm run test:e2e`
