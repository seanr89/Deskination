using BookingApi.Auth;
using BookingApi.Data;
using BookingApi.Models;
using Microsoft.EntityFrameworkCore;

namespace BookingApi.Endpoints;

public static class LocationsEndpoints
{
    public static IEndpointRouteBuilder MapLocationsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/locations")
            .WithTags("Locations")
            .RequireAuthorization(AuthPolicies.EmployeeOrAdmin);

        group.MapGet("/", async (DeskinationDbContext db) =>
        {
            var locations = await db.Locations.AsNoTracking().ToListAsync();
            return Results.Ok(locations);
        })
        .WithName("GetLocations")
        .WithSummary("Returns all Location hubs including nested floors, zones, and architectural floor elements.");

        group.MapGet("/{id}", async (string id, DeskinationDbContext db) =>
        {
            var location = await db.Locations.AsNoTracking().FirstOrDefaultAsync(l => l.Id == id);
            return location is not null
                ? Results.Ok(location)
                : Results.NotFound(new { message = $"Location '{id}' not found." });
        })
        .WithName("GetLocationById")
        .WithSummary("Returns a single Location by ID.");

        group.MapPost("/", async (CreateLocationRequest request, DeskinationDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.City))
            {
                return Results.BadRequest(new { message = "Location Name and City are required." });
            }

            var locationId = !string.IsNullOrWhiteSpace(request.Id)
                ? request.Id.Trim()
                : $"loc-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";

            var defaultFloorId = $"flr-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
            var normalizedFloors = request.Floors is { Count: > 0 }
                ? request.Floors.Select((f, idx) =>
                {
                    var floorId = !string.IsNullOrWhiteSpace(f.Id) ? f.Id : $"{defaultFloorId}-{idx + 1}";
                    var zones = f.Zones is { Count: > 0 }
                        ? f.Zones.Select((z, zIdx) => new Zone(
                            Id: !string.IsNullOrWhiteSpace(z.Id) ? z.Id : $"zn-{floorId}-{zIdx + 1}",
                            FloorId: floorId,
                            Name: z.Name,
                            Code: z.Code,
                            Description: z.Description
                        )).ToList()
                        : new List<Zone>
                        {
                            new(
                                Id: $"zn-{floorId}-1",
                                FloorId: floorId,
                                Name: "Open Workspace Area",
                                Code: "ZONE-A",
                                Description: "General workstation seating"
                            )
                        };

                    return new Floor(
                        Id: floorId,
                        LocationId: locationId,
                        Name: f.Name,
                        Level: f.Level,
                        Zones: zones,
                        Elements: f.Elements ?? []
                    );
                }).ToList()
                : new List<Floor>
                {
                    new(
                        Id: defaultFloorId,
                        LocationId: locationId,
                        Name: "Main Floor 1",
                        Level: 1,
                        Zones:
                        [
                            new(
                                Id: $"zn-{defaultFloorId}-1",
                                FloorId: defaultFloorId,
                                Name: "Open Workspace Area",
                                Code: "ZONE-A",
                                Description: "General workstation seating"
                            )
                        ],
                        Elements: []
                    )
                };

            var created = new Location(
                Id: locationId,
                Name: request.Name.Trim(),
                City: request.City.Trim(),
                Country: !string.IsNullOrWhiteSpace(request.Country) ? request.Country.Trim() : "United Kingdom",
                Address: request.Address.Trim(),
                Timezone: !string.IsNullOrWhiteSpace(request.Timezone) ? request.Timezone.Trim() : "Europe/London",
                Floors: normalizedFloors,
                AdvanceBookingDaysLimit: request.AdvanceBookingDaysLimit ?? 30,
                OpeningHours: !string.IsNullOrWhiteSpace(request.OpeningHours)
                    ? request.OpeningHours.Trim()
                    : "08:00 - 19:30 (Mon - Fri)",
                Description: !string.IsNullOrWhiteSpace(request.Description)
                    ? request.Description.Trim()
                    : $"{request.Name.Trim()} regional office hub."
            );

            db.Locations.Add(created);
            await db.SaveChangesAsync();

