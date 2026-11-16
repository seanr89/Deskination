using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Json;
using BookingApi.Auth;
using BookingApi.Data;
using BookingApi.Models;
using Xunit;

namespace BookingApi.Tests;

public sealed class FirebaseAuthAndDomainRulesUnitTests
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DictionaryKeyPolicy = JsonNamingPolicy.CamelCase
    };

    private static ClaimsPrincipal CreatePrincipal(params (string Type, string Value)[] claims)
    {
        if (claims.Length == 0)
        {
            return new ClaimsPrincipal(new ClaimsIdentity());
        }

        var identity = new ClaimsIdentity(
            claims.Select(c => new Claim(c.Type, c.Value)),
            authenticationType: "TestAuth");

        return new ClaimsPrincipal(identity);
    }

    private static User CreateUser(
        string id = "usr-test",
        string name = "Test User",
        string email = "test.user@acme-corp.internal",
        Role role = Role.Employee,
        string department = "Platform Engineering",
        string jobTitle = "Software Engineer",
        string avatarColor = "bg-indigo-600") =>
        new(id, name, email, role, department, jobTitle, avatarColor);

    private static Desk CreateDesk(
        string id = "desk-test-1",
        string code = "TST-101",
        string name = "Test Desk 101",
        DeskAllocationType? allocationType = null,
        string? designatedUserId = null,
        string? designatedUserName = null,
        string? designatedDepartment = null,
        bool? requiresApproval = null,
        DeskStatus status = DeskStatus.Active) =>
        new(
            Id: id,
            Code: code,
            Name: name,
            LocationId: "loc-london",
            FloorId: "flr-ldn-4",
            ZoneId: "zn-ldn-focus",
            DeskType: DeskType.Standard,
            AllocationType: allocationType,
            DesignatedUserId: designatedUserId,
            DesignatedUserName: designatedUserName,
            DesignatedDepartment: designatedDepartment,
            RequiresApproval: requiresApproval,
            Equipment: ["27\" Monitor"],
            Status: status,
            Position: new DeskPosition(50, 50)
        );

    private static Booking CreateBooking(
        string id = "bkg-test-1",
        string deskId = "desk-test-1",
        string deskCode = "TST-101",
        string deskName = "Test Desk 101",
        string userId = "usr-test",
        string userName = "Test User",
        string userEmail = "test.user@acme-corp.internal",
        string userDepartment = "Platform Engineering",
        string date = "2026-10-25",
        SlotType slot = SlotType.FullDay,
        BookingStatus status = BookingStatus.Confirmed) =>
        new(
            Id: id,
            DeskId: deskId,
            DeskCode: deskCode,
            DeskName: deskName,
            LocationId: "loc-london",
            LocationName: "London HQ (St. Paul's)",
            FloorId: "flr-ldn-4",
            FloorName: "Level 4 - Engineering & Design Wing",
            UserId: userId,
            UserName: userName,
            UserEmail: userEmail,
            UserDepartment: userDepartment,
            Date: date,
            Slot: slot,
            Status: status,
            CreatedAt: "2026-10-20T09:00:00.000Z"
        );

    // =========================================================================
    // 1. FirebaseAuthExtensions Unit Tests
    // =========================================================================

    [Fact]
    public void GetFirebaseUid_ResolvesUserIdFirstThenNameIdentifierThenSubAndNullWhenAbsent()
    {
        var allPresent = CreatePrincipal(
            ("user_id", "uid-from-user-id"),
            (ClaimTypes.NameIdentifier, "uid-from-nameid"),
            ("sub", "uid-from-sub"));
        Assert.Equal("uid-from-user-id", allPresent.GetFirebaseUid());

        var withoutUserId = CreatePrincipal(
            (ClaimTypes.NameIdentifier, "uid-from-nameid"),
            ("sub", "uid-from-sub"));
        Assert.Equal("uid-from-nameid", withoutUserId.GetFirebaseUid());

        var onlySub = CreatePrincipal(("sub", "uid-from-sub"));
        Assert.Equal("uid-from-sub", onlySub.GetFirebaseUid());

        var noUid = CreatePrincipal(("email", "user@acme-corp.internal"));
        Assert.Null(noUid.GetFirebaseUid());
    }

    [Fact]
    public void GetEmail_ResolvesEmailFirstThenClaimTypesEmailAndNullWhenAbsent()
    {
        var bothPresent = CreatePrincipal(
            ("email", "primary@acme-corp.internal"),
            (ClaimTypes.Email, "fallback@acme-corp.internal"));
        Assert.Equal("primary@acme-corp.internal", bothPresent.GetEmail());

        var onlyClaimTypesEmail = CreatePrincipal(
            (ClaimTypes.Email, "fallback@acme-corp.internal"));
        Assert.Equal("fallback@acme-corp.internal", onlyClaimTypesEmail.GetEmail());

        var noEmail = CreatePrincipal(("user_id", "uid-123"));
        Assert.Null(noEmail.GetEmail());
    }

    [Fact]
    public void GetDisplayName_ReturnsClaimNameDerivesFromEmailOrFallsBackToDefault()
    {
        var fromNameClaim = CreatePrincipal(
            ("name", "Sarah Chen"),
            (ClaimTypes.Name, "Fallback Name"),
            ("email", "ignored.email@acme-corp.internal"));
        Assert.Equal("Sarah Chen", fromNameClaim.GetDisplayName());

        var fromClaimTypesName = CreatePrincipal(
            (ClaimTypes.Name, "Priya Patel"),
            ("email", "ignored.email@acme-corp.internal"));
        Assert.Equal("Priya Patel", fromClaimTypesName.GetDisplayName());

        var derivedFromEmail = CreatePrincipal(
            ("email", "marcus.vance_jr@acme-corp.internal"));
        Assert.Equal("Marcus Vance Jr", derivedFromEmail.GetDisplayName());

        var emptyPrincipal = CreatePrincipal();
        Assert.Equal("FlexDesk Employee", emptyPrincipal.GetDisplayName());
    }

    [Theory]
    [InlineData("role", "admin")]
    [InlineData(ClaimTypes.Role, "admin")]
    [InlineData("admin", "true")]
    [InlineData("email", "elena.rostova@acme-corp.internal")]
    [InlineData("email", "ELENA.ROSTOVA@ACME-CORP.INTERNAL")]
    [InlineData(ClaimTypes.Email, "Elena.Rostova@acme-corp.internal")]
    public void IsAdminUserAndResolveRole_ReturnAdminForAdminClaimsOrDefaultAdminEmail(
        string claimType,
        string claimValue)
    {
        var principal = CreatePrincipal((claimType, claimValue));

        Assert.True(principal.IsAdminUser());
        Assert.Equal(Role.Admin, principal.ResolveRole());
    }

    [Theory]
    [InlineData("role", "employee")]
    [InlineData(ClaimTypes.Role, "employee")]
    [InlineData("admin", "false")]
    [InlineData("email", "sarah.chen@acme-corp.internal")]
    public void IsAdminUserAndResolveRole_ReturnEmployeeForNonAdminClaims(
        string claimType,
        string claimValue)
    {
        var principal = CreatePrincipal((claimType, claimValue));

        Assert.False(principal.IsAdminUser());
        Assert.Equal(Role.Employee, principal.ResolveRole());
    }

    [Fact]
    public void IsAdminUserAndResolveRole_ReturnEmployeeWhenPrincipalHasNoClaims()
    {
        var principal = CreatePrincipal();

        Assert.False(principal.IsAdminUser());
        Assert.Equal(Role.Employee, principal.ResolveRole());
    }

    [Fact]
    public void ToAuthenticatedUserResponse_MatchesWorkspaceUserByEmailCaseInsensitively()
    {
        var principal = CreatePrincipal(
            ("user_id", "fb-sarah-1"),
            ("email", "SARAH.CHEN@ACME-CORP.INTERNAL"),
            ("role", "employee"));

        var response = principal.ToAuthenticatedUserResponse(DeskinationSeeder.InitialUsers);

        Assert.Equal("fb-sarah-1", response.FirebaseUid);
        Assert.Equal("SARAH.CHEN@ACME-CORP.INTERNAL", response.Email);
        Assert.Equal("Sarah Chen", response.DisplayName);
        Assert.Equal(Role.Employee, response.Role);
        Assert.Equal("usr-sarah", response.Profile.Id);
        Assert.Equal("Frontend Engineering", response.Profile.Department);
        Assert.Equal("Senior Staff Engineer", response.Profile.JobTitle);
    }

    [Fact]
    public void ToAuthenticatedUserResponse_MatchesWorkspaceUserByPrefixedOrExactUidWhenEmailAbsent()
    {
        var prefixedUidPrincipal = CreatePrincipal(("user_id", "sarah"));
        var prefixedResponse = prefixedUidPrincipal.ToAuthenticatedUserResponse(DeskinationSeeder.InitialUsers);

        Assert.Equal("sarah", prefixedResponse.FirebaseUid);
        Assert.Null(prefixedResponse.Email);
        Assert.Equal("usr-sarah", prefixedResponse.Profile.Id);
        Assert.Equal("Sarah Chen", prefixedResponse.DisplayName);
        Assert.Equal(Role.Employee, prefixedResponse.Role);

        var directUidUser = CreateUser(
            id: "direct-uid-42",
            name: "Direct Match",
            email: "direct.match@acme-corp.internal",
            role: Role.Employee);
        var exactUidPrincipal = CreatePrincipal(("user_id", "direct-uid-42"));
        var exactResponse = exactUidPrincipal.ToAuthenticatedUserResponse([directUidUser]);

        Assert.Equal("direct-uid-42", exactResponse.FirebaseUid);
        Assert.Equal("direct-uid-42", exactResponse.Profile.Id);
        Assert.Equal("Direct Match", exactResponse.DisplayName);
    }

    [Fact]
    public void ToAuthenticatedUserResponse_PreservesAdminRoleWhenClaimOrWorkspaceProfileIsAdmin()
    {
        // Matched profile is Admin, even when JWT claim says employee
        var workspaceAdmin = CreateUser(
            id: "usr-ops-lead",
            name: "Operations Lead",
            email: "ops.lead@acme-corp.internal",
            role: Role.Admin,
            department: "Workplace Operations");
        var employeeClaimPrincipal = CreatePrincipal(
            ("user_id", "fb-ops"),
            ("email", "ops.lead@acme-corp.internal"),
            ("role", "employee"));

        var fromProfileAdmin = employeeClaimPrincipal.ToAuthenticatedUserResponse([workspaceAdmin]);
        Assert.Equal(Role.Admin, fromProfileAdmin.Role);
        Assert.Equal(Role.Admin, fromProfileAdmin.Profile.Role);
        Assert.Equal("usr-ops-lead", fromProfileAdmin.Profile.Id);

        // Matched profile is Employee, promoted to Admin by JWT claim
        var adminClaimPrincipal = CreatePrincipal(
            ("user_id", "fb-sarah-admin"),
            ("email", "sarah.chen@acme-corp.internal"),
            ("role", "admin"));

        var fromClaimAdmin = adminClaimPrincipal.ToAuthenticatedUserResponse(DeskinationSeeder.InitialUsers);
        Assert.Equal(Role.Admin, fromClaimAdmin.Role);
        Assert.Equal(Role.Admin, fromClaimAdmin.Profile.Role);
        Assert.Equal("usr-sarah", fromClaimAdmin.Profile.Id);
    }

    [Fact]
    public void ToAuthenticatedUserResponse_SynthesizesFallbackProfilesWithRoleSpecificDefaults()
    {
        var employeePrincipal = CreatePrincipal(
            ("user_id", "new-emp-101"),
            ("email", "alex.mercer@acme-corp.internal"),
            ("name", "Alex Mercer"),
            ("role", "employee"));

        var employeeResponse = employeePrincipal.ToAuthenticatedUserResponse(DeskinationSeeder.InitialUsers);

        Assert.Equal("new-emp-101", employeeResponse.FirebaseUid);
        Assert.Equal("alex.mercer@acme-corp.internal", employeeResponse.Email);
        Assert.Equal("Alex Mercer", employeeResponse.DisplayName);
        Assert.Equal(Role.Employee, employeeResponse.Role);
        Assert.Equal("usr-new-emp-101", employeeResponse.Profile.Id);
        Assert.Equal("Alex Mercer", employeeResponse.Profile.Name);
        Assert.Equal("alex.mercer@acme-corp.internal", employeeResponse.Profile.Email);
        Assert.Equal(Role.Employee, employeeResponse.Profile.Role);
        Assert.Equal("General Operations", employeeResponse.Profile.Department);
        Assert.Equal("Team Member", employeeResponse.Profile.JobTitle);
        Assert.Equal("bg-indigo-600", employeeResponse.Profile.AvatarColor);

        var adminPrincipal = CreatePrincipal(
            ("user_id", "new-admin-202"),
            ("email", "jordan.blake@acme-corp.internal"),
            ("name", "Jordan Blake"),
            ("admin", "true"));

        var adminResponse = adminPrincipal.ToAuthenticatedUserResponse(DeskinationSeeder.InitialUsers);

        Assert.Equal("new-admin-202", adminResponse.FirebaseUid);
        Assert.Equal("Jordan Blake", adminResponse.DisplayName);
        Assert.Equal(Role.Admin, adminResponse.Role);
        Assert.Equal("usr-new-admin-202", adminResponse.Profile.Id);
        Assert.Equal(Role.Admin, adminResponse.Profile.Role);
        Assert.Equal("Workplace Operations", adminResponse.Profile.Department);
        Assert.Equal("Office Administrator", adminResponse.Profile.JobTitle);
        Assert.Equal("bg-blue-700", adminResponse.Profile.AvatarColor);

        var minimalPrincipal = CreatePrincipal();
        var minimalResponse = minimalPrincipal.ToAuthenticatedUserResponse([]);

        Assert.Equal("unknown-uid", minimalResponse.FirebaseUid);
        Assert.Null(minimalResponse.Email);
        Assert.Equal("FlexDesk Employee", minimalResponse.DisplayName);
        Assert.Equal("usr-unknown-uid", minimalResponse.Profile.Id);
        Assert.Equal("unknown-uid@firebase.local", minimalResponse.Profile.Email);
        Assert.Equal(Role.Employee, minimalResponse.Profile.Role);
    }

    // =========================================================================
    // 2. BookingDomainRules Unit Tests
    // =========================================================================

    [Theory]
    [InlineData(SlotType.Morning, SlotType.Morning, true)]
    [InlineData(SlotType.Morning, SlotType.Afternoon, false)]
    [InlineData(SlotType.Morning, SlotType.FullDay, true)]
    [InlineData(SlotType.Afternoon, SlotType.Morning, false)]
    [InlineData(SlotType.Afternoon, SlotType.Afternoon, true)]
    [InlineData(SlotType.Afternoon, SlotType.FullDay, true)]
    [InlineData(SlotType.FullDay, SlotType.Morning, true)]
    [InlineData(SlotType.FullDay, SlotType.Afternoon, true)]
    [InlineData(SlotType.FullDay, SlotType.FullDay, true)]
    public void SlotsOverlap_CoversAllNineSlotCombinations(
        SlotType existing,
        SlotType requested,
        bool expectedOverlap)
    {
        Assert.Equal(expectedOverlap, BookingDomainRules.SlotsOverlap(existing, requested));
    }

    [Theory]
    [InlineData(BookingStatus.Confirmed, true)]
    [InlineData(BookingStatus.CheckedIn, true)]
    [InlineData(BookingStatus.PendingApproval, true)]
    [InlineData(BookingStatus.Cancelled, false)]
    [InlineData(BookingStatus.Rejected, false)]
    public void IsActiveBooking_MatchesExpectedActiveStatuses(BookingStatus status, bool expectedActive)
    {
        Assert.Equal(expectedActive, BookingDomainRules.IsActiveBooking(status));
    }

    [Fact]
    public void ComputeDeskAvailability_EvaluatesDesignationAndApprovalPolicies()
    {
        var unreservedDesk = CreateDesk(allocationType: DeskAllocationType.Unreserved);
        var caller = CreateUser(id: "usr-marcus", department: "Product Design");

        var unreservedAvail = BookingDomainRules.ComputeDeskAvailability(unreservedDesk, [], caller);
        Assert.True(unreservedAvail.Morning);
        Assert.True(unreservedAvail.Afternoon);
        Assert.True(unreservedAvail.FullDay);
        Assert.False(unreservedAvail.IsDesignatedToOther);
        Assert.Null(unreservedAvail.DesignatedUser);
        Assert.False(unreservedAvail.RequiresApproval);

        // User-designated desk
        var userDesignatedDesk = CreateDesk(
            allocationType: DeskAllocationType.Designated,
            designatedUserId: "usr-sarah",
            designatedUserName: "Sarah Chen");

        var otherCallerAvail = BookingDomainRules.ComputeDeskAvailability(userDesignatedDesk, [], caller);
        Assert.True(otherCallerAvail.IsDesignatedToOther);
        Assert.Equal("Sarah Chen", otherCallerAvail.DesignatedUser);

        var matchedUserCaller = CreateUser(id: "USR-SARAH", department: "Frontend Engineering");
        var matchedUserAvail = BookingDomainRules.ComputeDeskAvailability(userDesignatedDesk, [], matchedUserCaller);
        Assert.False(matchedUserAvail.IsDesignatedToOther);
        Assert.Null(matchedUserAvail.DesignatedUser);

        // Department-designated desk
        var deptDesignatedDesk = CreateDesk(
            allocationType: DeskAllocationType.Designated,
            designatedDepartment: "Executive & Legal Leadership");

        var nonDeptAvail = BookingDomainRules.ComputeDeskAvailability(deptDesignatedDesk, [], caller);
        Assert.True(nonDeptAvail.IsDesignatedToOther);
        Assert.Equal("Executive & Legal Leadership", nonDeptAvail.DesignatedUser);

        var deptCaller = CreateUser(id: "usr-exec", department: "executive & legal leadership");
        var deptAvail = BookingDomainRules.ComputeDeskAvailability(deptDesignatedDesk, [], deptCaller);
        Assert.False(deptAvail.IsDesignatedToOther);
        Assert.Null(deptAvail.DesignatedUser);

        // Requires-approval desk (both via AllocationType and explicit RequiresApproval flag)
        var approvalByAllocation = CreateDesk(allocationType: DeskAllocationType.RequiresApproval);
        Assert.True(BookingDomainRules.ComputeDeskAvailability(approvalByAllocation, [], caller).RequiresApproval);

        var approvalByFlag = CreateDesk(allocationType: DeskAllocationType.Unreserved, requiresApproval: true);
        Assert.True(BookingDomainRules.ComputeDeskAvailability(approvalByFlag, [], caller).RequiresApproval);
    }

    [Fact]
    public void ComputeDeskAvailability_TracksSlotBookedByInfoAndIgnoresCancelledAndRejectedBookings()
    {
        var desk = CreateDesk();
        var caller = CreateUser();

        var cancelledAfternoon = CreateBooking(
            id: "bkg-cancelled",
            userName: "Cancelled User",
            userDepartment: "Finance",
            slot: SlotType.Afternoon,
            status: BookingStatus.Cancelled);
        var rejectedFullDay = CreateBooking(
            id: "bkg-rejected",
            userName: "Rejected User",
            userDepartment: "Sales",
            slot: SlotType.FullDay,
            status: BookingStatus.Rejected);
        var activeMorning = CreateBooking(
            id: "bkg-morning",
            userName: "Priya Patel",
            userDepartment: "Core Infrastructure",
            slot: SlotType.Morning,
            status: BookingStatus.CheckedIn);

        var morningOnlyAvail = BookingDomainRules.ComputeDeskAvailability(
            desk,
            [cancelledAfternoon, rejectedFullDay, activeMorning],
            caller);

        Assert.False(morningOnlyAvail.Morning);
        Assert.True(morningOnlyAvail.Afternoon);
        Assert.False(morningOnlyAvail.FullDay);
        Assert.NotNull(morningOnlyAvail.BookedBy);
        Assert.Equal(new BookedBySlotInfo("Priya Patel", "Core Infrastructure"), morningOnlyAvail.BookedBy.Morning);
        Assert.Null(morningOnlyAvail.BookedBy.Afternoon);
        Assert.Null(morningOnlyAvail.BookedBy.FullDay);

        // Adding an active afternoon booking (pending_approval) fills Afternoon while keeping FullDay BookedBy null
        var activeAfternoon = CreateBooking(
            id: "bkg-afternoon",
            userName: "David Kim",
            userDepartment: "Enterprise Sales",
            slot: SlotType.Afternoon,
            status: BookingStatus.PendingApproval);

        var splitBookedAvail = BookingDomainRules.ComputeDeskAvailability(
            desk,
            [activeMorning, activeAfternoon],
            caller);

        Assert.False(splitBookedAvail.Morning);
        Assert.False(splitBookedAvail.Afternoon);
        Assert.False(splitBookedAvail.FullDay);
        Assert.Equal(new BookedBySlotInfo("Priya Patel", "Core Infrastructure"), splitBookedAvail.BookedBy!.Morning);
        Assert.Equal(new BookedBySlotInfo("David Kim", "Enterprise Sales"), splitBookedAvail.BookedBy.Afternoon);
        Assert.Null(splitBookedAvail.BookedBy.FullDay);

        // FullDay active booking populates Morning, Afternoon, and FullDay BookedBy info
        var activeFullDay = CreateBooking(
            id: "bkg-fullday",
            userName: "Marcus Vance",
            userDepartment: "Product Design",
            slot: SlotType.FullDay,
            status: BookingStatus.Confirmed);

        var fullDayAvail = BookingDomainRules.ComputeDeskAvailability(
            desk,
            [rejectedFullDay, activeFullDay],
            caller);

        var expectedFullDayInfo = new BookedBySlotInfo("Marcus Vance", "Product Design");
        Assert.False(fullDayAvail.Morning);
        Assert.False(fullDayAvail.Afternoon);
        Assert.False(fullDayAvail.FullDay);
        Assert.Equal(expectedFullDayInfo, fullDayAvail.BookedBy!.Morning);
        Assert.Equal(expectedFullDayInfo, fullDayAvail.BookedBy.Afternoon);
        Assert.Equal(expectedFullDayInfo, fullDayAvail.BookedBy.FullDay);
    }

    [Fact]
    public void ComputeUserStats_ReturnsZeroedBalancedStatsWhenNoBookingsExist()
    {
        var stats = BookingDomainRules.ComputeUserStats([]);

        Assert.Equal(0, stats.TotalBookings);
        Assert.Equal(0, stats.UpcomingCount);
        Assert.Equal(0, stats.CompletedCount);
        Assert.Equal(0, stats.CancelledCount);
        Assert.Equal(0, stats.PendingApprovalsCount);
        Assert.Equal(0, stats.CancellationRate);
        Assert.Null(stats.MostCommonDesk);
        Assert.Equal("balanced", stats.PreferredSlot);
        Assert.Equal(0, stats.DaysInOfficeThisMonth);
    }

    [Fact]
    public void ComputeUserStats_CalculatesCountsMostCommonDeskPreferredSlotAndMonthlyDays()
    {
        var bookings = new List<Booking>
        {
            // Completed (CheckedIn) in Oct
            CreateBooking("b1", "desk-a", "LDN-401", "Desk 401", date: "2026-10-10", slot: SlotType.FullDay, status: BookingStatus.CheckedIn),
            // Two Confirmed bookings on the same past Oct date -> 2 Completed, 1 distinct office day
            CreateBooking("b2", "desk-a", "LDN-401", "Desk 401", date: "2026-10-15", slot: SlotType.Morning, status: BookingStatus.Confirmed),
            CreateBooking("b3", "desk-b", "LDN-402", "Desk 402", date: "2026-10-15", slot: SlotType.Afternoon, status: BookingStatus.Confirmed),
            // Upcoming on referenceDate (2026-10-25) in Oct
            CreateBooking("b4", "desk-a", "LDN-401", "Desk 401", date: "2026-10-25", slot: SlotType.FullDay, status: BookingStatus.Confirmed),
            // Upcoming in Nov (should not count toward Oct DaysInOfficeThisMonth)
            CreateBooking("b5", "desk-b", "LDN-402", "Desk 402", date: "2026-11-02", slot: SlotType.FullDay, status: BookingStatus.Confirmed),
            // PendingApproval in Oct (excluded from DaysInOfficeThisMonth, included in active bookings)
            CreateBooking("b6", "desk-c", "LDN-403", "Desk 403", date: "2026-10-28", slot: SlotType.Morning, status: BookingStatus.PendingApproval),
            // Cancelled & Rejected on desk-c (excluded from active bookings, MostCommonDesk, PreferredSlot, and DaysInOfficeThisMonth)
            CreateBooking("b7", "desk-c", "LDN-403", "Desk 403", date: "2026-10-05", slot: SlotType.Afternoon, status: BookingStatus.Cancelled),
            CreateBooking("b8", "desk-c", "LDN-403", "Desk 403", date: "2026-10-06", slot: SlotType.Afternoon, status: BookingStatus.Rejected)
        };

        var octStats = BookingDomainRules.ComputeUserStats(bookings, referenceDate: "2026-10-25");

        Assert.Equal(8, octStats.TotalBookings);
        Assert.Equal(2, octStats.UpcomingCount);
        Assert.Equal(3, octStats.CompletedCount);
        Assert.Equal(1, octStats.CancelledCount);
        Assert.Equal(1, octStats.PendingApprovalsCount);
        Assert.Equal(12, octStats.CancellationRate); // Math.Round(1 / 8.0 * 100) == 12
        Assert.Equal(new MostCommonDeskStat("LDN-401", "Desk 401", 3), octStats.MostCommonDesk);
        Assert.Equal("full_day", octStats.PreferredSlot); // 3 FullDay vs 2 Morning vs 2 Afternoon
        Assert.Equal(3, octStats.DaysInOfficeThisMonth); // 2026-10-10, 2026-10-15, 2026-10-25

        // Explicit month override isolates November office days
        var novMonthStats = BookingDomainRules.ComputeUserStats(bookings, referenceDate: "2026-10-25", month: "2026-11");
        Assert.Equal(1, novMonthStats.DaysInOfficeThisMonth);
    }

    [Theory]
    [InlineData(SlotType.FullDay, SlotType.FullDay, SlotType.Morning, "full_day")]
    [InlineData(SlotType.Morning, SlotType.Morning, SlotType.Afternoon, "morning")]
    [InlineData(SlotType.Afternoon, SlotType.Afternoon, SlotType.FullDay, "afternoon")]
    [InlineData(SlotType.Morning, SlotType.Afternoon, SlotType.FullDay, "balanced")]
    public void ComputeUserStats_DeterminesPreferredSlotCorrectly(
        SlotType slot1,
        SlotType slot2,
        SlotType slot3,
        string expectedPreferredSlot)
    {
        var bookings = new List<Booking>
        {
            CreateBooking("s1", date: "2026-10-01", slot: slot1, status: BookingStatus.Confirmed),
            CreateBooking("s2", date: "2026-10-02", slot: slot2, status: BookingStatus.Confirmed),
            CreateBooking("s3", date: "2026-10-03", slot: slot3, status: BookingStatus.Confirmed)
        };

        var stats = BookingDomainRules.ComputeUserStats(bookings, referenceDate: "2026-10-25");

        Assert.Equal(expectedPreferredSlot, stats.PreferredSlot);
    }

    // =========================================================================
    // 3. Booking Policy Edge Case Integration Tests
    // =========================================================================

    [Fact]
    public async Task PostBookings_MaintenanceDesk_Returns400BadRequest()
    {
        await using var factory = new TestWebApplicationFactory();
        using var employeeClient = factory.CreateAuthenticatedClient(
            email: "sarah.chen@acme-corp.internal",
            role: "employee");
        using var adminClient = factory.CreateAuthenticatedClient(
            email: "elena.rostova@acme-corp.internal",
            role: "admin");

        // "desk-ldn-413" is seeded with DeskStatus.Maintenance in DeskinationSeeder
        var request = new CreateBookingRequest(
            DeskId: "desk-ldn-413",
            Date: "2026-11-20",
            Slot: SlotType.FullDay,
            Notes: "Attempting to reserve maintenance bench"
        );

        var employeeResponse = await employeeClient.PostAsJsonAsync("/api/bookings", request, JsonOptions);
        Assert.Equal(HttpStatusCode.BadRequest, employeeResponse.StatusCode);

        var employeePayload = await employeeResponse.Content.ReadFromJsonAsync<BookingActionResponse>(JsonOptions);
        Assert.NotNull(employeePayload);
        Assert.False(employeePayload.Success);
        Assert.Contains("maintenance", employeePayload.Message, StringComparison.OrdinalIgnoreCase);

        var adminResponse = await adminClient.PostAsJsonAsync("/api/bookings", request, JsonOptions);
        Assert.Equal(HttpStatusCode.BadRequest, adminResponse.StatusCode);
    }

    [Fact]
    public async Task PostBookings_DesignatedDeskPolicy_EnforcesForbiddenApprovalRequestAndAdminOverride()
    {
        await using var factory = new TestWebApplicationFactory();
        using var marcusClient = factory.CreateAuthenticatedClient(
            email: "marcus.vance@acme-corp.internal",
            role: "employee");
        using var adminClient = factory.CreateAuthenticatedClient(
            email: "elena.rostova@acme-corp.internal",
            role: "admin");

        // "desk-ldn-404" is seeded as Designated to "usr-sarah" (Sarah Chen)
        const string designatedDeskId = "desk-ldn-404";

        // 1. Non-admin without isApprovalRequest gets 403 Forbidden
        var directAttempt = new CreateBookingRequest(
            DeskId: designatedDeskId,
            Date: "2026-11-20",
            Slot: SlotType.FullDay
        );
        var forbiddenRes = await marcusClient.PostAsJsonAsync("/api/bookings", directAttempt, JsonOptions);
        Assert.Equal(HttpStatusCode.Forbidden, forbiddenRes.StatusCode);

        var forbiddenPayload = await forbiddenRes.Content.ReadFromJsonAsync<BookingActionResponse>(JsonOptions);
        Assert.NotNull(forbiddenPayload);
        Assert.False(forbiddenPayload.Success);
        Assert.Contains("Sarah Chen", forbiddenPayload.Message);

        // 2. Non-admin with isApprovalRequest=true gets 201 Created with PendingApproval status
        var approvalAttempt = new CreateBookingRequest(
            DeskId: designatedDeskId,
            Date: "2026-11-20",
            Slot: SlotType.FullDay,
            ApprovalReason: "Co-locating with frontend team while Sarah is travelling",
            IsApprovalRequest: true
        );
        var pendingRes = await marcusClient.PostAsJsonAsync("/api/bookings", approvalAttempt, JsonOptions);
        Assert.Equal(HttpStatusCode.Created, pendingRes.StatusCode);

        var pendingPayload = await pendingRes.Content.ReadFromJsonAsync<BookingActionResponse>(JsonOptions);
        Assert.NotNull(pendingPayload?.Booking);
        Assert.True(pendingPayload.Success);
        Assert.Equal(BookingStatus.PendingApproval, pendingPayload.Booking.Status);
        Assert.Equal(designatedDeskId, pendingPayload.Booking.DeskId);

        // 3. Admin booking the same designated desk directly gets 201 Created with Confirmed status
        var adminBooking = new CreateBookingRequest(
            DeskId: designatedDeskId,
            Date: "2026-11-21",
            Slot: SlotType.FullDay,
            Notes: "Facilities equipment audit"
        );
        var adminRes = await adminClient.PostAsJsonAsync("/api/bookings", adminBooking, JsonOptions);
        Assert.Equal(HttpStatusCode.Created, adminRes.StatusCode);

        var adminPayload = await adminRes.Content.ReadFromJsonAsync<BookingActionResponse>(JsonOptions);
        Assert.NotNull(adminPayload?.Booking);
        Assert.True(adminPayload.Success);
        Assert.Equal(BookingStatus.Confirmed, adminPayload.Booking.Status);
        Assert.Equal(designatedDeskId, adminPayload.Booking.DeskId);
    }

    [Fact]
    public async Task PostBookings_UserDoubleBooking_RejectsOverlappingSlotAndAllowsSplitSlotsAcrossDesks()
    {
        await using var factory = new TestWebApplicationFactory();
        using var sarahClient = factory.CreateAuthenticatedClient(
            email: "sarah.chen@acme-corp.internal",
            role: "employee");

        const string testDate = "2026-11-25";

        // 1. Morning booking on desk-ldn-401 succeeds
        var firstMorning = new CreateBookingRequest(
            DeskId: "desk-ldn-401",
            Date: testDate,
            Slot: SlotType.Morning,
            Notes: "Morning deep focus"
        );
        var firstRes = await sarahClient.PostAsJsonAsync("/api/bookings", firstMorning, JsonOptions);
        Assert.Equal(HttpStatusCode.Created, firstRes.StatusCode);

        var firstPayload = await firstRes.Content.ReadFromJsonAsync<BookingActionResponse>(JsonOptions);
        Assert.NotNull(firstPayload?.Booking);
        Assert.Equal(BookingStatus.Confirmed, firstPayload.Booking.Status);
        Assert.Equal(SlotType.Morning, firstPayload.Booking.Slot);

        // 2. Overlapping Morning booking on a second desk (desk-ldn-402) on the same date returns 409 Conflict
        var overlappingMorning = new CreateBookingRequest(
            DeskId: "desk-ldn-402",
            Date: testDate,
            Slot: SlotType.Morning
        );
        var morningConflictRes = await sarahClient.PostAsJsonAsync("/api/bookings", overlappingMorning, JsonOptions);
        Assert.Equal(HttpStatusCode.Conflict, morningConflictRes.StatusCode);

        var morningConflictPayload = await morningConflictRes.Content.ReadFromJsonAsync<BookingActionResponse>(JsonOptions);
        Assert.NotNull(morningConflictPayload);
        Assert.False(morningConflictPayload.Success);
        Assert.Contains("LDN-401", morningConflictPayload.Message);

        // 3. Overlapping FullDay booking on a second desk on the same date also returns 409 Conflict
        var overlappingFullDay = new CreateBookingRequest(
            DeskId: "desk-ldn-402",
            Date: testDate,
            Slot: SlotType.FullDay
        );
        var fullDayConflictRes = await sarahClient.PostAsJsonAsync("/api/bookings", overlappingFullDay, JsonOptions);
        Assert.Equal(HttpStatusCode.Conflict, fullDayConflictRes.StatusCode);

        // 4. Non-overlapping Afternoon booking on the second desk on the same date succeeds with 201 Created
        var nonOverlappingAfternoon = new CreateBookingRequest(
            DeskId: "desk-ldn-402",
            Date: testDate,
            Slot: SlotType.Afternoon,
            Notes: "Afternoon collaboration"
        );
        var afternoonRes = await sarahClient.PostAsJsonAsync("/api/bookings", nonOverlappingAfternoon, JsonOptions);
        Assert.Equal(HttpStatusCode.Created, afternoonRes.StatusCode);

        var afternoonPayload = await afternoonRes.Content.ReadFromJsonAsync<BookingActionResponse>(JsonOptions);
        Assert.NotNull(afternoonPayload?.Booking);
        Assert.True(afternoonPayload.Success);
        Assert.Equal(BookingStatus.Confirmed, afternoonPayload.Booking.Status);
        Assert.Equal("desk-ldn-402", afternoonPayload.Booking.DeskId);
        Assert.Equal(SlotType.Afternoon, afternoonPayload.Booking.Slot);
    }
}
