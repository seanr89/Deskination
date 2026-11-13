# Deskination UI Client (`desk-ui`)

Web frontend for Deskination (branded **FlexDesk** in the UI), a lightweight internal office desk booking tool built for a single company. It connects to the `.NET 10` `booking-api` backend and uses Firebase Authentication (`firebase/auth`) for employee and office admin sign-in.

## Prerequisites

- Node.js (v22+)
- Running `booking-api` instance (defaults to `http://localhost:8080`)

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables (copy `.env.example` to `.env` if present, or set):
   - `VITE_API_BASE_URL=http://localhost:8080`
   - `VITE_FIREBASE_*` settings for project `officewho-53cec` (or configure them in the UI runtime Firebase Config panel)
3. Start the Vite dev server on `http://localhost:3000`:
   ```bash
   npm run dev
   ```

## Scripts

- `npm run lint` — TypeScript type checking (`tsc --noEmit`)
- `npm run build` — Production Vite build
- `npm test` — Vitest unit tests
- `npm run test:e2e` — Playwright end-to-end tests
