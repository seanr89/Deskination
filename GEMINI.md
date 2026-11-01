# Deskination — Workspace Rules & Architecture (`GEMINI.md`)

Deskination (branded **FlexDesk** in the UI) is an enterprise hybrid workplace and office desk booking platform for a single organization.

## Repository Layout

- **`src/clients/desk-ui/`**: React 19 + TypeScript + Vite + Tailwind CSS v4 frontend client with Firebase Authentication (`firebase/auth`).
- **`src/services/booking-api/`**: .NET 10 (`net10.0`) ASP.NET Core Minimal Web API backend service.
- **`.agents/skills/`**: Workspace-scoped Gemini/Antigravity skills for the UI client, .NET 10 API, and database persistence/seeding.
- **`.agents/agents/`**: Specialist subagent models (`desk-ui-specialist`, `dotnet-api-architect`, `data-persistence-engineer`).

## Firebase & Environment Configuration

- **Firebase Project ID**: `officewho-53cec`
- **Firebase Auth Domain**: `officewho-53cec.firebaseapp.com`
- **JWT Issuer**: `https://securetoken.google.com/officewho-53cec`
- **JWT Audience**: `officewho-53cec`
- **Client Dev Server**: `http://localhost:3000`
- **Booking API Base URL**: `http://localhost:8080` (`VITE_API_BASE_URL`)

## Shared Domain Contract Invariants

All changes across `src/clients/desk-ui` and `src/services/booking-api` must preserve strict schema parity for the core domain entities defined in `src/clients/desk-ui/src/types/deskBooking.ts`:

1. **Roles (`Role`)**: `'employee' | 'admin'`
2. **Time Slots (`SlotType`)**: `'morning' | 'afternoon' | 'full_day'`
   - `full_day` conflicts with `morning`, `afternoon`, and `full_day` on the same desk and `YYYY-MM-DD` date.
   - `morning` and `afternoon` can coexist on the same desk and date for different bookings.
3. **Desk Allocation Policies (`DeskAllocationType`)**: `'unreserved' | 'designated' | 'requires_approval'`
   - `designated` desks are restricted to `designatedUserId` or `designatedDepartment` unless overridden by an `admin`.
   - `requires_approval` desks create bookings in `'pending_approval'` status for non-admin users until approved/rejected by an office manager (`admin`).
4. **Booking Statuses (`BookingStatus`)**: `'confirmed' | 'cancelled' | 'checked_in' | 'pending_approval' | 'rejected'`

## Available Skills & Specialist Agents

- Activate **`desk-ui-client`** (`.agents/skills/desk-ui-client/SKILL.md`) or delegate to **`desk-ui-specialist`** when modifying React components, floorplans, or Firebase Auth client flows.
- Activate **`dotnet-booking-api`** (`.agents/skills/dotnet-booking-api/SKILL.md`) or delegate to **`dotnet-api-architect`** when implementing C# domain models, Minimal API endpoints, or Firebase JWT authentication in `src/services/booking-api`.
- Activate **`database-persistence-seeding`** (`.agents/skills/database-persistence-seeding/SKILL.md`) or delegate to **`data-persistence-engineer`** when configuring EF Core, Firestore, migrations, or seed data.
