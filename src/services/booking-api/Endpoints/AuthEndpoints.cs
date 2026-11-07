using System.Security.Claims;
using BookingApi.Auth;
using BookingApi.Data;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

namespace BookingApi.Endpoints;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var authGroup = app.MapGroup("/api/auth")
            .WithTags("Authentication");

        authGroup.MapGet("/status", (FirebaseAuthOptions firebaseOptions, ClaimsPrincipal user) =>
        {
            var isAuthenticated = user.Identity?.IsAuthenticated == true;
            return TypedResults.Ok(new
            {
                provider = "firebase",
                projectId = firebaseOptions.ProjectId,
                authority = firebaseOptions.Authority,
                audience = firebaseOptions.Audience,
                authenticated = isAuthenticated,
                uid = isAuthenticated ? user.GetFirebaseUid() : null,
                email = isAuthenticated ? user.GetEmail() : null,
                role = isAuthenticated ? user.ResolveRole() : (Models.Role?)null
            });
        })
        .WithName("GetAuthStatus")
        .WithSummary("Returns Firebase JWT authentication configuration and current caller state.");

        authGroup.MapGet("/me", GetCurrentUserAsync)
            .RequireAuthorization(AuthPolicies.EmployeeOrAdmin)
            .WithName("GetAuthenticatedUser")
            .WithSummary("Returns the resolved Deskination profile and claims for the authenticated Firebase user.");

        authGroup.MapGet("/admin-check", async (ClaimsPrincipal user, DeskinationDbContext db) =>
        {
            var users = await db.Users.AsNoTracking().ToListAsync();
            var resolved = user.ToAuthenticatedUserResponse(users);
            return TypedResults.Ok(new
            {
                authorized = true,
                policy = AuthPolicies.AdminOnly,
                uid = resolved.FirebaseUid,
                email = resolved.Email,
                role = resolved.Role
            });
        })
        .RequireAuthorization(AuthPolicies.AdminOnly)
        .WithName("VerifyAdminAccess")
        .WithSummary("Endpoint verifying AdminOnly authorization policy enforcement.");

        return app;
    }

    private static async Task<Ok<AuthenticatedUserResponse>> GetCurrentUserAsync(
        ClaimsPrincipal user,
        DeskinationDbContext db)
    {
        var users = await db.Users.AsNoTracking().ToListAsync();
        return TypedResults.Ok(user.ToAuthenticatedUserResponse(users));
    }
}

