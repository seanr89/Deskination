---
name: testing
description: >-
  Guides writing, organizing, and running unit, integration, and end-to-end tests across
  Deskination (Vitest for src/clients/desk-ui, Playwright for e2e/, and xUnit WebApplicationFactory
  for src/services/booking-api.Tests). Use this skill when adding test coverage, reproducing
  bugs with regression tests, debugging failing specs, or running full pre-PR verification.
---

# Testing Skill (`testing`)

This skill defines Deskination's three-tier testing workflow across frontend unit tests, Playwright E2E tests, and .NET 10 API integration tests.

## Test Suites & Commands

Run suites via the root `Makefile` or directly in each project directory:

1. **Backend xUnit Integration & Domain Tests (`src/services/booking-api.Tests`)**:
   ```bash
   dotnet test src/services/booking-api.Tests
   ```
   - Uses `TestWebApplicationFactory` and `TestAuthHandler` (`X-Test-User-Email`, `X-Test-User-Role`, `X-Test-User-Uid`, `X-Test-User-Name`) with isolated EF Core `InMemory` databases (`Database:Provider=InMemory`) and `DeskinationSeeder.EnsureSeededAsync`.
2. **Frontend Vitest Unit Tests (`src/clients/desk-ui`)**:
   ```bash
   cd src/clients/desk-ui && npm test
   ```
   - Executes `vitest run src` in Node without a browser DOM; component tests render via `renderToStaticMarkup` from `react-dom/server` and mock `useDeskBooking`, `useAuth`, `firebase`, or utility storage modules via `vi.mock(...)`.
3. **Frontend Playwright E2E Tests (`src/clients/desk-ui/e2e`)**:
   ```bash
   cd src/clients/desk-ui && npm run test:e2e
   ```
   - Runs `playwright test` on Chromium and automatically starts `vite --port=4173 --host=127.0.0.1` (configured in `src/clients/desk-ui/playwright.config.ts`).
4. **Full Workspace Verification (`Makefile`)**:
   ```bash
   make lint && make test
   ```

## Authoring Standards

- Read [references/test-patterns-and-fixtures.md](./references/test-patterns-and-fixtures.md) for Deskination's exact mock factories, xUnit `TestWebApplicationFactory` patterns, and Playwright strict-mode locator conventions.
- **Regression First**: When fixing a bug, write a failing test reproducing the defect (for example, rejected booking inclusion, invalid status transitions, or `full_day` slot overlap) before or alongside the fix.
- **No Boot-Time Mock Pollution**: Keep `e2e/auth-and-api-gate.spec.ts` passing—never seed `deskination_*` or `flexdesk_*` domain mock keys into `localStorage` automatically on app boot.
- **Deterministic Dates & Strict Locators**: Pass explicit `YYYY-MM-DD` dates or stub clocks in unit tests; scope Playwright queries (`getByRole('main')`, `getByRole('heading', { name })`, or `{ exact: true }`) so duplicate button or hub labels do not fail strict mode.
- **Honest Reporting**: Only claim tests pass after running them on the final edit with zero skipped or weakened assertions.
