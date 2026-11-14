# Deskination Code Review Rubric & Template

## 1. Severity Levels

- **`[Blocker]`**: Functional bug, data corruption, broken auth/role check, schema mismatch between `desk-ui` and `booking-api`, or failing build/tests. Must be resolved before merge.
- **`[Major]`**: Missing rollback on failed API mutation, N+1 or full-table query in hot path, missing test coverage for critical rules, or WCAG/semantic accessibility violation.
- **`[Minor]`**: Refactoring opportunity, duplicated helper, naming clarity, or documentation sync item.

## 2. Deskination-Specific Review Checklist

### Backend (`src/services/booking-api`)
1. **Minimal APIs & DTOs**: Route groups use `TypedResults` / `Results`, enforce `AuthPolicies.EmployeeOrAdmin` or `AuthPolicies.AdminOnly`, and preserve camelCase + snake_case JSON parity with `deskBooking.ts`.
2. **Transactions & Concurrency**: Booking creation, approval, cancellation, and deletion preserve referential integrity and re-check desk/user slot overlaps inside a transaction.
3. **EF Core**: Read paths use `.AsNoTracking()`; filters push down to `IQueryable` before `.ToListAsync()`; batch operations fetch target rows in a single query.
4. **Compiler Cleanliness**: `dotnet build src/services/booking-api/booking-api.csproj` produces zero warnings or errors.

### Frontend (`src/clients/desk-ui`)
1. **Auth & API Client**: Components use `useAuth()` and `apiRequest<T>()`, never raw `fetch` without auth headers or direct `getAuth()` calls in UI components.
2. **State & Error Handling**: Mutations handle API failures without leaving stale optimistic state or silent failures.
3. **Floorplan & Domain Rules**: `Desk.position` and `FloorElement` coordinates stay within `0–100` percentage bounds; `Desk.rotation` is `0 | 90 | 180 | 270`.
4. **Copy & Bundle**: Internal single-company framing (no `"enterprise"` copy); `npm run lint`, `npm test`, and `npm run build` succeed without Vite >500 kB chunk warnings.

## 3. Standard Review Output Format

```markdown
## Code Review Summary
- **Scope**: <PR/branch/files reviewed>
- **Verdict**: Approve | Request Changes | Comment

### Findings
1. **[Severity] `<short title>`** — `path/to/file.ext:L10-L25`
   - **Issue**: <what is wrong and why it matters>
   - **Recommendation**: <concrete fix>

### Verification Status
- Checked commands: <exact commands run and observed results, or "Not run">
```
