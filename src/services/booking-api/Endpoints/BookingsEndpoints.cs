using System.Security.Claims;
using BookingApi.Auth;
using BookingApi.Data;
using BookingApi.Models;
using Microsoft.EntityFrameworkCore;

namespace BookingApi.Endpoints;

public static class BookingsEndpoints
{
    public static IEndpointRouteBuilder MapBookingsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/bookings")
            .WithTags("Bookings")
            .RequireAuthorization(AuthPolicies.EmployeeOrAdmin);

        group.MapGet("/", async (
            DeskinationDbContext db,
            string? locationId = null,
            string? floorId = null,
            string? deskId = null,
            string? userId = null,
            string? date = null,
            string? startDate = null,
            string? endDate = null,
            BookingStatus? status = null,
            SlotType? slot = null,
            string? search = null) =>
        {
            var bookings = await db.Bookings.AsNoTracking().ToListAsync();

            if (!string.IsNullOrWhiteSpace(locationId))
            {
                bookings = bookings.Where(b => b.LocationId == locationId.Trim()).ToList();
            }

            if (!string.IsNullOrWhiteSpace(floorId))
            {
                bookings = bookings.Where(b => b.FloorId == floorId.Trim()).ToList();
            }

            if (!string.IsNullOrWhiteSpace(deskId))
            {
                bookings = bookings.Where(b => b.DeskId == deskId.Trim()).ToList();
            }

            if (!string.IsNullOrWhiteSpace(userId))
            {
                bookings = bookings.Where(b => b.UserId == userId.Trim()).ToList();
            }

            if (!string.IsNullOrWhiteSpace(date))
            {
                bookings = bookings.Where(b => b.Date == date.Trim()).ToList();
            }

            if (!string.IsNullOrWhiteSpace(startDate))
            {
                var start = startDate.Trim();
                bookings = bookings.Where(b => string.CompareOrdinal(b.Date, start) >= 0).ToList();
            }

            if (!string.IsNullOrWhiteSpace(endDate))
            {
                var end = endDate.Trim();
                bookings = bookings.Where(b => string.CompareOrdinal(b.Date, end) <= 0).ToList();
            }

            if (status.HasValue)
            {
                bookings = bookings.Where(b => b.Status == status.Value).ToList();
            }

            if (slot.HasValue)
            {
                bookings = bookings.Where(b => b.Slot == slot.Value).ToList();
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                bookings = bookings.Where(b =>
                    b.UserName.Contains(term, StringComparison.OrdinalIgnoreCase) ||
                    b.DeskCode.Contains(term, StringComparison.OrdinalIgnoreCase) ||
                    b.UserDepartment.Contains(term, StringComparison.OrdinalIgnoreCase) ||
                    b.LocationName.Contains(term, StringComparison.OrdinalIgnoreCase) ||
                    (b.ApprovalReason?.Contains(term, StringComparison.OrdinalIgnoreCase) ?? false)).ToList();
            }

            return Results.Ok(bookings);
        })
        .WithName("GetBookings")
        .WithSummary("Returns Booking[] records with optional query filters.");

        group.MapGet("/{id}", async (string id, DeskinationDbContext db) =>
        {
            var booking = await db.Bookings.AsNoTracking().FirstOrDefaultAsync(b => b.Id == id);
            return booking is not null
                ? Results.Ok(booking)
                : Results.NotFound(new { message = $"Booking '{id}' not found." });
        })
        .WithName("GetBookingById")
        .WithSummary("Returns a single Booking by ID.");

