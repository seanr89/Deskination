# Deskination Booking API Rules (`src/services/booking-api/GEMINI.md`)

## Technology Stack

- **Runtime & SDK**: .NET 10 (`net10.0`), C# 14, ASP.NET Core Minimal APIs
- **OpenAPI**: `Microsoft.AspNetCore.OpenApi` (`builder.Services.AddOpenApi()`, `app.MapOpenApi()`)
- **Authentication**: Firebase JWT Bearer authentication validating tokens issued by Firebase project `officewho-53cec`.

## Architectural Conventions

1. **JSON Serialization & Wire Format**:
   - Use camelCase property naming (`JsonNamingPolicy.CamelCase`) to match `src/clients/desk-ui/src/types/deskBooking.ts`.
   - Serialize string union enums (`Role`, `SlotType`, `DeskType`, `DeskAllocationType`, `BookingStatus`, `FloorElementType`) using `JsonStringEnumConverter(JsonNamingPolicy.SnakeCaseLower)` so values like `full_day`, `quiet_booth`, `requires_approval`, and `pending_approval` match the TypeScript client exactly.
2. **Firebase JWT Authentication & Authorization**:
   - Authority: `https://securetoken.google.com/officewho-53cec`
   - Audience: `officewho-53cec`
   - Extract `uid` (`ClaimTypes.NameIdentifier` or `user_id` claim) and `email` (`ClaimTypes.Email` or `email` claim) from `ClaimsPrincipal`.
   - Enforce `AdminOnly` authorization policy for office management mutations (locations, desk inventory, floor elements, and booking approval/rejection).
3. **Endpoint Organization**:
   - Organize Minimal API endpoints into typed route groups under `/api/locations`, `/api/desks`, `/api/bookings`, and `/api/users` using `TypedResults`.
4. **Verification**:
   - After any code change in `src/services/booking-api`, run:
     ```bash
     dotnet build
     ```
