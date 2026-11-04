using System.Net.Sockets;
using System.Text.Json;
using BookingApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using Npgsql;

namespace BookingApi.Data;

public sealed class DeskinationDbContext(DbContextOptions<DeskinationDbContext> options)
    : DbContext(options)
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DictionaryKeyPolicy = JsonNamingPolicy.CamelCase
    };

    public DbSet<User> Users => Set<User>();
    public DbSet<Location> Locations => Set<Location>();
    public DbSet<Desk> Desks => Set<Desk>();
    public DbSet<Booking> Bookings => Set<Booking>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var floorsConverter = new ValueConverter<IReadOnlyList<Floor>, string>(
            v => JsonSerializer.Serialize(v, JsonOptions),
            v => JsonSerializer.Deserialize<List<Floor>>(v, JsonOptions) ?? new List<Floor>()
        );

        var floorsComparer = new ValueComparer<IReadOnlyList<Floor>>(
            (a, b) => JsonSerializer.Serialize(a, JsonOptions) == JsonSerializer.Serialize(b, JsonOptions),
            v => JsonSerializer.Serialize(v, JsonOptions).GetHashCode(StringComparison.Ordinal),
            v => JsonSerializer.Deserialize<List<Floor>>(JsonSerializer.Serialize(v, JsonOptions), JsonOptions) ?? new List<Floor>()
        );

        var equipmentConverter = new ValueConverter<IReadOnlyList<string>, string>(
            v => JsonSerializer.Serialize(v, JsonOptions),
            v => JsonSerializer.Deserialize<List<string>>(v, JsonOptions) ?? new List<string>()
        );

        var equipmentComparer = new ValueComparer<IReadOnlyList<string>>(
            (a, b) => JsonSerializer.Serialize(a, JsonOptions) == JsonSerializer.Serialize(b, JsonOptions),
            v => JsonSerializer.Serialize(v, JsonOptions).GetHashCode(StringComparison.Ordinal),
            v => JsonSerializer.Deserialize<List<string>>(JsonSerializer.Serialize(v, JsonOptions), JsonOptions) ?? new List<string>()
        );

        var positionConverter = new ValueConverter<DeskPosition, string>(
            v => JsonSerializer.Serialize(v, JsonOptions),
            v => JsonSerializer.Deserialize<DeskPosition>(v, JsonOptions) ?? new DeskPosition(50, 50)
        );

        var positionComparer = new ValueComparer<DeskPosition>(
            (a, b) => a == b,
            v => v.GetHashCode(),
            v => new DeskPosition(v.X, v.Y)
        );

        modelBuilder.Entity<User>(b =>
        {
            b.HasKey(u => u.Id);
            b.HasIndex(u => u.Email).IsUnique();
            b.Property(u => u.Role).HasConversion<string>();
        });

        modelBuilder.Entity<Location>(b =>
        {
            b.HasKey(l => l.Id);
            b.Property(l => l.Floors)
                .HasConversion(floorsConverter)
                .Metadata.SetValueComparer(floorsComparer);
        });

        modelBuilder.Entity<Desk>(b =>
        {
            b.HasKey(d => d.Id);
            b.HasIndex(d => new { d.LocationId, d.FloorId });
            b.Property(d => d.DeskType).HasConversion<string>();
            b.Property(d => d.AllocationType).HasConversion<string>();
            b.Property(d => d.Status).HasConversion<string>();
            b.Property(d => d.Equipment)
                .HasConversion(equipmentConverter)
                .Metadata.SetValueComparer(equipmentComparer);
            b.Property(d => d.Position)
                .HasConversion(positionConverter)
                .Metadata.SetValueComparer(positionComparer);
        });

        modelBuilder.Entity<Booking>(b =>
        {
            b.HasKey(bk => bk.Id);
            b.HasIndex(bk => new { bk.DeskId, bk.Date });
            b.HasIndex(bk => new { bk.UserId, bk.Date });
            b.Property(bk => bk.Slot).HasConversion<string>();
            b.Property(bk => bk.Status).HasConversion<string>();
        });
    }
}

public static class BookingDomainRules
{
    public static bool SlotsOverlap(SlotType existing, SlotType requested) =>
        existing == SlotType.FullDay ||
        requested == SlotType.FullDay ||
        existing == requested;

    public static bool IsActiveBooking(BookingStatus status) =>
        status != BookingStatus.Cancelled && status != BookingStatus.Rejected;

