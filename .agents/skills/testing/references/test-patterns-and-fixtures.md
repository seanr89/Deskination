# Deskination Test Patterns & Fixtures Reference

## 1. Backend Integration Tests (`src/services/booking-api.Tests`)

Use `TestWebApplicationFactory` to isolate each test's EF Core `InMemory` database and authenticate as either an employee or admin without live Firebase tokens:

```csharp
await using var factory = new TestWebApplicationFactory();
using var unauthenticatedClient = factory.CreateClient();
using var employeeClient = factory.CreateAuthenticatedClient(
    email: "sarah.chen@acme-corp.internal",
    role: "employee");
using var adminClient = factory.CreateAuthenticatedClient(
    email: "elena.rostova@acme-corp.internal",
    role: "admin");
```

### Priority Backend Coverage Targets
- Auth gates (`401 Unauthorized` when unauthenticated, `403 Forbidden` when non-admin calls `AdminOnly` endpoints).
- Booking slot overlap matrix (`morning`, `afternoon`, `full_day`) for both same-desk and same-user double-booking checks.
- Desk policy enforcement (`maintenance`, `designated` user/department restriction, `requires_approval` -> `pending_approval`).
- Booking lifecycle transitions (`confirm` -> `checked_in` / `cancelled`, `pending_approval` -> `confirmed` / `rejected`) and error status codes (`400`, `404`, `409`).

## 2. Frontend Component & Service Unit Tests (`src/clients/desk-ui`)

Vitest runs in Node (`vitest run src`). Render React components with `renderToStaticMarkup` and mock hooks/configs cleanly:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as AuthHook from '../../hooks/useAuth';

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));
```

### Service & Utility Tests
- **`src/services/__tests__/apiClient.test.ts`**: Stub global `fetch` with `vi.stubGlobal('fetch', fetchMock)` and clean up in `afterEach(() => vi.unstubAllGlobals())`; assert `Authorization: Bearer <token>` header injection, query string serialization, and non-2xx error handling.
- **`src/utils/__tests__/`**: Test pure helpers (`dateUtils.ts`, `cookieConsent.ts`, `calendarExport.ts`) with deterministic inputs and stubbed `localStorage` where needed.

## 3. Playwright E2E Tests (`src/clients/desk-ui/e2e/`)

- Existing specs:
  - `e2e/auth-and-api-gate.spec.ts`: Verifies unauthenticated `WelcomeLandingView` -> `AuthView` navigation, single-company copy (zero `"enterprise"` matches), removal of Demo Mode controls, and clean `localStorage` on boot.
  - `e2e/cookie-consent.spec.ts`: Verifies banner actions (`Reject Non-Essential`, `Manage Preferences`, `Accept All`), `deskination_cookie_consent_v1` persistence, and `<dialog>` toggles.
- Prefer semantic ARIA locators (`getByRole`, `getByLabel`) scoped to landmarks (`page.getByRole('main')`, `page.getByRole('region', { name: ... })`, `page.getByRole('dialog', { name: ... })`) to avoid strict-mode collisions.
