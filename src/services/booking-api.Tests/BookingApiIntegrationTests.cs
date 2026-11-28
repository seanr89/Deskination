using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using BookingApi.Data;
using BookingApi.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
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

    [Fact]
    public async Task CorsPolicy_AllowsConfiguredDefaultOriginsAndRejectsUnlistedOrigins()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        using var allowedRequest = new HttpRequestMessage(HttpMethod.Get, "/api/health");
        allowedRequest.Headers.Add("Origin", "http://localhost:3000");

        var allowedResponse = await client.SendAsync(allowedRequest);
        Assert.Equal(HttpStatusCode.OK, allowedResponse.StatusCode);
        Assert.True(allowedResponse.Headers.TryGetValues("Access-Control-Allow-Origin", out var allowedHeaders));
        Assert.Contains("http://localhost:3000", allowedHeaders);

        using var unlistedRequest = new HttpRequestMessage(HttpMethod.Get, "/api/health");
        unlistedRequest.Headers.Add("Origin", "https://untrusted.example.com");

        var unlistedResponse = await client.SendAsync(unlistedRequest);
        Assert.Equal(HttpStatusCode.OK, unlistedResponse.StatusCode);
        Assert.False(unlistedResponse.Headers.Contains("Access-Control-Allow-Origin"));
    }

    [Fact]
    public async Task CorsPolicy_WhenOverriddenInConfiguration_AllowsConfiguredOriginsAndRejectsUnlisted()
    {
        await using var baseFactory = new TestWebApplicationFactory();
        await using var factory = baseFactory.WithWebHostBuilder(builder =>
            builder.UseSetting(
                "Cors:AllowedOrigins",
                "https://deskination.azurestaticapps.net, https://staging.azurestaticapps.net/"));
        using var client = factory.CreateClient();

        using var allowedRequest = new HttpRequestMessage(HttpMethod.Get, "/api/health");
        allowedRequest.Headers.Add("Origin", "https://deskination.azurestaticapps.net");

        var allowedResponse = await client.SendAsync(allowedRequest);
        Assert.Equal(HttpStatusCode.OK, allowedResponse.StatusCode);
        Assert.True(allowedResponse.Headers.TryGetValues("Access-Control-Allow-Origin", out var allowedHeaders));
        Assert.Contains("https://deskination.azurestaticapps.net", allowedHeaders);

        using var preflightRequest = new HttpRequestMessage(HttpMethod.Options, "/api/health");
        preflightRequest.Headers.Add("Origin", "https://staging.azurestaticapps.net");
        preflightRequest.Headers.Add("Access-Control-Request-Method", "GET");

        var preflightResponse = await client.SendAsync(preflightRequest);
        Assert.Equal(HttpStatusCode.NoContent, preflightResponse.StatusCode);
        Assert.True(preflightResponse.Headers.TryGetValues("Access-Control-Allow-Origin", out var preflightHeaders));
        Assert.Contains("https://staging.azurestaticapps.net", preflightHeaders);

        using var unlistedRequest = new HttpRequestMessage(HttpMethod.Get, "/api/health");
        unlistedRequest.Headers.Add("Origin", "https://untrusted.example.com");

        var unlistedResponse = await client.SendAsync(unlistedRequest);
        Assert.Equal(HttpStatusCode.OK, unlistedResponse.StatusCode);
        Assert.False(unlistedResponse.Headers.Contains("Access-Control-Allow-Origin"));
    }

    [Fact]
    public async Task ForwardedHeaders_WithReverseProxyHeaders_AreAcceptedByHealthEndpoint()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/health");
        request.Headers.Add("X-Forwarded-Proto", "https");
        request.Headers.Add("X-Forwarded-For", "203.0.113.10");

        var response = await client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("healthy", payload.GetProperty("status").GetString());
    }

    [Fact]
    public async Task LocationOccupancyAndColleagues_ExcludeRejectedAndCancelledBookings_AndDefaultToTodayUtc()
    {
        await using var factory = new TestWebApplicationFactory();
        using var employeeClient = factory.CreateAuthenticatedClient(
            email: "sarah.chen@acme-corp.internal",
            role: "employee");
        using var adminClient = factory.CreateAuthenticatedClient(
            email: "elena.rostova@acme-corp.internal",
            role: "admin");

        const string testDate = "2026-12-01";

        // 1. Create a pending approval request on desk-ldn-420 and reject it
        var pendingRes = await employeeClient.PostAsJsonAsync(
            "/api/bookings",
            new CreateBookingRequest(
                DeskId: "desk-ldn-420",
                Date: testDate,
                Slot: SlotType.FullDay,
                ApprovalReason: "Rejected booking occupancy check"
            ),
            JsonOptions);
        Assert.Equal(HttpStatusCode.Created, pendingRes.StatusCode);
        var pendingBooking = (await pendingRes.Content.ReadFromJsonAsync<BookingActionResponse>(JsonOptions))!.Booking!;

        var rejectRes = await adminClient.PostAsJsonAsync(
            $"/api/bookings/{pendingBooking.Id}/reject",
            new RejectBookingRequest("Not available"),
            JsonOptions);
        Assert.Equal(HttpStatusCode.OK, rejectRes.StatusCode);

        // 2. Occupancy and colleagues on testDate must exclude the rejected booking
        var occupancyRes = await employeeClient.GetFromJsonAsync<LocationOccupancyResponse>(
            $"/api/locations/loc-london/occupancy?date={testDate}",
            JsonOptions);
        Assert.NotNull(occupancyRes);
        Assert.Equal(0, occupancyRes.Booked);
        Assert.Equal(0, occupancyRes.Rate);

        var colleaguesRes = await employeeClient.GetFromJsonAsync<List<Booking>>(
            $"/api/locations/loc-london/colleagues?date={testDate}",
            JsonOptions);
        Assert.NotNull(colleaguesRes);
        Assert.Empty(colleaguesRes);

        // 3. When date is omitted, endpoints use today's UTC date rather than hardcoded "2026-10-25"
        var todayUtc = BookingDomainRules.GetTodayUtcDateString();
        if (todayUtc != "2026-10-25")
        {
            var defaultColleagues = await employeeClient.GetFromJsonAsync<List<Booking>>(
                "/api/locations/loc-london/colleagues",
                JsonOptions);
            Assert.NotNull(defaultColleagues);
            Assert.DoesNotContain(defaultColleagues, b => b.Date == "2026-10-25");

            var defaultAvail = await employeeClient.GetFromJsonAsync<SlotAvailability>(
                "/api/desks/desk-ldn-401/availability",
                JsonOptions);
            Assert.NotNull(defaultAvail);
            Assert.True(defaultAvail.FullDay);
        }
    }

    [Fact]
    public async Task PutUsersMe_PreventsRoleElevationWhenEmployeeSpoofsAdminEmailOrId()
    {
        await using var factory = new TestWebApplicationFactory();
        using var attackerClient = factory.CreateAuthenticatedClient(
            email: "attacker.user@acme-corp.internal",
            role: "employee",
            uid: "uid-attacker-777",
            displayName: "Attacker User");

        // Attempt to match seeded admin Elena Rostova by supplying her Id, Email, and Admin role in the body
        var spoofedRequest = new UpsertUserRequest(
            Id: "usr-admin-elena",
            Name: "Spoofed Admin",
            Email: "elena.rostova@acme-corp.internal",
            Role: Role.Admin,
            Department: "Workplace Operations",
            JobTitle: "Fake Admin"
        );

        var response = await attackerClient.PutAsJsonAsync("/api/users/me", spoofedRequest, JsonOptions);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var profile = await response.Content.ReadFromJsonAsync<User>(JsonOptions);
        Assert.NotNull(profile);
        Assert.Equal("usr-uid-attacker-777", profile.Id);
        Assert.Equal("attacker.user@acme-corp.internal", profile.Email);
        Assert.Equal(Role.Employee, profile.Role);

        // Verify seeded admin Elena Rostova was not overwritten
        var elenaRes = await attackerClient.GetFromJsonAsync<User>("/api/users/usr-admin-elena", JsonOptions);
        Assert.NotNull(elenaRes);
        Assert.Equal("Elena Rostova", elenaRes.Name);
        Assert.Equal("elena.rostova@acme-corp.internal", elenaRes.Email);
        Assert.Equal(Role.Admin, elenaRes.Role);
    }

    [Fact]
    public async Task BookingStatusTransitions_EnforceValidSourceStatusesAndApproveSlotConflicts()
    {
        await using var factory = new TestWebApplicationFactory();
        using var sarahClient = factory.CreateAuthenticatedClient(
            email: "sarah.chen@acme-corp.internal",
            role: "employee");
        using var marcusClient = factory.CreateAuthenticatedClient(
            email: "marcus.vance@acme-corp.internal",
            role: "employee");
        using var adminClient = factory.CreateAuthenticatedClient(
            email: "elena.rostova@acme-corp.internal",
            role: "admin");

        const string testDate = "2026-12-03";

        // 1. Create a pending_approval request (Morning on desk-ldn-420)
        var pendingCreate = await sarahClient.PostAsJsonAsync(
            "/api/bookings",
            new CreateBookingRequest(
                DeskId: "desk-ldn-420",
                Date: testDate,
                Slot: SlotType.Morning,
                ApprovalReason: "Morning workshop"
            ),
            JsonOptions);
        Assert.Equal(HttpStatusCode.Created, pendingCreate.StatusCode);
        var pendingBooking = (await pendingCreate.Content.ReadFromJsonAsync<BookingActionResponse>(JsonOptions))!.Booking!;

        // Cannot check-in to a pending_approval booking
        var invalidPendingCheckIn = await sarahClient.PostAsync($"/api/bookings/{pendingBooking.Id}/check-in", null);
        Assert.Equal(HttpStatusCode.BadRequest, invalidPendingCheckIn.StatusCode);

        // 2. Reject the pending booking, then verify re-rejecting, approving, cancelling, or checking in fails with 400
        var rejectRes = await adminClient.PostAsJsonAsync(
            $"/api/bookings/{pendingBooking.Id}/reject",
            new RejectBookingRequest("Declined"),
            JsonOptions);
        Assert.Equal(HttpStatusCode.OK, rejectRes.StatusCode);

        var reRejectRes = await adminClient.PostAsJsonAsync(
            $"/api/bookings/{pendingBooking.Id}/reject",
            new RejectBookingRequest("Declined again"),
            JsonOptions);
        Assert.Equal(HttpStatusCode.BadRequest, reRejectRes.StatusCode);

        var approveRejectedRes = await adminClient.PostAsJsonAsync(
            $"/api/bookings/{pendingBooking.Id}/approve",
            new ApproveBookingRequest("Try approving rejected"),
            JsonOptions);
        Assert.Equal(HttpStatusCode.BadRequest, approveRejectedRes.StatusCode);

        var cancelRejectedRes = await sarahClient.PostAsJsonAsync(
            $"/api/bookings/{pendingBooking.Id}/cancel",
            new CancelBookingRequest("Try cancelling rejected"),
            JsonOptions);
        Assert.Equal(HttpStatusCode.BadRequest, cancelRejectedRes.StatusCode);

        var checkInRejectedRes = await sarahClient.PostAsync($"/api/bookings/{pendingBooking.Id}/check-in", null);
        Assert.Equal(HttpStatusCode.BadRequest, checkInRejectedRes.StatusCode);

        // 3. Create a confirmed booking, check in once (200), verify second check-in fails (400),
        //    cancel once (200), and verify second cancel fails (400) without duplicating notes
        var confirmedCreate = await sarahClient.PostAsJsonAsync(
            "/api/bookings",
            new CreateBookingRequest(
                DeskId: "desk-ldn-401",
                Date: testDate,
                Slot: SlotType.FullDay,
                Notes: "Initial note"
            ),
            JsonOptions);
        Assert.Equal(HttpStatusCode.Created, confirmedCreate.StatusCode);
        var confirmedBooking = (await confirmedCreate.Content.ReadFromJsonAsync<BookingActionResponse>(JsonOptions))!.Booking!;

        // Approving an already Confirmed booking fails with 400
        var approveConfirmedRes = await adminClient.PostAsJsonAsync(
            $"/api/bookings/{confirmedBooking.Id}/approve",
            new ApproveBookingRequest("Already confirmed"),
            JsonOptions);
        Assert.Equal(HttpStatusCode.BadRequest, approveConfirmedRes.StatusCode);

        var firstCheckIn = await sarahClient.PostAsync($"/api/bookings/{confirmedBooking.Id}/check-in", null);
        Assert.Equal(HttpStatusCode.OK, firstCheckIn.StatusCode);

        var secondCheckIn = await sarahClient.PostAsync($"/api/bookings/{confirmedBooking.Id}/check-in", null);
        Assert.Equal(HttpStatusCode.BadRequest, secondCheckIn.StatusCode);

        var firstCancel = await sarahClient.PostAsJsonAsync(
            $"/api/bookings/{confirmedBooking.Id}/cancel",
            new CancelBookingRequest("First cancel reason"),
            JsonOptions);
        Assert.Equal(HttpStatusCode.OK, firstCancel.StatusCode);

        var secondCancel = await sarahClient.PostAsJsonAsync(
            $"/api/bookings/{confirmedBooking.Id}/cancel",
            new CancelBookingRequest("Duplicate cancel reason"),
            JsonOptions);
        Assert.Equal(HttpStatusCode.BadRequest, secondCancel.StatusCode);

        // 4. Approve slot conflict check:
        //    Marcus submits a pending Morning request on desk-ldn-420 for 2026-12-04,
        //    and also books confirmed Morning on desk-ldn-401 for 2026-12-04 after cancelling/or via another user conflict
        const string conflictDate = "2026-12-04";
        var marcusPendingRes = await marcusClient.PostAsJsonAsync(
            "/api/bookings",
            new CreateBookingRequest(
                DeskId: "desk-ldn-420",
                Date: conflictDate,
                Slot: SlotType.Morning,
                ApprovalReason: "Morning client call"
            ),
            JsonOptions);
        Assert.Equal(HttpStatusCode.Created, marcusPendingRes.StatusCode);
        var marcusPending = (await marcusPendingRes.Content.ReadFromJsonAsync<BookingActionResponse>(JsonOptions))!.Booking!;

        // Admin books Afternoon on desk-ldn-420, then updates it to FullDay? No, PUT checks active conflicts.
        // Instead, Sarah submits an Afternoon booking on desk-ldn-402, and Marcus books Afternoon on desk-ldn-401,
        // then we test user/desk conflict when Marcus's pending booking is updated or when another booking conflicts.
        // Wait: if Marcus cancels marcusPending? No, if marcusPending is PendingApproval, how can a desk conflict arise?
        // Admin creates a new booking or updates an inactive booking? Wait: PUT /api/bookings/{id} only checked conflicts when targetSlot != existing.Slot && IsActiveBooking(existing.Status)!
        // Or in a test we can seed/create an overlapping booking via DbContext to simulate concurrent booking creation before approval!
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<DeskinationDbContext>();
            db.Bookings.Add(new Booking(
                Id: "bkg-concurrent-conflict",
                DeskId: "desk-ldn-420",
                DeskCode: "LDN-420",
                DeskName: "Desk 420",
                LocationId: "loc-london",
                LocationName: "London HQ",
                FloorId: "flr-ldn-4",
                FloorName: "Level 4",
                UserId: "usr-sarah",
                UserName: "Sarah Chen",
                UserEmail: "sarah.chen@acme-corp.internal",
                UserDepartment: "Frontend Engineering",
                Date: conflictDate,
                Slot: SlotType.FullDay,
                Status: BookingStatus.Confirmed,
                CreatedAt: DateTimeOffset.UtcNow.ToString("O")
            ));
            await db.SaveChangesAsync();
        }

        var approveConflictRes = await adminClient.PostAsJsonAsync(
            $"/api/bookings/{marcusPending.Id}/approve",
            new ApproveBookingRequest("Should conflict with concurrent booking"),
            JsonOptions);
        Assert.Equal(HttpStatusCode.Conflict, approveConflictRes.StatusCode);
    }

    [Fact]
    public async Task DeleteDesk_CascadesDeletionToAssociatedBookings()
    {
        await using var factory = new TestWebApplicationFactory();
        using var adminClient = factory.CreateAuthenticatedClient(
            email: "elena.rostova@acme-corp.internal",
            role: "admin");

        // Verify desk-ldn-404 has seeded bookings prior to deletion
        var beforeBookings = await adminClient.GetFromJsonAsync<List<Booking>>(
            "/api/bookings?deskId=desk-ldn-404",
            JsonOptions);
        Assert.NotNull(beforeBookings);
        Assert.NotEmpty(beforeBookings);

        var deleteRes = await adminClient.DeleteAsync("/api/desks/desk-ldn-404");
        Assert.Equal(HttpStatusCode.NoContent, deleteRes.StatusCode);

        var afterBookings = await adminClient.GetFromJsonAsync<List<Booking>>(
            "/api/bookings?deskId=desk-ldn-404",
            JsonOptions);
        Assert.NotNull(afterBookings);
        Assert.Empty(afterBookings);
    }

    [Fact]
    public async Task GetEndpoints_SqlFilters_FilterBookingsDesksAndUsersAccurately()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateAuthenticatedClient(
            email: "sarah.chen@acme-corp.internal",
            role: "employee");

        // 1. GET /api/bookings with date range, status, slot, and case-insensitive search (including ApprovalReason)
        var filteredBookings = await client.GetFromJsonAsync<List<Booking>>(
            "/api/bookings?locationId=loc-london&startDate=2026-10-25&endDate=2026-10-28&status=PendingApproval&slot=FullDay&search=PROTOTYPE",
            JsonOptions);
        Assert.NotNull(filteredBookings);
        var pendingMatch = Assert.Single(filteredBookings);
        Assert.Equal("bkg-pending-1", pendingMatch.Id);

        // 2. GET /api/desks with allocationType=Unreserved (includes null allocationType) and Equipment search
        var unreservedWithStudioDisplay = await client.GetFromJsonAsync<List<Desk>>(
            "/api/desks?locationId=loc-london&floorId=flr-ldn-4&allocationType=Unreserved&status=Active&search=studio%20display",
            JsonOptions);
        Assert.NotNull(unreservedWithStudioDisplay);
        var studioDesk = Assert.Single(unreservedWithStudioDisplay);
        Assert.Equal("desk-ldn-405", studioDesk.Id);

        // 3. GET /api/desks with status=Maintenance
        var maintDesks = await client.GetFromJsonAsync<List<Desk>>(
            "/api/desks?status=Maintenance",
            JsonOptions);
        Assert.NotNull(maintDesks);
        var maintDesk = Assert.Single(maintDesks);
        Assert.Equal("desk-ldn-413", maintDesk.Id);

        // 4. GET /api/users with department, role, and search
        var filteredUsers = await client.GetFromJsonAsync<List<User>>(
            "/api/users?department=workplace%20operations&role=Admin&search=rostova",
            JsonOptions);
        Assert.NotNull(filteredUsers);
        var adminMatch = Assert.Single(filteredUsers);
        Assert.Equal("usr-admin-elena", adminMatch.Id);
    }

    [Fact]
    public async Task BatchUpdateDeskPositions_UpdatesMultipleDesksAndHandlesDuplicatesMissingAndEmptyUpdates()
    {
        await using var factory = new TestWebApplicationFactory();
        using var adminClient = factory.CreateAuthenticatedClient(
            email: "elena.rostova@acme-corp.internal",
            role: "admin");

        // 1. Empty batch returns 200 []
        var emptyRes = await adminClient.PatchAsJsonAsync(
            "/api/desks/positions",
            new BatchUpdateDeskPositionsRequest([]),
            JsonOptions);
        Assert.Equal(HttpStatusCode.OK, emptyRes.StatusCode);
        var emptyUpdated = await emptyRes.Content.ReadFromJsonAsync<List<Desk>>(JsonOptions);
        Assert.NotNull(emptyUpdated);
        Assert.Empty(emptyUpdated);

        // 2. Multi-desk update with duplicate ID (last-write-wins) and missing ID
        var batchReq = new BatchUpdateDeskPositionsRequest(
        [
            new DeskPositionUpdateItem("desk-ldn-401", new DeskPosition(11, 21), Rotation: 90),
            new DeskPositionUpdateItem("desk-ldn-402", new DeskPosition(33, 44), Rotation: 180),
            new DeskPositionUpdateItem("desk-ldn-401", new DeskPosition(15, 25), Rotation: 270),
            new DeskPositionUpdateItem("desk-does-not-exist", new DeskPosition(99, 99), Rotation: 0)
        ]);

        var batchRes = await adminClient.PatchAsJsonAsync("/api/desks/positions", batchReq, JsonOptions);
        Assert.Equal(HttpStatusCode.OK, batchRes.StatusCode);

        var updatedList = await batchRes.Content.ReadFromJsonAsync<List<Desk>>(JsonOptions);
        Assert.NotNull(updatedList);
        Assert.Equal(2, updatedList.Count);

        var d401 = await adminClient.GetFromJsonAsync<Desk>("/api/desks/desk-ldn-401", JsonOptions);
        Assert.NotNull(d401);
        Assert.Equal(new DeskPosition(15, 25), d401.Position);
        Assert.Equal(270, d401.Rotation);

        var d402 = await adminClient.GetFromJsonAsync<Desk>("/api/desks/desk-ldn-402", JsonOptions);
        Assert.NotNull(d402);
        Assert.Equal(new DeskPosition(33, 44), d402.Position);
        Assert.Equal(180, d402.Rotation);
    }

    [Fact]
    public async Task GetDesksAvailability_BatchEndpoint_ComputesAvailabilityAcrossLocationAndFloor()
    {
        await using var factory = new TestWebApplicationFactory();
        using var marcusClient = factory.CreateAuthenticatedClient(
            email: "marcus.vance@acme-corp.internal",
            role: "employee");

        var map = await marcusClient.GetFromJsonAsync<Dictionary<string, SlotAvailability>>(
            "/api/desks/availability?locationId=loc-london&floorId=flr-ldn-4&date=2026-10-25",
            JsonOptions);

        Assert.NotNull(map);
        Assert.NotEmpty(map);

        // desk-ldn-404 is designated to Sarah and booked FullDay on 2026-10-25
        Assert.True(map.ContainsKey("desk-ldn-404"));
        Assert.False(map["desk-ldn-404"].FullDay);
        Assert.True(map["desk-ldn-404"].IsDesignatedToOther);
        Assert.Equal("Sarah Chen", map["desk-ldn-404"].DesignatedUser);

        // desk-ldn-420 requires approval and has Morning booked by Priya Patel
        Assert.True(map.ContainsKey("desk-ldn-420"));
        Assert.False(map["desk-ldn-420"].Morning);
        Assert.True(map["desk-ldn-420"].Afternoon);
        Assert.True(map["desk-ldn-420"].RequiresApproval);

        // desk-ldn-401 is completely available
        Assert.True(map.ContainsKey("desk-ldn-401"));
        Assert.True(map["desk-ldn-401"].FullDay);
    }

    [Fact]
    public async Task GetLocationOccupancyRange_ComputesDailyRatesExcludesCancelledRejectedAndValidatesRange()
    {
        await using var factory = new TestWebApplicationFactory();
        using var employeeClient = factory.CreateAuthenticatedClient(
            email: "sarah.chen@acme-corp.internal",
            role: "employee");
        using var adminClient = factory.CreateAuthenticatedClient(
            email: "elena.rostova@acme-corp.internal",
            role: "admin");

        // 1. Create and reject a request on 2026-12-10
        var pendingRes = await employeeClient.PostAsJsonAsync(
            "/api/bookings",
            new CreateBookingRequest("desk-ldn-420", "2026-12-10", SlotType.FullDay, ApprovalReason: "Range test"),
            JsonOptions);
        var pendingBooking = (await pendingRes.Content.ReadFromJsonAsync<BookingActionResponse>(JsonOptions))!.Booking!;
        await adminClient.PostAsJsonAsync(
            $"/api/bookings/{pendingBooking.Id}/reject",
            new RejectBookingRequest("Denied"),
            JsonOptions);

        // 2. Book confirmed on 2026-12-11
        var confirmedRes = await employeeClient.PostAsJsonAsync(
            "/api/bookings",
            new CreateBookingRequest("desk-ldn-401", "2026-12-11", SlotType.Morning),
            JsonOptions);
        Assert.Equal(HttpStatusCode.Created, confirmedRes.StatusCode);

        // 3. Query 3-day range 2026-12-10 .. 2026-12-12
        var range = await employeeClient.GetFromJsonAsync<Dictionary<string, LocationOccupancyResponse>>(
            "/api/locations/loc-london/occupancy/range?startDate=2026-12-10&endDate=2026-12-12",
            JsonOptions);

        Assert.NotNull(range);
        Assert.Equal(3, range.Count);
        Assert.Equal(0, range["2026-12-10"].Booked);
        Assert.Equal(1, range["2026-12-11"].Booked);
        Assert.Equal(0, range["2026-12-12"].Booked);
        Assert.True(range["2026-12-11"].Total > 0);

        // 4. Invalid / inverted / excessive ranges return 400 BadRequest
        var badFormat = await employeeClient.GetAsync(
            "/api/locations/loc-london/occupancy/range?startDate=bad&endDate=2026-12-12");
        Assert.Equal(HttpStatusCode.BadRequest, badFormat.StatusCode);

        var inverted = await employeeClient.GetAsync(
            "/api/locations/loc-london/occupancy/range?startDate=2026-12-12&endDate=2026-12-10");
        Assert.Equal(HttpStatusCode.BadRequest, inverted.StatusCode);

        var tooWide = await employeeClient.GetAsync(
            "/api/locations/loc-london/occupancy/range?startDate=2026-01-01&endDate=2026-06-01");
        Assert.Equal(HttpStatusCode.BadRequest, tooWide.StatusCode);
    }

    [Fact]
    public async Task AuthEndpoints_TargetedUserResolution_WorksForKnownEmployeeAdminAndFallbackUser()
    {
        await using var factory = new TestWebApplicationFactory();
        using var sarahClient = factory.CreateAuthenticatedClient(
            email: "sarah.chen@acme-corp.internal",
            role: "employee");
        using var adminClient = factory.CreateAuthenticatedClient(
            email: "elena.rostova@acme-corp.internal",
            role: "admin");
        using var brandNewClient = factory.CreateAuthenticatedClient(
            email: "brand.new@acme-corp.internal",
            role: "employee",
            uid: "uid-brand-new",
            displayName: "Brand New");

        var sarahMe = await sarahClient.GetFromJsonAsync<JsonElement>("/api/auth/me");
        Assert.Equal("usr-sarah", sarahMe.GetProperty("profile").GetProperty("id").GetString());
        Assert.Equal("employee", sarahMe.GetProperty("role").GetString());

        var sarahAdminCheck = await sarahClient.GetAsync("/api/auth/admin-check");
        Assert.Equal(HttpStatusCode.Forbidden, sarahAdminCheck.StatusCode);

        var adminCheck = await adminClient.GetAsync("/api/auth/admin-check");
        Assert.Equal(HttpStatusCode.OK, adminCheck.StatusCode);
        var adminPayload = await adminCheck.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(adminPayload.GetProperty("authorized").GetBoolean());
        Assert.Equal("admin", adminPayload.GetProperty("role").GetString());

        var newMe = await brandNewClient.GetFromJsonAsync<JsonElement>("/api/auth/me");
        Assert.Equal("usr-uid-brand-new", newMe.GetProperty("profile").GetProperty("id").GetString());
        Assert.Equal("Brand New", newMe.GetProperty("displayName").GetString());
    }
}
