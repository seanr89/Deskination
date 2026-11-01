using System.Security.Claims;
using BookingApi.Auth;
using Microsoft.AspNetCore.Http.HttpResults;

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

        authGroup.MapGet("/me", GetCurrentUser)
            .RequireAuthorization(AuthPolicies.EmployeeOrAdmin)
            .WithName("GetAuthenticatedUser")
            .WithSummary("Returns the resolved Deskination profile and claims for the authenticated Firebase user.");

        authGroup.MapGet("/admin-check", (ClaimsPrincipal user) =>
        {
            var resolved = user.ToAuthenticatedUserResponse();
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
        .WithSummary("Placeholder endpoint verifying AdminOnly authorization policy enforcement.");

        var usersGroup = app.MapGroup("/api/users")
            .WithTags("Users");

        usersGroup.MapGet("/me", (ClaimsPrincipal user) =>
        {
            var resolved = user.ToAuthenticatedUserResponse();
            return TypedResults.Ok(resolved.Profile);
        })
        .RequireAuthorization(AuthPolicies.EmployeeOrAdmin)
        .WithName("GetCurrentUserProfile")
        .WithSummary("Returns the Deskination User domain record for the authenticated caller.");

        return app;
    }

    private static Ok<AuthenticatedUserResponse> GetCurrentUser(ClaimsPrincipal user) =>
        TypedResults.Ok(user.ToAuthenticatedUserResponse());
}
