# Deskination UI Component & State Contracts

## 1. Navigation Views (`src/App.tsx`)

`MainApp` manages four primary workspace views via `currentView`:
- `'book'` -> `src/components/BookDeskView.tsx`: Interactive floorplan (`InteractiveFloorPlan.tsx`), availability calendar (`DeskAvailabilityCalendarView.tsx`), and desk booking modal (`DeskModal.tsx`).
- `'dashboard'` -> `src/components/EmployeeDashboard.tsx`: Personal upcoming reservations, check-in actions, pending approval requests, and `UserStats` metrics.
- `'directory'` -> `src/components/OfficeDirectory.tsx`: Colleagues in the office today, department filter, and daily occupancy report modal (`DailyOccupancyReportModal.tsx`).
- `'admin'` -> `src/components/AdminConsole.tsx`: Office manager console for approving/rejecting requests, editing floorplan layout (`EditableFloorPlan.tsx`), and managing desk allocation policies (`unreserved`, `designated`, `requires_approval`).

## 2. Floorplan Coordinate System

- `Desk.position` (`{ x: number, y: number }`) and `FloorElement` (`{ x, y, width, height }`) use **percentage coordinates (`0` to `100`)** relative to the floorplan canvas container.
- `Desk.rotation` is constrained to `0 | 90 | 180 | 270` degrees.
- When updating multiple desks in `EditableFloorPlan.tsx`, use `batchUpdateDeskPositions` in `DeskBookingContext` to commit position changes atomically.

## 3. Authentication & Demo Mode Fallback

- When `isAuthenticated` is `false`, `MainApp` renders `src/components/AuthView.tsx`.
- `AuthView` supports three tabs (`'signin'`, `'signup'`, `'reset'`), runtime Firebase config overrides, and one-click Demo Persona launch (`enterDemoMode(user)`).
- In `Header.tsx` and `UserSwitcherModal.tsx`, check `authMode` (`'firebase' | 'demo'`) from `useAuth()` to distinguish live Firebase sessions from Demo Mode sessions.
