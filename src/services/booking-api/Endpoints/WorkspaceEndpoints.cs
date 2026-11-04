using BookingApi.Auth;
using BookingApi.Data;

namespace BookingApi.Endpoints;

public static class WorkspaceEndpoints
{
    public static IEndpointRouteBuilder MapWorkspaceEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/workspace")
            .WithTags("Workspace")
            .RequireAuthorization(AuthPolicies.AdminOnly);

        group.MapPost("/reset", async (DeskinationDbContext db) =>
        {
            var snapshot = await DeskinationSeeder.ResetToDefaultsAsync(db);
            return Results.Ok(snapshot);
        })
        .WithName("ResetWorkspaceToDefaults")
        .WithSummary("Resets DeskinationDbContext tables back to the canonical seed dataset.");

        return app;
    }
}