        group.MapPost("/", async (
            CreateBookingRequest request,
            ClaimsPrincipal principal,
            DeskinationDbContext db) =>
        {
            await using var tx = await db.Database.BeginTransactionAsync();

            var targetDesk = await db.Desks.AsNoTracking().FirstOrDefaultAsync(d => d.Id == request.DeskId);
            if (targetDesk is null)
            {
                return Results.NotFound(new BookingActionResponse(
                    Success: false,
                    Message: "Desk not found."
                ));
            }

            // 1. Maintenance Block
            if (targetDesk.Status == DeskStatus.Maintenance)
            {
                return Results.BadRequest(new BookingActionResponse(
                    Success: false,
                    Message: "This desk is currently undergoing maintenance and cannot be booked."
                ));
            }

            var caller = await principal.ResolveWorkspaceUserAsync(db);
            var targetDate = request.Date.Trim();

            var deskBookingsOnDate = await db.Bookings
                .AsNoTracking()
                .Where(b => b.DeskId == targetDesk.Id && b.Date == targetDate)
                .ToListAsync();

            var availability = BookingDomainRules.ComputeDeskAvailability(targetDesk, deskBookingsOnDate, caller);
            var isApprovalRequest = request.IsApprovalRequest == true ||
                                    ((availability.RequiresApproval == true) && caller.Role != Role.Admin);

            // 2. Desk Allocation Policy (Designated Desk check)
            if (availability.IsDesignatedToOther == true && caller.Role != Role.Admin && !isApprovalRequest)
            {
                return Results.Json(
                    new BookingActionResponse(
                        Success: false,
                        Message: $"This workstation is designated for {availability.DesignatedUser ?? "another colleague"}. You may submit an approval request or select an unreserved hot desk."
                    ),
                    statusCode: StatusCodes.Status403Forbidden);
            }

            // 3. Desk Slot Conflict Check
            var hasDeskConflict = deskBookingsOnDate
                .Where(b => BookingDomainRules.IsActiveBooking(b.Status))
                .Any(b => BookingDomainRules.SlotsOverlap(b.Slot, request.Slot));

            if (hasDeskConflict)
            {
                var slotLabel = request.Slot switch
                {
                    SlotType.Morning => "morning period",
                    SlotType.Afternoon => "afternoon period",
                    _ => "full day booking"
                };

                return Results.Conflict(new BookingActionResponse(
                    Success: false,
                    Message: $"Desk is already reserved or unavailable for the {slotLabel}."
                ));
            }

            // 4. User Double-Booking Prevention
            var userBookingsOnDate = await db.Bookings
                .AsNoTracking()
                .Where(b => b.UserId == caller.Id && b.Date == targetDate)
                .ToListAsync();

            var userConflict = userBookingsOnDate
                .Where(b => BookingDomainRules.IsActiveBooking(b.Status))
                .FirstOrDefault(b => BookingDomainRules.SlotsOverlap(b.Slot, request.Slot));

            if (userConflict is not null)
            {
                return Results.Conflict(new BookingActionResponse(
                    Success: false,
                    Message: $"You already have an active booking or pending request on this date ({userConflict.DeskCode})."
                ));
            }

            var location = await db.Locations
                .AsNoTracking()
                .FirstOrDefaultAsync(l => l.Id == targetDesk.LocationId);
            var floor = location?.Floors.FirstOrDefault(f => f.Id == targetDesk.FloorId);

            var initialStatus = isApprovalRequest && caller.Role != Role.Admin
                ? BookingStatus.PendingApproval
                : BookingStatus.Confirmed;

            var prefix = initialStatus == BookingStatus.PendingApproval ? "req" : "bkg";
            var bookingId = $"{prefix}-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{Guid.NewGuid().ToString("N")[..4]}";
            var justification = request.ApprovalReason ?? request.Notes;

            var newBooking = new Booking(
                Id: bookingId,
                DeskId: targetDesk.Id,
                DeskCode: targetDesk.Code,
                DeskName: targetDesk.Name,
                LocationId: targetDesk.LocationId,
                LocationName: location?.Name ?? "Main Office",
                FloorId: targetDesk.FloorId,
                FloorName: floor?.Name ?? "Level 1",
                UserId: caller.Id,
                UserName: caller.Name,
                UserEmail: caller.Email,
                UserDepartment: caller.Department,
                Date: targetDate,
                Slot: request.Slot,
                Status: initialStatus,
                CreatedAt: DateTimeOffset.UtcNow.ToString("O"),
                Notes: request.Notes ?? request.ApprovalReason,
                ApprovalReason: initialStatus == BookingStatus.PendingApproval
                    ? (justification ?? "Standard reservation request for restricted workstation.")
                    : request.ApprovalReason
            );

            db.Bookings.Add(newBooking);
            await db.SaveChangesAsync();
            await tx.CommitAsync();

            var slotDisplay = request.Slot switch
            {
                SlotType.Morning => "morning",
                SlotType.Afternoon => "afternoon",
                _ => "full day"
            };

            var message = initialStatus == BookingStatus.PendingApproval
                ? $"Reservation request for {targetDesk.Code} submitted to office management! You will be notified once reviewed."
                : $"Successfully booked {targetDesk.Code} for {slotDisplay}!";

            return Results.Created(
                $"/api/bookings/{newBooking.Id}",
                new BookingActionResponse(Success: true, Message: message, Booking: newBooking));
        })
        .WithName("CreateBooking")
        .WithSummary("Creates an instant desk booking or an approval request inside a database transaction.");

