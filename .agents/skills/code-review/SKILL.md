---
name: code-review
description: >-
  Conducts structured, engineering-grade code reviews for Deskination pull requests, branches,
  and uncommitted diffs across src/clients/desk-ui and src/services/booking-api. Use this skill
  when reviewing PRs, auditing diffs for bugs, checking TypeScript/C# schema parity, evaluating
  EF Core query patterns, or verifying React state and accessibility compliance.
---

# Code Review Skill (`code-review`)

This skill defines the standard review workflow for changes in Deskination (`src/clients/desk-ui`, `src/services/booking-api`, and `src/services/booking-api.Tests`).

## Review Workflow

1. **Gather Scope & Context**:
   - Inspect the exact diff (`git diff`, `git diff main...HEAD`, or `gh pr diff <number>`) before commenting.
   - Read surrounding functions and callers for any modified symbol to verify assumptions about types, error paths, and side effects.

2. **Evaluate Core Review Dimensions**:
   - **Correctness & Domain Invariants**:
     - Verify booking slot overlap logic (`full_day` conflicts with `morning`, `afternoon`, and `full_day`; `morning` + `afternoon` can coexist on the same desk/date).
     - Verify booking status rules: active bookings exclude both `'cancelled'` and `'rejected'` (`BookingDomainRules.IsActiveBooking`); status transitions (`pending_approval` -> `confirmed`/`rejected`, `confirmed` -> `checked_in`/`cancelled`) are guarded; date fallbacks use current UTC date rather than stale hardcoded dates.
     - Check optimistic updates in `src/clients/desk-ui/src/context/DeskBookingContext.tsx` for rollback/error surfacing when `apiClient.ts` rejects.
   - **Frontend <-> Backend Wire Parity**:
     - Compare `src/clients/desk-ui/src/types/deskBooking.ts` against `src/services/booking-api/Models/DeskBookingModels.cs` for matching camelCase field names, nullability, and snake_case enum strings (`JsonStringEnumMemberName`).
   - **Performance & EF Core Query Hygiene**:
     - Flag full-table `.ToListAsync()` loads followed by in-memory `.Where(...)` filtering when an `IQueryable` predicate can run in SQL.
     - Flag N+1 database queries inside loops (such as per-item `FindAsync`), missing `AsNoTracking()` on read-only queries, and unbounded UI re-renders or missing Vite chunk boundaries.
   - **Code Quality, Maintainability & Copy**:
     - Flag duplicated business logic, overly large monolithic handlers/components that should share helpers, missing docstrings on new public APIs, and unintended `"enterprise"` copy (Deskination is a lightweight single-company internal tool).
   - **Accessibility & UI Standards**:
     - Verify semantic landmarks, single `<h1>`, sequential heading levels, `<button type="button">` for actions, `aria-hidden="true"` on decorative icons, and proper `<label htmlFor>` / `autocomplete` attributes.
   - **Test Coverage & Verification**:
     - Confirm new behavior or bug fixes include targeted unit, integration, or E2E tests and pass all local checks (`make lint`, `npm test`, `npm run build`, `dotnet test`).

3. **Structure Review Feedback**:
   - Read [references/review-rubric.md](./references/review-rubric.md) for the severity levels, Deskination-specific checks, and required review report template.
   - Cite only verified `file:line` paths, symbols, and observed command results. State explicitly if a test suite or build was not run.
