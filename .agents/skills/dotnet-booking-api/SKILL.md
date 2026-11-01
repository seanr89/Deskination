---
name: dotnet-booking-api
description: >-
  Designs, implements, and extends the .NET 10 Deskination Booking API (src/services/booking-api),
  including C# 14 domain models, ASP.NET Core Minimal API endpoints, OpenAPI specs, CORS, and
  Firebase JWT Bearer authentication for project officewho-53cec. Use this skill whenever working
  in src/services/booking-api or integrating the React client with .NET API endpoints.
---

# .NET 10 Booking API Skill (`dotnet-booking-api`)

This skill guides development of the .NET 10 (`net10.0`) Web API in `src/services/booking-api`.

## 1. Domain Models & Wire Compatibility

All C# models and DTOs in `src/services/booking-api` must serialize identically to the TypeScript interfaces in `src/clients/desk-ui/src/types/deskBooking.ts`.

- Read [references/csharp-domain-models.md](./references/csharp-domain-models.md) for the canonical C# 14 domain model definitions (`User`, `Location`, `Floor`, `Zone`, `FloorElement`, `Desk`, `Booking`, `SlotAvailability`, `UserStats`) and `JsonStringEnumConverter(JsonNamingPolicy.SnakeCaseLower)` attributes.

## 2. Firebase JWT Bearer Authentication (`officewho-53cec`)

To validate Firebase ID tokens sent by `src/clients/desk-ui/src/services/apiClient.ts` (`Authorization: Bearer <token>`):

1. **Install Package**:
   ```bash
   cd src/services/booking-api && dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer
   ```
2. **Configure in `Program.cs`**:
   ```csharp
   using Microsoft.AspNetCore.Authentication.JwtBearer;
   using Microsoft.IdentityModel.Tokens;

   var firebaseProjectId = builder.Configuration["Firebase:ProjectId"] ?? "officewho-53cec";

   builder.Services
       .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
       .AddJwtBearer(options =>
       {
           options.Authority = $"https://securetoken.google.com/{firebaseProjectId}";
           options.TokenValidationParameters = new TokenValidationParameters
           {
               ValidateIssuer = true,
               ValidIssuer = $"https://securetoken.google.com/{firebaseProjectId}",
               ValidateAudience = true,
               ValidAudience = firebaseProjectId,
               ValidateLifetime = true
           };
       });

   builder.Services.AddAuthorizationBuilder()
       .AddPolicy("EmployeeOrAdmin", policy => policy.RequireAuthenticatedUser())
       .AddPolicy("AdminOnly", policy =>
           policy.RequireAuthenticatedUser()
                 .RequireAssertion(ctx =>
                     ctx.User.HasClaim("role", "admin") ||
                     ctx.User.HasClaim("admin", "true") ||
                     ctx.User.FindFirst("email")?.Value?.Equals("elena.rostova@acme-corp.internal", StringComparison.OrdinalIgnoreCase) == true));
   ```
3. **Configure CORS for `desk-ui`**:
   ```csharp
   builder.Services.AddCors(options =>
   {
       options.AddPolicy("DeskUiClient", policy =>
           policy.WithOrigins("http://localhost:3000", "http://localhost:5173")
                 .AllowAnyHeader()
                 .AllowAnyMethod());
   });
   ```

## 3. Minimal API Route Groups

Structure endpoints under `/api`:
- `GET /api/locations`, `POST /api/locations` (`AdminOnly`), `PUT /api/locations/{id}` (`AdminOnly`), `DELETE /api/locations/{id}` (`AdminOnly`)
- `GET /api/desks`, `GET /api/desks/{id}/availability?date=YYYY-MM-DD`, `POST /api/desks` (`AdminOnly`), `PUT /api/desks/{id}` (`AdminOnly`), `PATCH /api/desks/positions` (`AdminOnly`)
- `GET /api/bookings`, `POST /api/bookings` (instant book or approval request), `POST /api/bookings/{id}/cancel`, `POST /api/bookings/{id}/check-in`, `POST /api/bookings/{id}/approve` (`AdminOnly`), `POST /api/bookings/{id}/reject` (`AdminOnly`)
- `GET /api/users/me`, `GET /api/users/{id}/stats`

## 4. Verification

Always verify compilation from `src/services/booking-api`:
```bash
cd src/services/booking-api && dotnet build
```
