using System.Text.Json.Serialization;

namespace BookingApi.Models;

[JsonConverter(typeof(JsonStringEnumConverter<Role>))]
public enum Role
{
    [JsonStringEnumMemberName("employee")] Employee,
    [JsonStringEnumMemberName("admin")] Admin
}

[JsonConverter(typeof(JsonStringEnumConverter<SlotType>))]
public enum SlotType
{
    [JsonStringEnumMemberName("morning")] Morning,
    [JsonStringEnumMemberName("afternoon")] Afternoon,
    [JsonStringEnumMemberName("full_day")] FullDay
}

[JsonConverter(typeof(JsonStringEnumConverter<DeskType>))]
public enum DeskType
{
    [JsonStringEnumMemberName("standing")] Standing,
    [JsonStringEnumMemberName("standard")] Standard,
    [JsonStringEnumMemberName("dual_screen")] DualScreen,
    [JsonStringEnumMemberName("ultrawide")] Ultrawide,
    [JsonStringEnumMemberName("quiet_booth")] QuietBooth,
    [JsonStringEnumMemberName("window_view")] WindowView
}

[JsonConverter(typeof(JsonStringEnumConverter<DeskAllocationType>))]
public enum DeskAllocationType
{
    [JsonStringEnumMemberName("unreserved")] Unreserved,
    [JsonStringEnumMemberName("designated")] Designated,
    [JsonStringEnumMemberName("requires_approval")] RequiresApproval
}

[JsonConverter(typeof(JsonStringEnumConverter<DeskStatus>))]
public enum DeskStatus
{
    [JsonStringEnumMemberName("active")] Active,
    [JsonStringEnumMemberName("maintenance")] Maintenance
}

[JsonConverter(typeof(JsonStringEnumConverter<FloorElementType>))]
public enum FloorElementType
{
    [JsonStringEnumMemberName("room")] Room,
    [JsonStringEnumMemberName("entrance")] Entrance,
    [JsonStringEnumMemberName("kitchen")] Kitchen,
    [JsonStringEnumMemberName("restroom")] Restroom,
    [JsonStringEnumMemberName("stairs")] Stairs,
    [JsonStringEnumMemberName("window")] Window,
    [JsonStringEnumMemberName("wall")] Wall,
    [JsonStringEnumMemberName("zone_label")] ZoneLabel
}

[JsonConverter(typeof(JsonStringEnumConverter<BookingStatus>))]
public enum BookingStatus
{
    [JsonStringEnumMemberName("confirmed")] Confirmed,
    [JsonStringEnumMemberName("cancelled")] Cancelled,
    [JsonStringEnumMemberName("checked_in")] CheckedIn,
    [JsonStringEnumMemberName("pending_approval")] PendingApproval,
    [JsonStringEnumMemberName("rejected")] Rejected
}

public sealed record User(
    string Id,
    string Name,
    string Email,
    Role Role,
    string Department,
    string JobTitle,
    string AvatarColor
);

public sealed record DeskPosition(double X, double Y);

public sealed record Desk(
    string Id,
    string Code,
    string Name,
    string LocationId,
    string FloorId,
    string ZoneId,
    DeskType DeskType,
    DeskAllocationType? AllocationType,
    string? DesignatedUserId,
    string? DesignatedUserName,
    string? DesignatedDepartment,
    bool? RequiresApproval,
    IReadOnlyList<string> Equipment,
    DeskStatus Status,
    DeskPosition Position,
    int? Rotation = null,
    string? Notes = null
);

public sealed record Zone(
    string Id,
    string FloorId,
    string Name,
    string Code,
    string Description
);

public sealed record FloorElement(
    string Id,
    string Name,
    FloorElementType Type,
    double X,
    double Y,
    double Width,
    double Height,
    string? Label = null
);

public sealed record Floor(
    string Id,
    string LocationId,
    string Name,
    int Level,
    IReadOnlyList<Zone> Zones,
    IReadOnlyList<FloorElement>? Elements = null
);

public sealed record Location(
    string Id,
    string Name,
    string City,
    string Country,
    string Address,
    string Timezone,
    IReadOnlyList<Floor> Floors,
    int AdvanceBookingDaysLimit,
    string OpeningHours,
    string Description
);

public sealed record Booking(
    string Id,
    string DeskId,
    string DeskCode,
    string DeskName,
    string LocationId,
    string LocationName,
    string FloorId,
    string FloorName,
    string UserId,
    string UserName,
    string UserEmail,
    string UserDepartment,
    string Date,
    SlotType Slot,
    BookingStatus Status,
    string CreatedAt,
    string? CancelledAt = null,
    string? CheckInAt = null,
    string? Notes = null,
    string? ApprovalReason = null,
    string? ReviewedBy = null,
    string? ReviewedAt = null,
    string? ReviewNotes = null
);
