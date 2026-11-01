---
name: database-persistence-seeding
description: >-
  Configures and maintains database persistence (Entity Framework Core, SQLite/PostgreSQL, or Cloud Firestore),
  booking slot concurrency rules, and initial workspace data seeding for Deskination. Use this skill when
  setting up DbContext, repositories, Firestore collections, migrations, or seeding locations, floors, desks,
  users, and bookings.
---

# Database Persistence & Seeding Skill (`database-persistence-seeding`)

This skill governs data persistence, transactional booking invariants, and seed data across `src/services/booking-api` and `src/clients/desk-ui`.

## 1. Booking Slot Conflict & Concurrency Rules

Whenever persisting a new `Booking` (`status` in `['confirmed', 'checked_in', 'pending_approval']`), enforce both desk-level and user-level slot conflict checks inside a transaction:

1. **Desk Slot Conflict**:
   - A desk cannot have two active bookings (`status != 'cancelled' && status != 'rejected'`) on the same `date` (`YYYY-MM-DD`) if:
     - Existing booking is `full_day`, OR
     - New booking is `full_day`, OR
     - Existing booking `slot == newBooking.slot` (`morning == morning` or `afternoon == afternoon`).
2. **User Double-Booking Prevention**:
   - A user (`userId`) cannot hold two active bookings or pending requests on the same `date` with overlapping slots (`existing.slot == 'full_day' || requestedSlot == 'full_day' || existing.slot == requestedSlot`).
3. **Desk Allocation Policy Enforcement**:
   - If `desk.status == 'maintenance'`, reject immediately.
   - If `desk.allocationType == 'designated'` and the caller is not an `'admin'`, verify `desk.designatedUserId == caller.id` or `desk.designatedDepartment == caller.department`.
   - If `desk.requiresApproval == true` or `desk.allocationType == 'requires_approval'` (and caller is not `'admin'`), set initial `Booking.status = 'pending_approval'`.

## 2. EF Core & Firestore Persistence Patterns

- Read [references/slot-conflict-and-seeding.md](./references/slot-conflict-and-seeding.md) for the EF Core `DeskinationDbContext` configuration, JSON column mappings (`Equipment`, `Position`, `Floors`), and initial seed dataset parity with `src/clients/desk-ui/src/mock/initialData.ts`.
- If authoring or updating `firestore.rules` for Cloud Firestore persistence, **always** delegate to the `firestore-rules-author` subagent.

## 3. Verification

- Verify .NET EF Core compilation and seed initialization:
  ```bash
  cd src/services/booking-api && dotnet build
  ```
- Verify UI fallback seed data integrity:
  ```bash
  cd src/clients/desk-ui && npm run lint && npm run build
  ```
