using System.Text.Json;
using BookingApi.Auth;
using BookingApi.Data;
using BookingApi.Endpoints;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    options.SerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase;
});

builder.Services.AddOpenApi();

builder.Services.AddCors(options =>
{
    options.AddPolicy("DeskUiClient", policy =>
        policy.WithOrigins("http://localhost:3000", "http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

builder.Services.AddDeskinationDatabase(builder.Configuration);
builder.Services.AddFirebaseAuthentication(builder.Configuration);

var app = builder.Build();

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

public partial class Program;


