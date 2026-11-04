using System.Security.Claims;
using BookingApi.Auth;
using BookingApi.Data;
using BookingApi.Models;
using Microsoft.EntityFrameworkCore;

namespace BookingApi.Endpoints;

public static class DesksEndpoints
{
    public static IEndpointRouteBuilder MapDesksEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/desks")
            .WithTags("Desks")
            .RequireAuthorization(AuthPolicies.EmployeeOrAdmin);

        group.MapGet("/", async (
            DeskinationDbContext db,
            string? locationId = null,
            string? floorId = null,
            string? zoneId = null,
            DeskType? deskType = null,
            DeskAllocationType? allocationType = null,
            DeskStatus? status = null,
            string? search = null) =>
        {
            var desks = await db.Desks.AsNoTracking().ToListAsync();

            if (!string.IsNullOrWhiteSpace(locationId))
            {
                desks = desks.Where(d => d.LocationId == locationId.Trim()).ToList();
            }

            if (!string.IsNullOrWhiteSpace(floorId))
            {
                desks = desks.Where(d => d.FloorId == floorId.Trim()).ToList();
            }

            if (!string.IsNullOrWhiteSpace(zoneId))
            {
                desks = desks.Where(d => d.ZoneId == zoneId.Trim()).ToList();
            }

            if (deskType.HasValue)
            {
                desks = desks.Where(d => d.DeskType == deskType.Value).ToList();
            }

            if (allocationType.HasValue)
            {
                desks = desks.Where(d => (d.AllocationType ?? DeskAllocationType.Unreserved) == allocationType.Value).ToList();
            }

            if (status.HasValue)
            {
                desks = desks.Where(d => d.Status == status.Value).ToList();
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                desks = desks.Where(d =>
                    d.Code.Contains(term, StringComparison.OrdinalIgnoreCase) ||
                    d.Name.Contains(term, StringComparison.OrdinalIgnoreCase) ||
                    (d.DesignatedUserName?.Contains(term, StringComparison.OrdinalIgnoreCase) ?? false) ||
                    (d.DesignatedDepartment?.Contains(term, StringComparison.OrdinalIgnoreCase) ?? false) ||
                    d.Equipment.Any(eq => eq.Contains(term, StringComparison.OrdinalIgnoreCase))).ToList();
            }

            return Results.Ok(desks);
        })
        .WithName("GetDesks")
        .WithSummary("Returns Desk[] inventory with optional location, floor, zone, type, allocation, status, and search filters.");

        group.MapGet("/{id}", async (string id, DeskinationDbContext db) =>
        {
            var desk = await db.Desks.AsNoTracking().FirstOrDefaultAsync(d => d.Id == id);
            return desk is not null
                ? Results.Ok(desk)
                : Results.NotFound(new { message = $"Desk '{id}' not found." });
        })
        .WithName("GetDeskById")
        .WithSummary("Returns a single Desk by ID.");

        group.MapGet("/{id}/availability", async (
            string id,
            string? date,
            ClaimsPrincipal principal,
            DeskinationDbContext db) =>
        {
            var targetDesk = await db.Desks.AsNoTracking().FirstOrDefaultAsync(d => d.Id == id);
            if (targetDesk is null)
            {
                return Results.NotFound(new { message = $"Desk '{id}' not found." });
            }

            var targetDate = string.IsNullOrWhiteSpace(date) ? "2026-10-25" : date.Trim();
            var caller = await principal.ResolveWorkspaceUserAsync(db);

            var deskBookings = await db.Bookings
                .AsNoTracking()
                .Where(b => b.DeskId == id && b.Date == targetDate)
                .ToListAsync();

            var availability = BookingDomainRules.ComputeDeskAvailability(targetDesk, deskBookings, caller);
            return Results.Ok(availability);
        })
        .WithName("GetDeskAvailability")
        .WithSummary("Computes SlotAvailability for a desk on the specified date relative to the authenticated caller.");

        group.MapPost("/", async (CreateDeskRequest request, DeskinationDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.LocationId))
            {
                return Results.BadRequest(new { message = "Desk Code and LocationId are required." });
            }

            var deskId = !string.IsNullOrWhiteSpace(request.Id)
                ? request.Id.Trim()
                : $"desk-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{Guid.NewGuid().ToString("N")[..4]}";

            var created = new Desk(
                Id: deskId,
                Code: request.Code.Trim().ToUpperInvariant(),
                Name: !string.IsNullOrWhiteSpace(request.Name) ? request.Name.Trim() : $"Desk {request.Code.Trim()}",
                LocationId: request.LocationId.Trim(),
                FloorId: request.FloorId.Trim(),
                ZoneId: request.ZoneId.Trim(),
                DeskType: request.DeskType,
                AllocationType: request.AllocationType,
                DesignatedUserId: request.AllocationType == DeskAllocationType.Designated ? request.DesignatedUserId : null,
                DesignatedUserName: request.AllocationType == DeskAllocationType.Designated ? request.DesignatedUserName : null,
                DesignatedDepartment: request.AllocationType == DeskAllocationType.Designated ? request.DesignatedDepartment : null,
                RequiresApproval: request.AllocationType == DeskAllocationType.RequiresApproval ? true : request.RequiresApproval,
                Equipment: request.Equipment ?? ["Single 27\" 4K Monitor", "USB-C Dock"],
                Status: request.Status ?? DeskStatus.Active,
                Position: request.Position ?? new DeskPosition(50, 50),
                Rotation: request.Rotation,
                Notes: request.Notes
            );

