# EF Core Persistence, Slot Overlap Matrix & Seed Data Reference

## 1. Slot Overlap Truth Table

| Existing Active Booking on `(DeskId, Date)` | Requested `morning` | Requested `afternoon` | Requested `full_day` |
| :--- | :--- | :--- | :--- |
| **None** | Allowed | Allowed | Allowed |
| **`morning`** | Conflict | Allowed | Conflict |
| **`afternoon`** | Allowed | Conflict | Conflict |
| **`full_day`** | Conflict | Conflict | Conflict |
| **`morning` + `afternoon`** | Conflict | Conflict | Conflict |

C# predicate for checking if an existing booking conflicts with `requestedSlot`:

```csharp
public static bool SlotsOverlap(SlotType existing, SlotType requested) =>
    existing == SlotType.FullDay ||
    requested == SlotType.FullDay ||
    existing == requested;
```

## 2. EF Core `DeskinationDbContext` Setup (.NET 10)

```csharp
using BookingApi.Models;
using Microsoft.EntityFrameworkCore;

namespace BookingApi.Data;

public sealed class DeskinationDbContext(DbContextOptions<DeskinationDbContext> options)
    : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Location> Locations => Set<Location>();
    public DbSet<Desk> Desks => Set<Desk>();
    public DbSet<Booking> Bookings => Set<Booking>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(b =>
        {
            b.HasKey(u => u.Id);
            b.HasIndex(u => u.Email).IsUnique();
        });

        modelBuilder.Entity<Location>(b =>
        {
            b.HasKey(l => l.Id);
            b.OwnsMany(l => l.Floors, f =>
            {
                f.ToJson();
                f.OwnsMany(fl => fl.Zones);
                f.OwnsMany(fl => fl.Elements);
            });
        });

        modelBuilder.Entity<Desk>(b =>
        {
            b.HasKey(d => d.Id);
            b.HasIndex(d => new { d.LocationId, d.FloorId });
            b.OwnsOne(d => d.Position);
            b.PrimitiveCollection(d => d.Equipment);
        });

        modelBuilder.Entity<Booking>(b =>
        {
            b.HasKey(bk => bk.Id);
            b.HasIndex(bk => new { bk.DeskId, bk.Date });
            b.HasIndex(bk => new { bk.UserId, bk.Date });
        });
    }
}
```

## 3. Canonical Seed Users (`INITIAL_USERS`)

Keep seed users in `booking-api` aligned with `src/clients/desk-ui/src/mock/initialData.ts` so Firebase Auth email matching resolves consistent IDs and roles:

- `usr-sarah`: `sarah.chen@acme-corp.internal` (`employee`, Frontend Engineering, Senior Staff Engineer)
- `usr-marcus`: `marcus.vance@acme-corp.internal` (`employee`, Product Design, Lead Product Designer)
- `usr-priya`: `priya.patel@acme-corp.internal` (`employee`, Core Infrastructure, Engineering Manager)
- `usr-david`: `david.kim@acme-corp.internal` (`employee`, Enterprise Sales, Account Executive)
- `usr-admin-elena`: `elena.rostova@acme-corp.internal` (`admin`, Workplace Operations, Director of Workplace & Facilities)
