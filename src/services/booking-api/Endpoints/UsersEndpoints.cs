using System.Security.Claims;
using BookingApi.Auth;
using BookingApi.Data;
using BookingApi.Models;
using Microsoft.EntityFrameworkCore;

namespace BookingApi.Endpoints;

public static class UsersEndpoints
{
    public static IEndpointRouteBuilder MapUsersEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users")
            .WithTags("Users")
            .RequireAuthorization(AuthPolicies.EmployeeOrAdmin);

        group.MapGet("/", async (
            DeskinationDbContext db,
            string? search = null,
            string? department = null,
            Role? role = null) =>
        {
            var users = await db.Users.AsNoTracking().ToListAsync();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                users = users.Where(u =>
                    u.Name.Contains(term, StringComparison.OrdinalIgnoreCase) ||
                    u.Email.Contains(term, StringComparison.OrdinalIgnoreCase) ||
                    u.Department.Contains(term, StringComparison.OrdinalIgnoreCase) ||
                    u.JobTitle.Contains(term, StringComparison.OrdinalIgnoreCase)).ToList();
            }

            if (!string.IsNullOrWhiteSpace(department))
            {
                var dept = department.Trim();
                users = users.Where(u =>
                    u.Department.Equals(dept, StringComparison.OrdinalIgnoreCase)).ToList();
            }

            if (role.HasValue)
            {
                users = users.Where(u => u.Role == role.Value).ToList();
            }

            return Results.Ok(users);
        })
        .WithName("GetUsers")
        .WithSummary("Returns all workspace User records with optional search, department, and role filters.");

        group.MapGet("/me", async (ClaimsPrincipal principal, DeskinationDbContext db) =>
        {
            var profile = await principal.ResolveWorkspaceUserAsync(db);
            return Results.Ok(profile);
        })
        .WithName("GetCurrentUserProfile")
        .WithSummary("Returns the Deskination User domain record for the authenticated caller.");

        group.MapPut("/me", async (
            UpsertUserRequest request,
            ClaimsPrincipal principal,
            DeskinationDbContext db) =>
        {
            var uid = principal.GetFirebaseUid() ?? "unknown-uid";
            var callerEmail = (!string.IsNullOrWhiteSpace(request.Email) ? request.Email : principal.GetEmail())?.Trim()
                ?? $"{uid}@firebase.local";
            var serverRole = principal.ResolveRole();

            var allUsers = await db.Users.AsNoTracking().ToListAsync();
            var existing = allUsers.FirstOrDefault(u =>
                u.Email.Equals(callerEmail, StringComparison.OrdinalIgnoreCase) ||
                u.Id.Equals(request.Id, StringComparison.OrdinalIgnoreCase) ||
                u.Id.Equals($"usr-{uid}", StringComparison.OrdinalIgnoreCase));

            var effectiveRole = serverRole == Role.Admin || existing?.Role == Role.Admin
                ? Role.Admin
                : Role.Employee;

            var upserted = new User(
                Id: existing?.Id ?? (!string.IsNullOrWhiteSpace(request.Id) ? request.Id : $"usr-{uid}"),
                Name: !string.IsNullOrWhiteSpace(request.Name) ? request.Name.Trim() : (existing?.Name ?? principal.GetDisplayName()),
                Email: existing?.Email ?? callerEmail,
                Role: effectiveRole,
                Department: !string.IsNullOrWhiteSpace(request.Department)
                    ? request.Department.Trim()
                    : (existing?.Department ?? "General Operations"),
                JobTitle: !string.IsNullOrWhiteSpace(request.JobTitle)
                    ? request.JobTitle.Trim()
                    : (existing?.JobTitle ?? "Team Member"),
                AvatarColor: !string.IsNullOrWhiteSpace(request.AvatarColor)
                    ? request.AvatarColor.Trim()
                    : (existing?.AvatarColor ?? "bg-indigo-600")
            );

            var tracked = await db.Users.FindAsync(upserted.Id);
            if (tracked is not null)
            {
                db.Entry(tracked).State = EntityState.Detached;
                db.Users.Update(upserted);
            }
            else
            {
                db.Users.Add(upserted);
            }

            await db.SaveChangesAsync();
            return Results.Ok(upserted);
        })
        .WithName("UpsertCurrentUserProfile")
        .WithSummary("Synchronizes/upserts the authenticated Firebase user's workspace profile.");

        group.MapGet("/{id}", async (string id, DeskinationDbContext db) =>
        {
            var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id);
            return user is not null ? Results.Ok(user) : Results.NotFound(new { message = $"User '{id}' not found." });
        })
        .WithName("GetUserById")
        .WithSummary("Returns a single User by ID.");

        group.MapPost("/", async (
            CreateUserRequest request,
            ClaimsPrincipal principal,
            DeskinationDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Email))
            {
                return Results.BadRequest(new { message = "Name and Email are required." });
            }

            var requestedRole = request.Role ?? Role.Employee;
            if (requestedRole == Role.Admin && !principal.IsAdminUser())
            {
                return Results.Forbid();
            }

            var normalizedEmail = request.Email.Trim();
            var allUsers = await db.Users.AsNoTracking().ToListAsync();
            var existing = allUsers.FirstOrDefault(u =>
                u.Email.Equals(normalizedEmail, StringComparison.OrdinalIgnoreCase) ||
                (!string.IsNullOrWhiteSpace(request.Id) && u.Id.Equals(request.Id, StringComparison.OrdinalIgnoreCase)));

            var userId = existing?.Id
                ?? (!string.IsNullOrWhiteSpace(request.Id) ? request.Id.Trim() : $"usr-custom-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}");

            var created = new User(
                Id: userId,
                Name: request.Name.Trim(),
                Email: normalizedEmail,
                Role: existing?.Role == Role.Admin ? Role.Admin : requestedRole,
                Department: !string.IsNullOrWhiteSpace(request.Department) ? request.Department.Trim() : "General Operations",
                JobTitle: !string.IsNullOrWhiteSpace(request.JobTitle) ? request.JobTitle.Trim() : "Team Member",
                AvatarColor: !string.IsNullOrWhiteSpace(request.AvatarColor) ? request.AvatarColor.Trim() : "bg-indigo-600"
            );

            var tracked = await db.Users.FindAsync(created.Id);
            if (tracked is not null)
            {
                db.Entry(tracked).State = EntityState.Detached;
                db.Users.Update(created);
            }
            else
            {
                db.Users.Add(created);
            }

            await db.SaveChangesAsync();
            return Results.Created($"/api/users/{created.Id}", created);
        })
        .WithName("CreateUser")
        .WithSummary("Creates or updates a custom workspace user.");

        group.MapGet("/{id}/stats", async (
            string id,
            DeskinationDbContext db,
            string? referenceDate = null,
            string? month = null) =>
        {
            var userBookings = await db.Bookings
                .AsNoTracking()
                .Where(b => b.UserId == id)
                .ToListAsync();

            var stats = BookingDomainRules.ComputeUserStats(userBookings, referenceDate, month);
            return Results.Ok(stats);
        })
        .WithName("GetUserStats")
        .WithSummary("Computes and returns UserStats for a workspace user.");

        return app;
    }
}
