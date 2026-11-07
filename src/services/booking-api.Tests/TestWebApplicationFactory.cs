using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text.Encodings.Web;
using BookingApi.Data;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BookingApi.Tests;

public sealed class TestWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName = $"DeskinationTestDb_{Guid.NewGuid():N}";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.UseSetting("Database:Provider", "InMemory");
        builder.UseSetting("Database:InMemoryName", _databaseName);
        builder.UseSetting("ConnectionStrings:DefaultConnection", string.Empty);

        builder.ConfigureTestServices(services =>
        {
            services
                .AddAuthentication(options =>
                {
                    options.DefaultAuthenticateScheme = TestAuthHandler.SchemeName;
                    options.DefaultChallengeScheme = TestAuthHandler.SchemeName;
                    options.DefaultForbidScheme = TestAuthHandler.SchemeName;
                    options.DefaultScheme = TestAuthHandler.SchemeName;
                })
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(
                    TestAuthHandler.SchemeName,
                    _ => { });
        });
    }

    public HttpClient CreateAuthenticatedClient(
        string email,
        string role = "employee",
        string? uid = null,
        string? displayName = null)
    {
        var client = CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.EmailHeader, email);
        client.DefaultRequestHeaders.Add(TestAuthHandler.RoleHeader, role);

        if (!string.IsNullOrWhiteSpace(uid))
        {
            client.DefaultRequestHeaders.Add(TestAuthHandler.UidHeader, uid);
        }

        if (!string.IsNullOrWhiteSpace(displayName))
        {
            client.DefaultRequestHeaders.Add(TestAuthHandler.NameHeader, displayName);
        }

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(TestAuthHandler.SchemeName, "test-token");
        return client;
    }

    public async Task EnsureSeededAsync()
    {
        await DeskinationSeeder.EnsureSeededAsync(Services);
    }
}

public sealed class TestAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "TestAuth";
    public const string EmailHeader = "X-Test-User-Email";
    public const string RoleHeader = "X-Test-User-Role";
    public const string UidHeader = "X-Test-User-Uid";
    public const string NameHeader = "X-Test-User-Name";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue(EmailHeader, out var emailValues) ||
            string.IsNullOrWhiteSpace(emailValues.ToString()))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var email = emailValues.ToString().Trim();
        var role = Request.Headers.TryGetValue(RoleHeader, out var roleValues) &&
                   !string.IsNullOrWhiteSpace(roleValues.ToString())
            ? roleValues.ToString().Trim().ToLowerInvariant()
            : "employee";

        var uid = Request.Headers.TryGetValue(UidHeader, out var uidValues) &&
                  !string.IsNullOrWhiteSpace(uidValues.ToString())
            ? uidValues.ToString().Trim()
            : $"firebase-{email.Split('@')[0].Replace('.', '-')}";

        var claims = new List<Claim>
        {
            new("user_id", uid),
            new(ClaimTypes.NameIdentifier, uid),
            new("sub", uid),
            new("email", email),
            new(ClaimTypes.Email, email),
            new("role", role),
            new(ClaimTypes.Role, role)
        };

        if (Request.Headers.TryGetValue(NameHeader, out var nameValues) &&
            !string.IsNullOrWhiteSpace(nameValues.ToString()))
        {
            var name = nameValues.ToString().Trim();
            claims.Add(new Claim("name", name));
            claims.Add(new Claim(ClaimTypes.Name, name));
        }

        if (string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase))
        {
            claims.Add(new Claim("admin", "true"));
        }

        var identity = new ClaimsIdentity(claims, SchemeName, "name", "role");
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, SchemeName);

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
