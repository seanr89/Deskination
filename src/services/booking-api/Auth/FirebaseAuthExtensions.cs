using System.Security.Claims;
using BookingApi.Data;
using BookingApi.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace BookingApi.Auth;

public static class AuthPolicies
{
    public const string EmployeeOrAdmin = "EmployeeOrAdmin";
    public const string AdminOnly = "AdminOnly";
}

public sealed class FirebaseAuthOptions
{
    public const string SectionName = "Firebase";
    public const string DefaultProjectId = "officewho-53cec";

    public string ProjectId { get; init; } = DefaultProjectId;
    public string Authority => $"https://securetoken.google.com/{ProjectId}";
    public string Audience => ProjectId;
}

public sealed record AuthenticatedUserResponse(
    string FirebaseUid,
    string? Email,
    string DisplayName,
    Role Role,
    User Profile
);

public static class FirebaseAuthExtensions
{
    private const string DefaultAdminEmail = "elena.rostova@acme-corp.internal";

    public static IServiceCollection AddFirebaseAuthentication(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var firebaseProjectId = configuration["Firebase:ProjectId"]
            ?? FirebaseAuthOptions.DefaultProjectId;

        var options = new FirebaseAuthOptions { ProjectId = firebaseProjectId };
        services.AddSingleton(options);

        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(jwtOptions =>
            {
                jwtOptions.Authority = options.Authority;
                jwtOptions.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = options.Authority,
                    ValidateAudience = true,
                    ValidAudience = options.Audience,
                    ValidateLifetime = true,
                    NameClaimType = "name",
                    RoleClaimType = "role"
                };
            });

        services.AddAuthorizationBuilder()
            .AddPolicy(AuthPolicies.EmployeeOrAdmin, policy =>
                policy.RequireAuthenticatedUser())
            .AddPolicy(AuthPolicies.AdminOnly, policy =>
                policy.RequireAuthenticatedUser()
                      .RequireAssertion(ctx => ctx.User.IsAdminUser()));

        return services;
    }

    public static string? GetFirebaseUid(this ClaimsPrincipal principal) =>
        principal.FindFirstValue("user_id")
        ?? principal.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? principal.FindFirstValue("sub");

    public static string? GetEmail(this ClaimsPrincipal principal) =>
        principal.FindFirstValue("email")
        ?? principal.FindFirstValue(ClaimTypes.Email);

    public static string GetDisplayName(this ClaimsPrincipal principal)
    {
        var name = principal.FindFirstValue("name")
            ?? principal.FindFirstValue(ClaimTypes.Name);

        if (!string.IsNullOrWhiteSpace(name))
        {
            return name;
        }

        var email = principal.GetEmail();
        if (!string.IsNullOrWhiteSpace(email))
        {
            var localPart = email.Split('@')[0].Replace('.', ' ').Replace('_', ' ');
            return System.Globalization.CultureInfo.InvariantCulture.TextInfo.ToTitleCase(localPart);
        }

        return "FlexDesk Employee";
    }

    public static bool IsAdminUser(this ClaimsPrincipal principal)
    {
        if (principal.HasClaim("role", "admin") ||
            principal.HasClaim(ClaimTypes.Role, "admin") ||
            principal.HasClaim("admin", "true"))
        {
            return true;
        }

        var email = principal.GetEmail();
        if (!string.IsNullOrWhiteSpace(email) &&
            email.Equals(DefaultAdminEmail, StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        return false;
    }

    public static Role ResolveRole(this ClaimsPrincipal principal) =>
        principal.IsAdminUser() ? Role.Admin : Role.Employee;

    public static AuthenticatedUserResponse ToAuthenticatedUserResponse(
        this ClaimsPrincipal principal,
        IEnumerable<User>? workspaceUsers = null)
    {
        var uid = principal.GetFirebaseUid() ?? "unknown-uid";
        var email = principal.GetEmail();
        var role = principal.ResolveRole();
        var candidates = workspaceUsers ?? DeskinationSeeder.InitialUsers;

        var matchedUser = !string.IsNullOrWhiteSpace(email)
            ? candidates.FirstOrDefault(u =>
                u.Email.Equals(email, StringComparison.OrdinalIgnoreCase))
            : candidates.FirstOrDefault(u =>
                u.Id.Equals($"usr-{uid}", StringComparison.OrdinalIgnoreCase) ||
                u.Id.Equals(uid, StringComparison.OrdinalIgnoreCase));

        var effectiveRole = role == Role.Admin || matchedUser?.Role == Role.Admin
            ? Role.Admin
            : Role.Employee;

        var profile = matchedUser is not null
            ? matchedUser with { Role = effectiveRole }
            : new User(
                Id: $"usr-{uid}",
                Name: principal.GetDisplayName(),
                Email: email ?? $"{uid}@firebase.local",
                Role: effectiveRole,
                Department: effectiveRole == Role.Admin ? "Workplace Operations" : "General Operations",
                JobTitle: effectiveRole == Role.Admin ? "Office Administrator" : "Team Member",
                AvatarColor: effectiveRole == Role.Admin ? "bg-blue-700" : "bg-indigo-600"
            );

        return new AuthenticatedUserResponse(
            FirebaseUid: uid,
            Email: email,
            DisplayName: profile.Name,
            Role: effectiveRole,
            Profile: profile
        );
    }

    public static async Task<User> ResolveWorkspaceUserAsync(
        this ClaimsPrincipal principal,
        DeskinationDbContext db)
    {
        var users = await db.Users.AsNoTracking().ToListAsync();
        return principal.ToAuthenticatedUserResponse(users).Profile;
    }
}

