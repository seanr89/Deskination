using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using BookingApi.Data;
using BookingApi.Models;
using Xunit;

namespace BookingApi.Tests;

public sealed class BookingApiIntegrationTests
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DictionaryKeyPolicy = JsonNamingPolicy.CamelCase
    };

    [Fact]
    public async Task GetHealth_ReturnsHealthyStatusAndSeededCounts()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/health");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("healthy", payload.GetProperty("status").GetString());
        Assert.Equal("booking-api", payload.GetProperty("service").GetString());
        Assert.Equal("officewho-53cec", payload.GetProperty("firebaseProjectId").GetString());

        var counts = payload.GetProperty("counts");
        Assert.Equal(DeskinationSeeder.InitialUsers.Count, counts.GetProperty("users").GetInt32());
        Assert.Equal(DeskinationSeeder.InitialLocations.Count, counts.GetProperty("locations").GetInt32());
        Assert.Equal(DeskinationSeeder.InitialDesks.Count, counts.GetProperty("desks").GetInt32());
        Assert.Equal(DeskinationSeeder.InitialBookings.Count, counts.GetProperty("bookings").GetInt32());
    }

    [Theory]
    [InlineData("/api/locations")]
    [InlineData("/api/desks")]
    [InlineData("/api/bookings")]
    [InlineData("/api/users")]
    [InlineData("/api/users/me")]
    public async Task ProtectedEndpoints_WhenUnauthenticated_Return401Unauthorized(string endpoint)
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync(endpoint);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task PutUsersMe_UpsertsAndReturnsCanonicalUserProfile()
    {
        await using var factory = new TestWebApplicationFactory();

        // 1. Existing seeded user (Sarah Chen)
        using var sarahClient = factory.CreateAuthenticatedClient(
            email: "sarah.chen@acme-corp.internal",
            role: "employee",
            uid: "uid-sarah-123");

        var sarahUpsert = new UpsertUserRequest(
            Name: "Sarah Chen",
            Email: "sarah.chen@acme-corp.internal",
            Department: "Frontend Engineering",
            JobTitle: "Senior Staff Engineer",
            AvatarColor: "bg-emerald-600"
        );

        var sarahResponse = await sarahClient.PutAsJsonAsync("/api/users/me", sarahUpsert, JsonOptions);
        Assert.Equal(HttpStatusCode.OK, sarahResponse.StatusCode);

        var sarahProfile = await sarahResponse.Content.ReadFromJsonAsync<User>(JsonOptions);
        Assert.NotNull(sarahProfile);
        Assert.Equal("usr-sarah", sarahProfile.Id);
        Assert.Equal("Sarah Chen", sarahProfile.Name);
        Assert.Equal("sarah.chen@acme-corp.internal", sarahProfile.Email);
        Assert.Equal(Role.Employee, sarahProfile.Role);
        Assert.Equal("Frontend Engineering", sarahProfile.Department);

        // 2. Brand-new Firebase user not in seed data
        using var newUserClient = factory.CreateAuthenticatedClient(
            email: "alex.rivera@acme-corp.internal",
            role: "employee",
            uid: "firebase-alex-999",
            displayName: "Alex Rivera");

        var newUserUpsert = new UpsertUserRequest(
            Name: "Alex Rivera",
            Email: "alex.rivera@acme-corp.internal",
            Department: "Cloud Platform",
            JobTitle: "Site Reliability Engineer",
            AvatarColor: "bg-cyan-600"
        );

        var newUserResponse = await newUserClient.PutAsJsonAsync("/api/users/me", newUserUpsert, JsonOptions);
        Assert.Equal(HttpStatusCode.OK, newUserResponse.StatusCode);

        var newUserProfile = await newUserResponse.Content.ReadFromJsonAsync<User>(JsonOptions);
        Assert.NotNull(newUserProfile);
        Assert.Equal("usr-firebase-alex-999", newUserProfile.Id);
        Assert.Equal("Alex Rivera", newUserProfile.Name);
        Assert.Equal("alex.rivera@acme-corp.internal", newUserProfile.Email);
        Assert.Equal(Role.Employee, newUserProfile.Role);
        Assert.Equal("Cloud Platform", newUserProfile.Department);
    }

    [Fact]
    public async Task GetWorkspaceCollections_ReturnsSeededDataWithCamelCaseAndSnakeCaseEnums()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateAuthenticatedClient(
            email: "sarah.chen@acme-corp.internal",
            role: "employee");

        // 1. GET /api/locations
        var locationsRes = await client.GetAsync("/api/locations");
        Assert.Equal(HttpStatusCode.OK, locationsRes.StatusCode);
        var locationsJson = await locationsRes.Content.ReadAsStringAsync();
        Assert.Contains("\"advanceBookingDaysLimit\":", locationsJson);
        Assert.Contains("\"locationId\":\"loc-london\"", locationsJson);
        var locations = JsonSerializer.Deserialize<List<Location>>(locationsJson, JsonOptions);
        Assert.NotNull(locations);
        Assert.Equal(3, locations.Count);

        // 2. GET /api/desks
        var desksRes = await client.GetAsync("/api/desks");
        Assert.Equal(HttpStatusCode.OK, desksRes.StatusCode);
        var desksJson = await desksRes.Content.ReadAsStringAsync();
        Assert.Contains("\"deskType\":\"quiet_booth\"", desksJson);
        Assert.Contains("\"deskType\":\"dual_screen\"", desksJson);
        Assert.Contains("\"deskType\":\"window_view\"", desksJson);
        Assert.Contains("\"allocationType\":\"requires_approval\"", desksJson);
        Assert.Contains("\"allocationType\":\"designated\"", desksJson);
        var desks = JsonSerializer.Deserialize<List<Desk>>(desksJson, JsonOptions);
        Assert.NotNull(desks);
        Assert.Equal(DeskinationSeeder.InitialDesks.Count, desks.Count);

        // 3. GET /api/bookings
        var bookingsRes = await client.GetAsync("/api/bookings");
        Assert.Equal(HttpStatusCode.OK, bookingsRes.StatusCode);
        var bookingsJson = await bookingsRes.Content.ReadAsStringAsync();
        Assert.Contains("\"slot\":\"full_day\"", bookingsJson);
        Assert.Contains("\"slot\":\"morning\"", bookingsJson);
        Assert.Contains("\"slot\":\"afternoon\"", bookingsJson);
        Assert.Contains("\"status\":\"checked_in\"", bookingsJson);
        Assert.Contains("\"status\":\"pending_approval\"", bookingsJson);
        Assert.Contains("\"status\":\"confirmed\"", bookingsJson);
        var bookings = JsonSerializer.Deserialize<List<Booking>>(bookingsJson, JsonOptions);
        Assert.NotNull(bookings);
        Assert.Equal(DeskinationSeeder.InitialBookings.Count, bookings.Count);

        // 4. GET /api/users
        var usersRes = await client.GetAsync("/api/users");
        Assert.Equal(HttpStatusCode.OK, usersRes.StatusCode);
        var usersJson = await usersRes.Content.ReadAsStringAsync();
        Assert.Contains("\"role\":\"employee\"", usersJson);
        Assert.Contains("\"role\":\"admin\"", usersJson);
        var users = JsonSerializer.Deserialize<List<User>>(usersJson, JsonOptions);
        Assert.NotNull(users);
        Assert.Equal(DeskinationSeeder.InitialUsers.Count, users.Count);
    }

    [Fact]
    public async Task PostBookings_EnforcesSlotConflictRulesAndRequiresApprovalPolicy()
    {
        await using var factory = new TestWebApplicationFactory();

        using var sarahClient = factory.CreateAuthenticatedClient(
            email: "sarah.chen@acme-corp.internal",
            role: "employee");
        using var marcusClient = factory.CreateAuthenticatedClient(
            email: "marcus.vance@acme-corp.internal",
            role: "employee");
        using var priyaClient = factory.CreateAuthenticatedClient(
            email: "priya.patel@acme-corp.internal",
            role: "employee");

        const string testDate = "2026-11-12";
        const string unreservedDeskId = "desk-ldn-401";

        // 1. Morning booking on unreserved desk by Sarah succeeds with Confirmed status
        var morningBookingReq = new CreateBookingRequest(
            DeskId: unreservedDeskId,
            Date: testDate,
            Slot: SlotType.Morning,
            Notes: "Morning deep focus session"
        );
        var morningRes = await sarahClient.PostAsJsonAsync("/api/bookings", morningBookingReq, JsonOptions);
        Assert.Equal(HttpStatusCode.Created, morningRes.StatusCode);

        var morningAction = await morningRes.Content.ReadFromJsonAsync<BookingActionResponse>(JsonOptions);
        Assert.NotNull(morningAction);
        Assert.True(morningAction.Success);
        Assert.NotNull(morningAction.Booking);
        Assert.Equal(BookingStatus.Confirmed, morningAction.Booking.Status);
        Assert.Equal(SlotType.Morning, morningAction.Booking.Slot);

        // 2. Full-day booking on the same desk & date by Marcus conflicts with Morning (409 Conflict)
        var fullDayConflictReq = new CreateBookingRequest(
            DeskId: unreservedDeskId,
            Date: testDate,
            Slot: SlotType.FullDay
        );
        var fullDayConflictRes = await marcusClient.PostAsJsonAsync("/api/bookings", fullDayConflictReq, JsonOptions);
        Assert.Equal(HttpStatusCode.Conflict, fullDayConflictRes.StatusCode);

        // 3. Afternoon booking on the same desk & date by Marcus coexists with Morning (201 Created)
        var afternoonBookingReq = new CreateBookingRequest(
            DeskId: unreservedDeskId,
            Date: testDate,
            Slot: SlotType.Afternoon,
            Notes: "Afternoon design pairing"
        );
        var afternoonRes = await marcusClient.PostAsJsonAsync("/api/bookings", afternoonBookingReq, JsonOptions);
        Assert.Equal(HttpStatusCode.Created, afternoonRes.StatusCode);

        var afternoonAction = await afternoonRes.Content.ReadFromJsonAsync<BookingActionResponse>(JsonOptions);
        Assert.NotNull(afternoonAction?.Booking);
        Assert.Equal(BookingStatus.Confirmed, afternoonAction.Booking.Status);
        Assert.Equal(SlotType.Afternoon, afternoonAction.Booking.Slot);

        // 4. Booking a requires_approval desk (desk-ldn-420) by an employee creates a pending_approval booking
        var approvalDeskReq = new CreateBookingRequest(
            DeskId: "desk-ldn-420",
            Date: testDate,
            Slot: SlotType.FullDay,
            ApprovalReason: "Hosting architecture review with external partner"
        );
        var approvalRes = await priyaClient.PostAsJsonAsync("/api/bookings", approvalDeskReq, JsonOptions);
        Assert.Equal(HttpStatusCode.Created, approvalRes.StatusCode);

        var approvalAction = await approvalRes.Content.ReadFromJsonAsync<BookingActionResponse>(JsonOptions);
        Assert.NotNull(approvalAction?.Booking);
        Assert.Equal(BookingStatus.PendingApproval, approvalAction.Booking.Status);
        Assert.Equal("Hosting architecture review with external partner", approvalAction.Booking.ApprovalReason);
    }

    [Fact]
    public async Task ApproveAndRejectBookings_EnforceAdminOnlyPolicyAndTransitionStatus()
    {
        await using var factory = new TestWebApplicationFactory();

        using var employeeClient = factory.CreateAuthenticatedClient(
            email: "sarah.chen@acme-corp.internal",
            role: "employee");
        using var adminClient = factory.CreateAuthenticatedClient(
            email: "elena.rostova@acme-corp.internal",
            role: "admin");

        // 1. Employee attempting to approve or reject seeded pending booking "bkg-pending-1" gets 403 Forbidden
        var forbiddenApprove = await employeeClient.PostAsJsonAsync(
            "/api/bookings/bkg-pending-1/approve",
            new ApproveBookingRequest("Employee self-approve attempt"),
            JsonOptions);
        Assert.Equal(HttpStatusCode.Forbidden, forbiddenApprove.StatusCode);

        var forbiddenReject = await employeeClient.PostAsJsonAsync(
            "/api/bookings/bkg-pending-1/reject",
            new RejectBookingRequest("Employee reject attempt"),
            JsonOptions);
        Assert.Equal(HttpStatusCode.Forbidden, forbiddenReject.StatusCode);

        // 2. Admin approves "bkg-pending-1" -> 200 OK and Status = Confirmed
        var adminApprove = await adminClient.PostAsJsonAsync(
            "/api/bookings/bkg-pending-1/approve",
            new ApproveBookingRequest("Approved for client design review"),
            JsonOptions);
        Assert.Equal(HttpStatusCode.OK, adminApprove.StatusCode);

        var approvedBooking = await adminApprove.Content.ReadFromJsonAsync<Booking>(JsonOptions);
        Assert.NotNull(approvedBooking);
        Assert.Equal(BookingStatus.Confirmed, approvedBooking.Status);
        Assert.Equal("Elena Rostova", approvedBooking.ReviewedBy);
        Assert.Equal("Approved for client design review", approvedBooking.ReviewNotes);
        Assert.NotNull(approvedBooking.ReviewedAt);

        // 3. Create another pending request and have Admin reject it -> 200 OK and Status = Rejected
        var newPendingRes = await employeeClient.PostAsJsonAsync(
            "/api/bookings",
            new CreateBookingRequest(
                DeskId: "desk-ldn-422",
                Date: "2026-11-18",
                Slot: SlotType.FullDay,
                ApprovalReason: "Need 5K2K display for demo"
            ),
            JsonOptions);
        Assert.Equal(HttpStatusCode.Created, newPendingRes.StatusCode);
        var createdPending = (await newPendingRes.Content.ReadFromJsonAsync<BookingActionResponse>(JsonOptions))!.Booking!;
        Assert.Equal(BookingStatus.PendingApproval, createdPending.Status);

        var adminReject = await adminClient.PostAsJsonAsync(
            $"/api/bookings/{createdPending.Id}/reject",
            new RejectBookingRequest("Reserved for visiting executive team"),
            JsonOptions);
        Assert.Equal(HttpStatusCode.OK, adminReject.StatusCode);

        var rejectedBooking = await adminReject.Content.ReadFromJsonAsync<Booking>(JsonOptions);
        Assert.NotNull(rejectedBooking);
        Assert.Equal(BookingStatus.Rejected, rejectedBooking.Status);
        Assert.Equal("Elena Rostova", rejectedBooking.ReviewedBy);
        Assert.Equal("Reserved for visiting executive team", rejectedBooking.ReviewNotes);
        Assert.NotNull(rejectedBooking.ReviewedAt);
    }

    [Fact]
    public async Task CheckInAndCancelBooking_TransitionBookingStatusesProperly()
    {
        await using var factory = new TestWebApplicationFactory();
        using var sarahClient = factory.CreateAuthenticatedClient(
            email: "sarah.chen@acme-corp.internal",
            role: "employee");

        // Create a new booking for Sarah
        var createRes = await sarahClient.PostAsJsonAsync(
            "/api/bookings",
            new CreateBookingRequest(
                DeskId: "desk-ldn-403",
                Date: "2026-11-19",
                Slot: SlotType.FullDay,
                Notes: "Component library accessibility audit"
            ),
            JsonOptions);
        Assert.Equal(HttpStatusCode.Created, createRes.StatusCode);
        var createdBooking = (await createRes.Content.ReadFromJsonAsync<BookingActionResponse>(JsonOptions))!.Booking!;
        Assert.Equal(BookingStatus.Confirmed, createdBooking.Status);

        // 1. Check-in to the booking -> Status = CheckedIn, CheckInAt populated
        var checkInRes = await sarahClient.PostAsync($"/api/bookings/{createdBooking.Id}/check-in", null);
        Assert.Equal(HttpStatusCode.OK, checkInRes.StatusCode);

        var checkedInBooking = await checkInRes.Content.ReadFromJsonAsync<Booking>(JsonOptions);
        Assert.NotNull(checkedInBooking);
        Assert.Equal(BookingStatus.CheckedIn, checkedInBooking.Status);
        Assert.False(string.IsNullOrWhiteSpace(checkedInBooking.CheckInAt));

        // 2. Cancel the booking -> Status = Cancelled, CancelledAt populated, reason recorded
        var cancelRes = await sarahClient.PostAsJsonAsync(
            $"/api/bookings/{createdBooking.Id}/cancel",
            new CancelBookingRequest("Leaving early for dentist appointment"),
            JsonOptions);
        Assert.Equal(HttpStatusCode.OK, cancelRes.StatusCode);

        var cancelledBooking = await cancelRes.Content.ReadFromJsonAsync<Booking>(JsonOptions);
        Assert.NotNull(cancelledBooking);
        Assert.Equal(BookingStatus.Cancelled, cancelledBooking.Status);
        Assert.False(string.IsNullOrWhiteSpace(cancelledBooking.CancelledAt));
        Assert.Contains("Leaving early for dentist appointment", cancelledBooking.Notes);
    }
}
