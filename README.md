# Deskination

Deskination is a lightweight internal office desk booking tool designed for a single company and straightforward internal integration.

## Source App Structure

```text
.
├── .github/workflows/                # GitHub Actions CI workflows (PR checks & Docker build)
├── Makefile                          # Unified build, test, Docker Compose, and dev workflow commands
├── docker-compose.yml                # Local PostgreSQL, Booking API, and optional dev UI stack
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

### Using `make` (Recommended)
Run `make help` from the repository root to view all available targets:
- **Start full stack in dev mode** (PostgreSQL + Booking API in Docker Compose, UI dev server on `http://localhost:3000`):
  ```bash
  make dev
  ```
- **Start full stack entirely inside Docker Compose**:
  ```bash
  make dev-docker
  ```
- **Build both backend and frontend**:
  ```bash
  make build
  ```
- **Manage Docker Compose stack**: `make up`, `make down`, `make logs`, `make docker-reset`
- **Run all tests & checks**: `make lint`, `make test` (`test-api`, `test-ui`, `test-e2e`)

### Manual Commands

#### 1. Start the Booking API (and PostgreSQL)
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

## CI / GitHub Actions

Pull requests targeting `main`, pushes to `main`, and manual `workflow_dispatch` runs are validated by GitHub Actions:

- **PR Checks ([`.github/workflows/pr-checks.yml`](.github/workflows/pr-checks.yml))**: Uses path change detection (`Detect Changed Paths` via `dorny/paths-filter`) so jobs only run when their target directory (`src/services/**` or `src/clients/**`) or the workflow itself changes (or on `workflow_dispatch`), with dependency/Playwright caching, least-privilege permissions, concurrency cancellation on PR updates, and 7-day failure artifact uploads (`.trx` test logs and Playwright HTML reports/traces):
  - `Backend (.NET 10 Build & Tests)`: Runs when `src/services/**` changes; restores, builds (`Release`), and runs xUnit integration tests for `booking-api` using the self-contained `InMemory` EF Core provider.
  - `Frontend (Lint, Build & Unit Tests)`: Runs when `src/clients/**` changes; runs `npm ci`, TypeScript type-check (`npm run lint`), Vite production build (`npm run build`), and Vitest unit tests (`npm test`) on Node 24 without requiring `.env` or Firebase secrets.
  - `Frontend E2E (Playwright Chromium)`: Runs when `src/clients/**` changes; installs Chromium and runs `npm run test:e2e` against the local Vite server (`http://127.0.0.1:4173`).
  - `CI Status`: Always-running aggregate gate job that succeeds when all executed jobs pass (and skipped path-filtered jobs did not fail).
- **Docker Build ([`.github/workflows/docker-build.yml`](.github/workflows/docker-build.yml))**: Verifies `src/services/booking-api/Dockerfile` builds cleanly (`push: false`) only when `src/services/booking-api/**`, `docker-compose.yml`, `.dockerignore`, or the workflow file changes.

### Branch Protection (`main`)

Configure the following **exact job name** from `PR Checks` as the required status check on `main`:

- `CI Status`

> **Note:** Do not mark `Backend (.NET 10 Build & Tests)`, `Frontend (Lint, Build & Unit Tests)`, `Frontend E2E (Playwright Chromium)`, or `Booking API Docker Build` individually as required checks in branch protection, because path-filtered jobs are skipped when their target directory has no edits (and skipped checks remain `Pending` in GitHub Branch Protection). `CI Status` enforces every executed job while allowing skipped jobs on single-component or docs-only PRs.

### Action Version Pinning

Official and third-party GitHub Actions (`actions/checkout`, `actions/setup-dotnet`, `actions/setup-node`, `actions/cache`, `actions/upload-artifact`, `dorny/paths-filter`, `docker/setup-buildx-action`, `docker/build-push-action`) are pinned to current supported major versions and should be reviewed quarterly or upon security advisories.