        group.MapPut("/{id}", async (
            string id,
            UpdateBookingRequest request,
            ClaimsPrincipal principal,
            DeskinationDbContext db) =>
        {
            await using var tx = await db.Database.BeginTransactionAsync();

            var existing = await db.Bookings.FindAsync(id);
            if (existing is null)
            {
                return Results.NotFound(new { message = $"Booking '{id}' not found." });
            }

            var caller = await principal.ResolveWorkspaceUserAsync(db);
            if (caller.Role != Role.Admin && !string.Equals(existing.UserId, caller.Id, StringComparison.OrdinalIgnoreCase))
            {
                return Results.Forbid();
            }

            var targetSlot = request.Slot ?? existing.Slot;
            if (targetSlot != existing.Slot && BookingDomainRules.IsActiveBooking(existing.Status))
            {
                var otherDeskBookings = await db.Bookings
                    .AsNoTracking()
                    .Where(b => b.DeskId == existing.DeskId && b.Date == existing.Date && b.Id != existing.Id)
                    .ToListAsync();

                var conflict = otherDeskBookings
                    .Where(b => BookingDomainRules.IsActiveBooking(b.Status))
                    .Any(b => BookingDomainRules.SlotsOverlap(b.Slot, targetSlot));

                if (conflict)
                {
                    return Results.Conflict(new { message = "Requested time slot conflicts with an existing booking on this desk." });
                }
            }

            var updated = existing with
            {
                Slot = targetSlot,
                Notes = request.Notes ?? existing.Notes
            };

            db.Entry(existing).State = EntityState.Detached;
            db.Bookings.Update(updated);
            await db.SaveChangesAsync();
            await tx.CommitAsync();

            return Results.Ok(updated);
        })
        .WithName("UpdateBooking")
        .WithSummary("Updates an existing booking's slot or notes.");

        group.MapDelete("/{id}", async (
            string id,
            string? reason,
            ClaimsPrincipal principal,
            DeskinationDbContext db) =>
        {
            return await CancelBookingInternalAsync(id, reason, principal, db);
        })
        .WithName("DeleteCancelBooking")
        .WithSummary("Cancels an active reservation or withdraws a pending request.");

        group.MapPost("/{id}/cancel", async (
            string id,
            CancelBookingRequest? request,
            string? reason,
            ClaimsPrincipal principal,
            DeskinationDbContext db) =>
        {
            var effectiveReason = request?.Reason ?? reason;
            return await CancelBookingInternalAsync(id, effectiveReason, principal, db);
        })
        .WithName("CancelBooking")
        .WithSummary("Cancels an active reservation or withdraws a pending request.");