    public static SlotAvailability ComputeDeskAvailability(
        Desk targetDesk,
        IEnumerable<Booking> deskBookingsOnDate,
        User caller)
    {
        var isDesignatedToOther = false;
        string? designatedUser = null;
        var requiresApproval = false;

        if (targetDesk.AllocationType == DeskAllocationType.Designated)
        {
            if (!string.IsNullOrWhiteSpace(targetDesk.DesignatedUserId) &&
                !string.Equals(targetDesk.DesignatedUserId, caller.Id, StringComparison.OrdinalIgnoreCase))
            {
                isDesignatedToOther = true;
                designatedUser = targetDesk.DesignatedUserName;
            }
            else if (!string.IsNullOrWhiteSpace(targetDesk.DesignatedDepartment) &&
                     !string.Equals(targetDesk.DesignatedDepartment, caller.Department, StringComparison.OrdinalIgnoreCase))
            {
                isDesignatedToOther = true;
                designatedUser = targetDesk.DesignatedDepartment;
            }
        }

        if (targetDesk.RequiresApproval == true || targetDesk.AllocationType == DeskAllocationType.RequiresApproval)
        {
            requiresApproval = true;
        }

        var morningAvail = true;
        var afternoonAvail = true;
        var fullDayAvail = true;

        BookedBySlotInfo? morningBy = null;
        BookedBySlotInfo? afternoonBy = null;
        BookedBySlotInfo? fullDayBy = null;

        foreach (var b in deskBookingsOnDate.Where(b => IsActiveBooking(b.Status)))
        {
            var slotInfo = new BookedBySlotInfo(b.UserName, b.UserDepartment);
            if (b.Slot == SlotType.FullDay)
            {
                morningAvail = false;
                afternoonAvail = false;
                fullDayAvail = false;
                fullDayBy = slotInfo;
                morningBy = slotInfo;
                afternoonBy = slotInfo;
            }
            else if (b.Slot == SlotType.Morning)
            {
                morningAvail = false;
                fullDayAvail = false;
                morningBy = slotInfo;
            }
            else if (b.Slot == SlotType.Afternoon)
            {
                afternoonAvail = false;
                fullDayAvail = false;
                afternoonBy = slotInfo;
            }
        }

        return new SlotAvailability(
            Morning: morningAvail,
            Afternoon: afternoonAvail,
            FullDay: fullDayAvail,
            IsDesignatedToOther: isDesignatedToOther,
            DesignatedUser: designatedUser,
            RequiresApproval: requiresApproval,
            BookedBy: new BookedBySlots(
                Morning: morningBy,
                Afternoon: afternoonBy,
                FullDay: fullDayBy
            )
        );
    }

    public static UserStats ComputeUserStats(
        IReadOnlyList<Booking> userBookings,
        string? referenceDate = null,
        string? month = null)
    {
        var refDate = string.IsNullOrWhiteSpace(referenceDate) ? "2026-10-25" : referenceDate.Trim();
        var monthPrefix = !string.IsNullOrWhiteSpace(month)
            ? month.Trim()
            : refDate.Length >= 7 ? refDate[..7] : "2026-10";

        var completed = userBookings.Count(b =>
            b.Status == BookingStatus.CheckedIn ||
            (b.Status == BookingStatus.Confirmed && string.CompareOrdinal(b.Date, refDate) < 0));

        var upcoming = userBookings.Count(b =>
            b.Status == BookingStatus.Confirmed && string.CompareOrdinal(b.Date, refDate) >= 0);

        var cancelled = userBookings.Count(b => b.Status == BookingStatus.Cancelled);
        var pendingApprovals = userBookings.Count(b => b.Status == BookingStatus.PendingApproval);

        var total = userBookings.Count;
        var cancellationRate = total > 0 ? (int)Math.Round((double)cancelled / total * 100) : 0;

        var activeBookings = userBookings.Where(b => IsActiveBooking(b.Status)).ToList();

        MostCommonDeskStat? mostCommonDesk = activeBookings
            .GroupBy(b => b.DeskId)
            .Select(g => new MostCommonDeskStat(
                DeskCode: g.First().DeskCode,
                DeskName: g.First().DeskName,
                Count: g.Count()))
            .OrderByDescending(x => x.Count)
            .FirstOrDefault();

        var morningCount = activeBookings.Count(b => b.Slot == SlotType.Morning);
        var afternoonCount = activeBookings.Count(b => b.Slot == SlotType.Afternoon);
        var fullDayCount = activeBookings.Count(b => b.Slot == SlotType.FullDay);

        var preferredSlot = "balanced";
        if (fullDayCount > morningCount && fullDayCount > afternoonCount)
        {
            preferredSlot = "full_day";
        }
        else if (morningCount > fullDayCount && morningCount > afternoonCount)
        {
            preferredSlot = "morning";
        }
        else if (afternoonCount > fullDayCount && afternoonCount > morningCount)
        {
            preferredSlot = "afternoon";
        }

        var daysInOfficeThisMonth = activeBookings
            .Where(b => b.Status != BookingStatus.PendingApproval && b.Date.StartsWith(monthPrefix, StringComparison.Ordinal))
            .Select(b => b.Date)
            .Distinct(StringComparer.Ordinal)
            .Count();

        return new UserStats(
            TotalBookings: total,
            UpcomingCount: upcoming,
            CompletedCount: completed,
            CancelledCount: cancelled,
            PendingApprovalsCount: pendingApprovals,
            CancellationRate: cancellationRate,
            MostCommonDesk: mostCommonDesk,
            PreferredSlot: preferredSlot,
            DaysInOfficeThisMonth: daysInOfficeThisMonth
        );
    }
}

public static class DatabaseConfigurationExtensions
{
    public static IServiceCollection AddDeskinationDatabase(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection");
        var forceInMemory = string.Equals(
            configuration["Database:Provider"],
            "InMemory",
            StringComparison.OrdinalIgnoreCase);

        var usePostgres = !forceInMemory &&
                          !string.IsNullOrWhiteSpace(connectionString) &&
                          IsPostgresReachable(connectionString);

        services.AddDbContext<DeskinationDbContext>(options =>
        {
            if (usePostgres && !string.IsNullOrWhiteSpace(connectionString))
            {
                options.UseNpgsql(connectionString);
            }
            else
            {
                options.UseInMemoryDatabase("DeskinationWorkspaceDb")
                       .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning));
            }
        });

        return services;
    }

    private static bool IsPostgresReachable(string connectionString)
    {
        try
        {
            var builder = new NpgsqlConnectionStringBuilder(connectionString);
            var host = string.IsNullOrWhiteSpace(builder.Host) ? "localhost" : builder.Host;
            var port = builder.Port > 0 ? builder.Port : 5432;

            using var client = new TcpClient();
            var connectTask = client.ConnectAsync(host, port);
            return connectTask.Wait(TimeSpan.FromMilliseconds(350)) && client.Connected;
        }
        catch
        {
            return false;
        }
    }
}
