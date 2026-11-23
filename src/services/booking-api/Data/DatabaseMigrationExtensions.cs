using System.Data;
using System.Globalization;
using System.Reflection;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Storage;

namespace BookingApi.Data;

/// <summary>
/// Startup helpers for applying Entity Framework Core migrations on relational databases
/// while keeping InMemory development/test execution working cleanly.
/// </summary>
public static class DatabaseMigrationExtensions
{
    private static readonly string[] ExpectedCoreTables =
    [
        "Users",
        "Locations",
        "Desks",
        "Bookings"
    ];

    public static async Task ApplyDatabaseMigrationsAsync(
        this IServiceProvider services,
        IConfiguration? configuration = null,
        ILogger? logger = null,
        CancellationToken cancellationToken = default)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<DeskinationDbContext>();

        if (!db.Database.IsRelational())
        {
            throw new InvalidOperationException(
                $"EF Core migrations require a relational database provider, but '{db.Database.ProviderName ?? "Unknown"}' is configured.");
        }

        var autoMigrate = configuration?.GetValue("Database:AutoMigrate", true) ?? true;
        if (!autoMigrate)
        {
            logger?.LogInformation(
                "Automatic EF Core migrations skipped because Database:AutoMigrate is disabled.");
            return;
        }

        await BaselineLegacyEnsureCreatedSchemaIfNeededAsync(db, logger, cancellationToken);

        var pendingMigrations = (await db.Database.GetPendingMigrationsAsync(cancellationToken)).ToList();
        if (pendingMigrations.Count > 0)
        {
            logger?.LogInformation(
                "Applying {Count} pending EF Core migration(s): {Migrations}",
                pendingMigrations.Count,
                string.Join(", ", pendingMigrations));
        }

        await db.Database.MigrateAsync(cancellationToken);
    }

    private static async Task BaselineLegacyEnsureCreatedSchemaIfNeededAsync(
        DeskinationDbContext db,
        ILogger? logger,
        CancellationToken cancellationToken)
    {
        var databaseCreator = db.GetService<IRelationalDatabaseCreator>();
        if (!await databaseCreator.ExistsAsync(cancellationToken))
        {
            return;
        }

        string? tableCountQuery;
        if (db.Database.IsNpgsql())
        {
            tableCountQuery =
                "SELECT COUNT(*) FROM information_schema.tables " +
                "WHERE table_schema = current_schema() " +
                "AND table_name IN ('Users', 'Locations', 'Desks', 'Bookings')";
        }
        else if (string.Equals(db.Database.ProviderName, "Microsoft.EntityFrameworkCore.Sqlite", StringComparison.Ordinal))
        {
            tableCountQuery =
                "SELECT COUNT(*) FROM sqlite_master " +
                "WHERE type = 'table' " +
                "AND name IN ('Users', 'Locations', 'Desks', 'Bookings')";
        }
        else
        {
            return;
        }

        var connection = db.Database.GetDbConnection();
        var openedConnection = false;
        if (connection.State != ConnectionState.Open)
        {
            await connection.OpenAsync(cancellationToken);
            openedConnection = true;
        }

        long existingTableCount;
        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = tableCountQuery;
            var result = await command.ExecuteScalarAsync(cancellationToken);
            existingTableCount = result is null or DBNull
                ? 0L
                : Convert.ToInt64(result, CultureInfo.InvariantCulture);
        }
        finally
        {
            if (openedConnection)
            {
                await connection.CloseAsync();
            }
        }

        if (existingTableCount < ExpectedCoreTables.Length)
        {
            return;
        }

        var appliedMigrations = await db.Database.GetAppliedMigrationsAsync(cancellationToken);
        if (appliedMigrations.Any())
        {
            return;
        }

        var initialMigrationId = db.Database.GetMigrations().FirstOrDefault();
        if (string.IsNullOrWhiteSpace(initialMigrationId))
        {
            return;
        }

        var historyRepository = db.GetService<IHistoryRepository>();
        var productVersion = typeof(DbContext).Assembly
            .GetCustomAttribute<AssemblyInformationalVersionAttribute>()
            ?.InformationalVersion
            ?.Split('+')[0]
            ?? typeof(DbContext).Assembly.GetName().Version?.ToString(3)
            ?? "10.0.0";

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await db.Database.ExecuteSqlRawAsync(
            historyRepository.GetCreateIfNotExistsScript(),
            cancellationToken);
        await db.Database.ExecuteSqlRawAsync(
            historyRepository.GetInsertScript(new HistoryRow(initialMigrationId, productVersion)),
            cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        logger?.LogInformation(
            "Baselined existing pre-migration database schema to EF Core migration {MigrationId}.",
            initialMigrationId);
    }
}
