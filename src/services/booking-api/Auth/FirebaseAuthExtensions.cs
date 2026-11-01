using System.Security.Claims;
using BookingApi.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
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

    private static readonly IReadOnlyList<User> PlaceholderUsers =
    [
        new(
            Id: "usr-sarah",
            Name: "Sarah Chen",
            Email: "sarah.chen@acme-corp.internal",
            Role: Role.Employee,
            Department: "Frontend Engineering",
            JobTitle: "Senior Staff Engineer",
            AvatarColor: "bg-indigo-600"
        ),
        new(
            Id: "usr-marcus",
            Name: "Marcus Vance",
            Email: "marcus.vance@acme-corp.internal",
            Role: Role.Employee,
            Department: "Product Design",
            JobTitle: "Lead Product Designer",
            AvatarColor: "bg-emerald-600"
        ),
        new(
            Id: "usr-priya",
            Name: "Priya Patel",
            Email: "priya.patel@acme-corp.internal",
            Role: Role.Employee,
            Department: "Core Infrastructure",
            JobTitle: "Engineering Manager",
            AvatarColor: "bg-amber-600"
        ),
        new(
            Id: "usr-david",
            Name: "David Kim",
            Email: "david.kim@acme-corp.internal",
            Role: Role.Employee,
            Department: "Enterprise Sales",
            JobTitle: "Account Executive",
            AvatarColor: "bg-rose-600"
        ),
        new(
            Id: "usr-admin-elena",
            Name: "Elena Rostova",
            Email: DefaultAdminEmail,
            Role: Role.Admin,
            Department: "Workplace Operations",
            JobTitle: "Director of Workplace & Facilities",
            AvatarColor: "bg-violet-600"
        )
    ];

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

    public static AuthenticatedUserResponse ToAuthenticatedUserResponse(this ClaimsPrincipal principal)
    {
        var uid = principal.GetFirebaseUid() ?? "unknown-uid";
        var email = principal.GetEmail();
        var role = principal.ResolveRole();

        var matchedSeedUser = !string.IsNullOrWhiteSpace(email)
            ? PlaceholderUsers.FirstOrDefault(u =>
                u.Email.Equals(email, StringComparison.OrdinalIgnoreCase))
            : null;

        var profile = matchedSeedUser is not null
            ? matchedSeedUser with { Role = role }
            : new User(
                Id: uid,
                Name: principal.GetDisplayName(),
                Email: email ?? $"{uid}@firebase.local",
                Role: role,
                Department: role == Role.Admin ? "Workplace Operations" : "General Workspace",
                JobTitle: role == Role.Admin ? "Office Administrator" : "Team Member",
                AvatarColor: role == Role.Admin ? "bg-violet-600" : "bg-indigo-600"
            );

        return new AuthenticatedUserResponse(
            FirebaseUid: uid,
            Email: email,
            DisplayName: profile.Name,
            Role: role,
            Profile: profile
        );
    }
}