            return Results.Created($"/api/locations/{created.Id}", created);
        })
        .RequireAuthorization(AuthPolicies.AdminOnly)
        .WithName("CreateLocation")
        .WithSummary("Creates a new workplace Location hub.");

        group.MapPut("/{id}", async (string id, Location updated, DeskinationDbContext db) =>
        {
            var existing = await db.Locations.FindAsync(id);
            if (existing is null)
            {
                return Results.NotFound(new { message = $"Location '{id}' not found." });
            }

            var normalized = updated with { Id = id };
            db.Entry(existing).State = EntityState.Detached;
            db.Locations.Update(normalized);
            await db.SaveChangesAsync();

            return Results.Ok(normalized);
        })
        .RequireAuthorization(AuthPolicies.AdminOnly)
        .WithName("UpdateLocation")
        .WithSummary("Updates an existing workplace Location.");

        group.MapDelete("/{id}", async (string id, DeskinationDbContext db) =>
        {
            var existing = await db.Locations.FindAsync(id);
            if (existing is null)
            {
                return Results.NotFound(new { message = $"Location '{id}' not found." });
            }

            var desksToRemove = await db.Desks.Where(d => d.LocationId == id).ToListAsync();
            var bookingsToRemove = await db.Bookings.Where(b => b.LocationId == id).ToListAsync();

            db.Bookings.RemoveRange(bookingsToRemove);
            db.Desks.RemoveRange(desksToRemove);
            db.Locations.Remove(existing);
            await db.SaveChangesAsync();

            return Results.NoContent();
        })
        .RequireAuthorization(AuthPolicies.AdminOnly)
        .WithName("DeleteLocation")
        .WithSummary("Deletes a Location and cascades deletion to all associated desks and bookings.");

        group.MapPut("/{locationId}/floors/{floorId}/elements", async (
            string locationId,
            string floorId,
            UpdateFloorElementsRequest request,
            DeskinationDbContext db) =>
        {
            var existing = await db.Locations.FindAsync(locationId);
            if (existing is null)
            {
                return Results.NotFound(new { message = $"Location '{locationId}' not found." });
            }

            var targetFloor = existing.Floors.FirstOrDefault(f => f.Id == floorId);
            if (targetFloor is null)
            {
                return Results.NotFound(new { message = $"Floor '{floorId}' not found in location '{locationId}'." });
            }

            var updatedFloor = targetFloor with { Elements = request.Elements ?? [] };
            var updatedFloors = existing.Floors
                .Select(f => f.Id == floorId ? updatedFloor : f)
                .ToList();

            var updatedLocation = existing with { Floors = updatedFloors };
            db.Entry(existing).State = EntityState.Detached;
            db.Locations.Update(updatedLocation);
            await db.SaveChangesAsync();

            return Results.Ok(updatedFloor);
        })
        .RequireAuthorization(AuthPolicies.AdminOnly)
        .WithName("UpdateFloorElements")
        .WithSummary("Updates the architectural FloorElement[] array on a specific floor.");

        group.MapGet("/{id}/occupancy", async (string id, string? date, DeskinationDbContext db) =>
        {
            var targetDate = string.IsNullOrWhiteSpace(date) ? "2026-10-25" : date.Trim();

            var activeDesksCount = await db.Desks
                .AsNoTracking()
                .CountAsync(d => d.LocationId == id && d.Status == DeskStatus.Active);

            if (activeDesksCount == 0)
            {
                return Results.Ok(new LocationOccupancyResponse(Total: 0, Booked: 0, Rate: 0));
            }

            var bookedDeskIds = await db.Bookings
                .AsNoTracking()
                .Where(b => b.LocationId == id && b.Date == targetDate && b.Status != BookingStatus.Cancelled)
                .Select(b => b.DeskId)
                .Distinct()
                .CountAsync();

            var rate = (int)Math.Round((double)bookedDeskIds / activeDesksCount * 100);
            return Results.Ok(new LocationOccupancyResponse(Total: activeDesksCount, Booked: bookedDeskIds, Rate: rate));
        })
        .WithName("GetLocationOccupancy")
        .WithSummary("Returns daily desk occupancy metrics for a location.");

        group.MapGet("/{id}/colleagues", async (string id, string? date, DeskinationDbContext db) =>
        {
            var targetDate = string.IsNullOrWhiteSpace(date) ? "2026-10-25" : date.Trim();

            var colleaguesBookings = await db.Bookings
                .AsNoTracking()
                .Where(b => b.LocationId == id && b.Date == targetDate && b.Status != BookingStatus.Cancelled)
                .ToListAsync();

            return Results.Ok(colleaguesBookings);
        })
        .WithName("GetColleaguesInOffice")
        .WithSummary("Returns active bookings for colleagues in the office on the specified date.");

        return app;
    }
}