            db.Desks.Add(created);
            await db.SaveChangesAsync();

            return Results.Created($"/api/desks/{created.Id}", created);
        })
        .RequireAuthorization(AuthPolicies.AdminOnly)
        .WithName("CreateDesk")
        .WithSummary("Creates a new Desk in workstation inventory.");

        group.MapPut("/{id}", async (string id, Desk updated, DeskinationDbContext db) =>
        {
            var existing = await db.Desks.FindAsync(id);
            if (existing is null)
            {
                return Results.NotFound(new { message = $"Desk '{id}' not found." });
            }

            var normalized = updated with { Id = id };
            db.Entry(existing).State = EntityState.Detached;
            db.Desks.Update(normalized);
            await db.SaveChangesAsync();

            return Results.Ok(normalized);
        })
        .RequireAuthorization(AuthPolicies.AdminOnly)
        .WithName("UpdateDesk")
        .WithSummary("Updates an existing Desk.");

        group.MapPatch("/{id}/allocation", async (
            string id,
            UpdateDeskAllocationRequest request,
            DeskinationDbContext db) =>
        {
            var existing = await db.Desks.FindAsync(id);
            if (existing is null)
            {
                return Results.NotFound(new { message = $"Desk '{id}' not found." });
            }

            var isDesignated = request.AllocationType == DeskAllocationType.Designated;
            var updated = existing with
            {
                AllocationType = request.AllocationType,
                DesignatedUserId = isDesignated ? request.DesignatedUserId : null,
                DesignatedUserName = isDesignated ? request.DesignatedUserName : null,
                DesignatedDepartment = isDesignated ? request.DesignatedDepartment : null,
                RequiresApproval = request.AllocationType == DeskAllocationType.RequiresApproval
                    ? true
                    : request.RequiresApproval
            };

            db.Entry(existing).State = EntityState.Detached;
            db.Desks.Update(updated);
            await db.SaveChangesAsync();

            return Results.Ok(updated);
        })
        .RequireAuthorization(AuthPolicies.AdminOnly)
        .WithName("UpdateDeskAllocation")
        .WithSummary("Updates a desk's allocation policy.");

        group.MapPatch("/{id}/position", async (
            string id,
            UpdateDeskPositionRequest request,
            DeskinationDbContext db) =>
        {
            var existing = await db.Desks.FindAsync(id);
            if (existing is null)
            {
                return Results.NotFound(new { message = $"Desk '{id}' not found." });
            }

            var updated = existing with
            {
                Position = request.Position,
                Rotation = request.Rotation ?? existing.Rotation
            };

            db.Entry(existing).State = EntityState.Detached;
            db.Desks.Update(updated);
            await db.SaveChangesAsync();

            return Results.Ok(updated);
        })
        .RequireAuthorization(AuthPolicies.AdminOnly)
        .WithName("UpdateDeskPosition")
        .WithSummary("Updates a single desk's floorplan coordinates and rotation.");

        group.MapPatch("/positions", async (
            BatchUpdateDeskPositionsRequest request,
            DeskinationDbContext db) =>
        {
            await using var tx = await db.Database.BeginTransactionAsync();

            var updateMap = (request.Updates ?? [])
                .ToDictionary(u => u.Id, u => u, StringComparer.Ordinal);

            var updatedDesks = new List<Desk>();
            foreach (var (deskId, item) in updateMap)
            {
                var existing = await db.Desks.FindAsync(deskId);
                if (existing is null)
                {
                    continue;
                }

                var updated = existing with
                {
                    Position = item.Position,
                    Rotation = item.Rotation ?? existing.Rotation
                };

                db.Entry(existing).State = EntityState.Detached;
                db.Desks.Update(updated);
                updatedDesks.Add(updated);
            }

            await db.SaveChangesAsync();
            await tx.CommitAsync();

            return Results.Ok(updatedDesks);
        })
        .RequireAuthorization(AuthPolicies.AdminOnly)
        .WithName("BatchUpdateDeskPositions")
        .WithSummary("Batch-updates multiple desk positions and rotations in a single transaction.");

        group.MapDelete("/{id}", async (string id, DeskinationDbContext db) =>
        {
            var existing = await db.Desks.FindAsync(id);
            if (existing is null)
            {
                return Results.NotFound(new { message = $"Desk '{id}' not found." });
            }

            db.Desks.Remove(existing);
            await db.SaveChangesAsync();

            return Results.NoContent();
        })
        .RequireAuthorization(AuthPolicies.AdminOnly)
        .WithName("DeleteDesk")
        .WithSummary("Deletes a desk from inventory.");

        return app;
    }
}
