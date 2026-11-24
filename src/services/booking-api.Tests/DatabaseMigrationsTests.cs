using BookingApi.Data;
using BookingApi.Models;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace BookingApi.Tests;

public sealed class DatabaseMigrationsTests
{
    private static ServiceProvider BuildSqliteServiceProvider(SqliteConnection connection)
    {
        var services = new ServiceCollection();
        services.AddDbContext<DeskinationDbContext>(options =>
            options.UseSqlite(
                    connection,
                    sqlite => sqlite.MigrationsAssembly(typeof(DeskinationDbContext).Assembly.GetName().Name))
                // The Npgsql ModelSnapshot carries PostgreSQL annotations; compare strictly against Npgsql in the dedicated test above.
                .ConfigureWarnings(w => w.Ignore(RelationalEventId.PendingModelChangesWarning)));
        return services.BuildServiceProvider();
    }

    [Fact]
    public void DeskinationDbContext_PostgreSqlModel_HasMigrationsAndNoPendingModelChanges()
    {
        using var db = new DeskinationDbContextFactory().CreateDbContext([]);

        Assert.Equal("Npgsql.EntityFrameworkCore.PostgreSQL", db.Database.ProviderName);

        var migrations = db.Database.GetMigrations().ToList();
        Assert.NotEmpty(migrations);
        Assert.Contains(migrations, m => m.EndsWith("_InitialCreate", StringComparison.Ordinal));

        var migrationsAssembly = db.GetService<IMigrationsAssembly>();
        Assert.NotNull(migrationsAssembly.ModelSnapshot);

        Assert.False(db.Database.HasPendingModelChanges());
    }

    [Fact]
    public void DeskinationDbContext_PostgreSqlIdempotentMigrationScript_CreatesExpectedSchemaAndHistory()
    {
        using var db = new DeskinationDbContextFactory().CreateDbContext([]);
        var migrator = db.GetService<IMigrator>();

        var script = migrator.GenerateScript(options: MigrationsSqlGenerationOptions.Idempotent);

        Assert.Contains("CREATE TABLE IF NOT EXISTS \"__EFMigrationsHistory\"", script);
        Assert.Contains("CREATE TABLE \"Users\"", script);
        Assert.Contains("CREATE TABLE \"Locations\"", script);
        Assert.Contains("CREATE TABLE \"Desks\"", script);
        Assert.Contains("CREATE TABLE \"Bookings\"", script);
        Assert.Contains("IX_Users_Email", script);
        Assert.Contains("IX_Desks_LocationId_FloorId", script);
        Assert.Contains("IX_Bookings_DeskId_Date", script);
        Assert.Contains("IX_Bookings_UserId_Date", script);
    }

    [Fact]
    public async Task ApplyDatabaseMigrationsAsync_AppliesInitialCreateAndSeedsOnRelationalDatabase()
    {
        await using var connection = new SqliteConnection("DataSource=:memory:");
        await connection.OpenAsync();

        using var provider = BuildSqliteServiceProvider(connection);

        await provider.ApplyDatabaseMigrationsAsync();
        await DeskinationSeeder.EnsureSeededAsync(provider);

        using (var verifyScope = provider.CreateScope())
        {
            var db = verifyScope.ServiceProvider.GetRequiredService<DeskinationDbContext>();

            var applied = (await db.Database.GetAppliedMigrationsAsync()).ToList();
            var pending = (await db.Database.GetPendingMigrationsAsync()).ToList();

            Assert.Contains(applied, m => m.EndsWith("_InitialCreate", StringComparison.Ordinal));
            Assert.Empty(pending);

            Assert.Equal(DeskinationSeeder.InitialUsers.Count, await db.Users.CountAsync());
            Assert.Equal(DeskinationSeeder.InitialLocations.Count, await db.Locations.CountAsync());
            Assert.Equal(DeskinationSeeder.InitialDesks.Count, await db.Desks.CountAsync());
            Assert.Equal(DeskinationSeeder.InitialBookings.Count, await db.Bookings.CountAsync());

            var london = await db.Locations.AsNoTracking().SingleAsync(l => l.Id == "loc-london");
            Assert.Equal(2, london.Floors.Count);
            Assert.Contains(london.Floors[0].Zones, z => z.Id == "zn-ldn-focus");

            var focusPod = await db.Desks.AsNoTracking().SingleAsync(d => d.Id == "desk-ldn-401");
            Assert.Equal(DeskType.QuietBooth, focusPod.DeskType);
            Assert.Equal(DeskStatus.Active, focusPod.Status);
            Assert.Equal(new DeskPosition(14, 22), focusPod.Position);
            Assert.NotEmpty(focusPod.Equipment);
        }

        // Re-running migration + seeding must be idempotent
        await provider.ApplyDatabaseMigrationsAsync();
        await DeskinationSeeder.EnsureSeededAsync(provider);

        using var recheckScope = provider.CreateScope();
        var recheckDb = recheckScope.ServiceProvider.GetRequiredService<DeskinationDbContext>();
        Assert.Equal(DeskinationSeeder.InitialUsers.Count, await recheckDb.Users.CountAsync());
        Assert.Equal(DeskinationSeeder.InitialBookings.Count, await recheckDb.Bookings.CountAsync());
    }

