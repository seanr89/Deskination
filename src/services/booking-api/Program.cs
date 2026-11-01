using System.Text.Json;
using BookingApi.Auth;
using BookingApi.Endpoints;

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

builder.Services.AddFirebaseAuthentication(builder.Configuration);

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("DeskUiClient");
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/api/health", (IConfiguration configuration, FirebaseAuthOptions firebaseOptions) =>
{
    var connectionString = configuration.GetConnectionString("DefaultConnection");
    return Results.Ok(new
    {
        status = "healthy",
        service = "booking-api",
        environment = app.Environment.EnvironmentName,
        firebaseProjectId = firebaseOptions.ProjectId,
        databaseConfigured = !string.IsNullOrWhiteSpace(connectionString),
        timestampUtc = DateTimeOffset.UtcNow
    });
})
.WithName("GetHealth")
.WithTags("Diagnostics");

app.MapAuthEndpoints();

var summaries = new[]
{
    "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
};

app.MapGet("/weatherforecast", () =>
{
    var forecast = Enumerable.Range(1, 5).Select(index =>
        new WeatherForecast
        (
            DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
            Random.Shared.Next(-20, 55),
            summaries[Random.Shared.Next(summaries.Length)]
        ))
        .ToArray();
    return forecast;
})
.WithName("GetWeatherForecast");

app.Run();

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}