        group.MapPost("/{id}/check-in", async (
            string id,
            ClaimsPrincipal principal,
            DeskinationDbContext db) =>
        {
            var existing = await db.Bookings.FindAsync(id);
            if (existing is null)
            {
                return Results.NotFound(new { message = $"Booking '{id}' not found." });
            }

            var caller = await principal.ResolveWorkspaceUserAsync(db);
            if (caller.Role != Role.Admin && !string.Equals(existing.UserId, caller.Id, StringComparison.OrdinalIgnoreCase))
            {
                return Results.Forbid();
            }

            var updated = existing with
            {
                Status = BookingStatus.CheckedIn,
                CheckInAt = DateTimeOffset.UtcNow.ToString("O")
            };

            db.Entry(existing).State = EntityState.Detached;
            db.Bookings.Update(updated);
            await db.SaveChangesAsync();

            return Results.Ok(updated);
        })
        .WithName("CheckInBooking")
        .WithSummary("Checks in to a confirmed booking.");

        group.MapPost("/{id}/approve", async (
            string id,
            ApproveBookingRequest? request,
            ClaimsPrincipal principal,
            DeskinationDbContext db) =>
        {
            var existing = await db.Bookings.FindAsync(id);
            if (existing is null)
            {
                return Results.NotFound(new { message = $"Booking '{id}' not found." });
            }

            var caller = await principal.ResolveWorkspaceUserAsync(db);
            var updated = existing with
            {
                Status = BookingStatus.Confirmed,
                ReviewedBy = caller.Name,
                ReviewedAt = DateTimeOffset.UtcNow.ToString("O"),
                ReviewNotes = !string.IsNullOrWhiteSpace(request?.Note)
                    ? request.Note.Trim()
                    : "Approved by office manager"
            };

            db.Entry(existing).State = EntityState.Detached;
            db.Bookings.Update(updated);
            await db.SaveChangesAsync();

            return Results.Ok(updated);
        })
        .RequireAuthorization(AuthPolicies.AdminOnly)
        .WithName("ApproveBookingRequest")
        .WithSummary("Manager approves a pending_approval reservation request.");

        group.MapPost("/{id}/reject", async (
            string id,
            RejectBookingRequest? request,
            ClaimsPrincipal principal,
            DeskinationDbContext db) =>
        {
            var existing = await db.Bookings.FindAsync(id);
            if (existing is null)
            {
                return Results.NotFound(new { message = $"Booking '{id}' not found." });
            }

            var caller = await principal.ResolveWorkspaceUserAsync(db);
            var updated = existing with
            {
                Status = BookingStatus.Rejected,
                ReviewedBy = caller.Name,
                ReviewedAt = DateTimeOffset.UtcNow.ToString("O"),
                ReviewNotes = !string.IsNullOrWhiteSpace(request?.Reason)
                    ? request.Reason.Trim()
                    : "Declined by office manager"
            };

            db.Entry(existing).State = EntityState.Detached;
            db.Bookings.Update(updated);
            await db.SaveChangesAsync();

            return Results.Ok(updated);
        })
        .RequireAuthorization(AuthPolicies.AdminOnly)
        .WithName("RejectBookingRequest")
        .WithSummary("Manager declines a pending_approval reservation request.");

        return app;
    }

    private static async Task<IResult> CancelBookingInternalAsync(
        string id,
        string? reason,
        ClaimsPrincipal principal,
        DeskinationDbContext db)
    {
        var existing = await db.Bookings.FindAsync(id);
        if (existing is null)
        {
            return Results.NotFound(new { message = $"Booking '{id}' not found." });
        }

        var caller = await principal.ResolveWorkspaceUserAsync(db);
        if (caller.Role != Role.Admin && !string.Equals(existing.UserId, caller.Id, StringComparison.OrdinalIgnoreCase))
        {
            return Results.Forbid();
        }

        var updatedNotes = !string.IsNullOrWhiteSpace(reason)
            ? $"{(!string.IsNullOrWhiteSpace(existing.Notes) ? existing.Notes + " | " : string.Empty)}Cancellation: {reason.Trim()}"
            : existing.Notes;

        var updated = existing with
        {
            Status = BookingStatus.Cancelled,
            CancelledAt = DateTimeOffset.UtcNow.ToString("O"),
            Notes = updatedNotes
        };

        db.Entry(existing).State = EntityState.Detached;
        db.Bookings.Update(updated);
        await db.SaveChangesAsync();

        return Results.Ok(updated);
    }
}
