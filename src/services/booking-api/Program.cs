using System.Text.Json;
using BookingApi.Auth;
using BookingApi.Data;
using BookingApi.Endpoints;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    options.SerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase;
});

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

builder.Services.AddOpenApi();

var allowedOrigins = ResolveCorsAllowedOrigins(builder.Configuration);

builder.Services.AddCors(options =>
{
    options.AddPolicy("DeskUiClient", policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod());
});

builder.Services.AddDeskinationDatabase(builder.Configuration);
builder.Services.AddFirebaseAuthentication(builder.Configuration);

var app = builder.Build();

app.UseForwardedHeaders();

await app.Services.ApplyDatabaseMigrationsAsync(app.Configuration, app.Logger);
await DeskinationSeeder.EnsureSeededAsync(app.Services);

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("DeskUiClient");
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/api/health", async (
    IConfiguration configuration,
    FirebaseAuthOptions firebaseOptions,
    DeskinationDbContext db) =>
{
    var connectionString = configuration.GetConnectionString("DefaultConnection");
    var provider = db.Database.ProviderName ?? "Unknown";
    return Results.Ok(new
    {
        status = "healthy",
        service = "booking-api",
        environment = app.Environment.EnvironmentName,
        firebaseProjectId = firebaseOptions.ProjectId,
        databaseConfigured = !string.IsNullOrWhiteSpace(connectionString),
        databaseProvider = provider,
        counts = new
        {
            users = await db.Users.CountAsync(),
            locations = await db.Locations.CountAsync(),
            desks = await db.Desks.CountAsync(),
            bookings = await db.Bookings.CountAsync()
        },
        timestampUtc = DateTimeOffset.UtcNow
    });
})
.WithName("GetHealth")
.WithTags("Diagnostics");

app.MapAuthEndpoints();
app.MapUsersEndpoints();
app.MapLocationsEndpoints();
app.MapDesksEndpoints();
app.MapBookingsEndpoints();
app.MapWorkspaceEndpoints();

app.Run();

public partial class Program
{
    private static readonly string[] DefaultCorsOrigins =
    [
        "http://localhost:3000",
        "http://localhost:5173"
    ];

    /// <summary>
    /// Resolves allowed CORS origins from scalar or array configuration under <c>Cors:AllowedOrigins</c>.
    /// </summary>
    public static string[] ResolveCorsAllowedOrigins(IConfiguration configuration)
    {
        var section = configuration.GetSection("Cors:AllowedOrigins");
        IEnumerable<string?> rawValues = !string.IsNullOrWhiteSpace(section.Value)
            ? [section.Value]
            : section.GetChildren().Select(c => c.Value);

        var origins = rawValues
            .Where(v => !string.IsNullOrWhiteSpace(v))
            .SelectMany(v => v!.Split([',', ';'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            .Select(origin => origin.TrimEnd('/'))
            .Where(origin => !string.IsNullOrWhiteSpace(origin))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        return origins.Length > 0 ? origins : DefaultCorsOrigins;
    }
}


