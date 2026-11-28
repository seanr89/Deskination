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
            IQueryable<Desk> query = db.Desks.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(locationId))
            {
                var loc = locationId.Trim();
                query = query.Where(d => d.LocationId == loc);
            }

            if (!string.IsNullOrWhiteSpace(floorId))
            {
                var flr = floorId.Trim();
                query = query.Where(d => d.FloorId == flr);
            }

            if (!string.IsNullOrWhiteSpace(zoneId))
            {
                var zn = zoneId.Trim();
                query = query.Where(d => d.ZoneId == zn);
            }

            if (deskType.HasValue)
            {
                var targetDeskType = deskType.Value;
                query = query.Where(d => d.DeskType == targetDeskType);
            }

            if (allocationType.HasValue)
            {
                var targetAllocation = allocationType.Value;
                if (targetAllocation == DeskAllocationType.Unreserved)
                {
                    query = query.Where(d => d.AllocationType == null || d.AllocationType == DeskAllocationType.Unreserved);
                }
                else
                {
                    query = query.Where(d => d.AllocationType == targetAllocation);
                }
            }

            if (status.HasValue)
            {
                var targetStatus = status.Value;
                query = query.Where(d => d.Status == targetStatus);
            }

            var desks = await query.ToListAsync();

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

        group.MapGet("/availability", async (
            ClaimsPrincipal principal,
            DeskinationDbContext db,
            string? date = null,
            string? locationId = null,
            string? floorId = null) =>
        {
            var targetDate = string.IsNullOrWhiteSpace(date)
                ? BookingDomainRules.GetTodayUtcDateString()
                : date.Trim();

            IQueryable<Desk> deskQuery = db.Desks.AsNoTracking();
            if (!string.IsNullOrWhiteSpace(locationId))
            {
                var loc = locationId.Trim();
                deskQuery = deskQuery.Where(d => d.LocationId == loc);
            }

            if (!string.IsNullOrWhiteSpace(floorId))
            {
                var flr = floorId.Trim();
                deskQuery = deskQuery.Where(d => d.FloorId == flr);
            }

            var desks = await deskQuery.ToListAsync();
            if (desks.Count == 0)
            {
                return Results.Ok(new Dictionary<string, SlotAvailability>());
            }

            var caller = await principal.ResolveWorkspaceUserAsync(db);
            var deskIds = desks.Select(d => d.Id).ToList();

            var bookingsOnDate = await db.Bookings
                .AsNoTracking()
                .Where(b => deskIds.Contains(b.DeskId) && b.Date == targetDate)
                .ToListAsync();

            var bookingsByDesk = bookingsOnDate
                .GroupBy(b => b.DeskId, StringComparer.Ordinal)
                .ToDictionary(g => g.Key, g => (IEnumerable<Booking>)g, StringComparer.Ordinal);

            var result = new Dictionary<string, SlotAvailability>(desks.Count, StringComparer.Ordinal);
            foreach (var desk in desks)
            {
                var deskBookings = bookingsByDesk.TryGetValue(desk.Id, out var list) ? list : [];
                result[desk.Id] = BookingDomainRules.ComputeDeskAvailability(desk, deskBookings, caller);
            }

            return Results.Ok(result);
        })
        .WithName("GetDesksAvailability")
        .WithSummary("Computes SlotAvailability map keyed by desk ID for the requested date and optional location/floor.");

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

            var targetDate = string.IsNullOrWhiteSpace(date)
                ? BookingDomainRules.GetTodayUtcDateString()
                : date.Trim();
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
            var updateMap = (request.Updates ?? [])
                .GroupBy(u => u.Id, StringComparer.Ordinal)
                .ToDictionary(g => g.Key, g => g.Last(), StringComparer.Ordinal);

            if (updateMap.Count == 0)
            {
                return Results.Ok(Array.Empty<Desk>());
            }

            await using var tx = await db.Database.BeginTransactionAsync();

            var targetIds = updateMap.Keys.ToList();
            var existingById = (await db.Desks
                    .AsNoTracking()
                    .Where(d => targetIds.Contains(d.Id))
                    .ToListAsync())
                .ToDictionary(d => d.Id, StringComparer.Ordinal);

            var updatedDesks = new List<Desk>(existingById.Count);
            foreach (var (deskId, item) in updateMap)
            {
                if (!existingById.TryGetValue(deskId, out var existing))
                {
                    continue;
                }

                updatedDesks.Add(existing with
                {
                    Position = item.Position,
                    Rotation = item.Rotation ?? existing.Rotation
                });
            }

            if (updatedDesks.Count > 0)
            {
                db.Desks.UpdateRange(updatedDesks);
                await db.SaveChangesAsync();
            }

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

            var bookingsToRemove = await db.Bookings.Where(b => b.DeskId == id).ToListAsync();
            db.Bookings.RemoveRange(bookingsToRemove);
            db.Desks.Remove(existing);
            await db.SaveChangesAsync();

            return Results.NoContent();
        })
        .RequireAuthorization(AuthPolicies.AdminOnly)
        .WithName("DeleteDesk")
        .WithSummary("Deletes a desk from inventory and cascades deletion to associated bookings.");

        return app;
    }
}