    [Fact]
    public async Task ApplyDatabaseMigrationsAsync_WhenAutoMigrateDisabled_LeavesMigrationsPending()
    {
        await using var connection = new SqliteConnection("DataSource=:memory:");
        await connection.OpenAsync();

        using var provider = BuildSqliteServiceProvider(connection);
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Database:AutoMigrate"] = "false"
            })
            .Build();

        await provider.ApplyDatabaseMigrationsAsync(configuration);

        using var scope = provider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<DeskinationDbContext>();

        var applied = (await db.Database.GetAppliedMigrationsAsync()).ToList();
        var pending = (await db.Database.GetPendingMigrationsAsync()).ToList();

        Assert.Empty(applied);
        Assert.Contains(pending, m => m.EndsWith("_InitialCreate", StringComparison.Ordinal));
    }

    [Fact]
    public async Task ApplyDatabaseMigrationsAsync_UpgradesLegacyEnsureCreatedSchemaWithoutDataLoss()
    {
        await using var connection = new SqliteConnection("DataSource=:memory:");
        await connection.OpenAsync();

        using var provider = BuildSqliteServiceProvider(connection);

        // Simulate a legacy PostgreSQL/relational database created via EnsureCreatedAsync() without __EFMigrationsHistory
        using (var setupScope = provider.CreateScope())
        {
            var setupDb = setupScope.ServiceProvider.GetRequiredService<DeskinationDbContext>();
            await setupDb.Database.EnsureCreatedAsync();
            setupDb.Users.AddRange(DeskinationSeeder.InitialUsers);
            await setupDb.SaveChangesAsync();

            var historyExists = await setupDb.GetService<Microsoft.EntityFrameworkCore.Migrations.IHistoryRepository>()
                .ExistsAsync();
            Assert.False(historyExists);
        }

        await provider.ApplyDatabaseMigrationsAsync();

        using var verifyScope = provider.CreateScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<DeskinationDbContext>();

        var applied = (await verifyDb.Database.GetAppliedMigrationsAsync()).ToList();
        var pending = (await verifyDb.Database.GetPendingMigrationsAsync()).ToList();

        Assert.Contains(applied, m => m.EndsWith("_InitialCreate", StringComparison.Ordinal));
        Assert.Empty(pending);
        Assert.Equal(DeskinationSeeder.InitialUsers.Count, await verifyDb.Users.CountAsync());
        Assert.Contains(await verifyDb.Users.AsNoTracking().ToListAsync(), u => u.Id == "usr-admin-elena" && u.Role == Role.Admin);
    }

    [Fact]
    public async Task ApplyDatabaseMigrationsAsync_UpgradesLegacySchemaWhenHistoryTableExistsButIsEmpty()
    {
        await using var connection = new SqliteConnection("DataSource=:memory:");
        await connection.OpenAsync();

        using var provider = BuildSqliteServiceProvider(connection);

        using (var setupScope = provider.CreateScope())
        {
            var setupDb = setupScope.ServiceProvider.GetRequiredService<DeskinationDbContext>();
            await setupDb.Database.EnsureCreatedAsync();
            setupDb.Users.AddRange(DeskinationSeeder.InitialUsers);
            await setupDb.SaveChangesAsync();

            var historyRepository = setupDb.GetService<IHistoryRepository>();
            await setupDb.Database.ExecuteSqlRawAsync(historyRepository.GetCreateIfNotExistsScript());
            Assert.True(await historyRepository.ExistsAsync());
            Assert.Empty(await setupDb.Database.GetAppliedMigrationsAsync());
        }

        await provider.ApplyDatabaseMigrationsAsync();

        using var verifyScope = provider.CreateScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<DeskinationDbContext>();

        var applied = (await verifyDb.Database.GetAppliedMigrationsAsync()).ToList();
        var pending = (await verifyDb.Database.GetPendingMigrationsAsync()).ToList();

        Assert.Contains(applied, m => m.EndsWith("_InitialCreate", StringComparison.Ordinal));
        Assert.Empty(pending);
        Assert.Equal(DeskinationSeeder.InitialUsers.Count, await verifyDb.Users.CountAsync());
    }

    [Fact]
    public void AddDeskinationDatabase_WithoutProviderSettingAndUnreachableHost_StillRegistersPostgreSql()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] =
                    "Host=127.0.0.1;Port=59999;Database=deskination;Username=deskination;Password=secret"
            })
            .Build();

        var services = new ServiceCollection();
        services.AddDeskinationDatabase(configuration);

        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<DeskinationDbContext>();

        Assert.Equal("Npgsql.EntityFrameworkCore.PostgreSQL", db.Database.ProviderName);
    }

    [Fact]
    public void AddDeskinationDatabase_WhenConnectionStringMissing_ThrowsInvalidOperationException()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "   "
            })
            .Build();

        var services = new ServiceCollection();

        var ex = Assert.Throws<InvalidOperationException>(() => services.AddDeskinationDatabase(configuration));
        Assert.Contains("DefaultConnection", ex.Message);
    }

    [Theory]
    [InlineData("InMemory")]
    [InlineData("Sqlite")]
    public void AddDeskinationDatabase_WhenProviderIsInMemoryOrUnsupported_ThrowsInvalidOperationException(
        string providerSetting)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Database:Provider"] = providerSetting,
                ["ConnectionStrings:DefaultConnection"] =
                    "Host=localhost;Port=5432;Database=deskination;Username=deskination;Password=secret"
            })
            .Build();

        var services = new ServiceCollection();

        var ex = Assert.Throws<InvalidOperationException>(() => services.AddDeskinationDatabase(configuration));
        Assert.Contains(providerSetting, ex.Message);
    }
}
