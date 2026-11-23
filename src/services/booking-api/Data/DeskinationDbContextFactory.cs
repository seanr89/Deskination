using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace BookingApi.Data;

/// <summary>
/// Design-time factory for <see cref="DeskinationDbContext"/> so EF Core CLI tooling
/// targets PostgreSQL without booting <c>Program.cs</c> or falling back to InMemory.
/// </summary>
public sealed class DeskinationDbContextFactory : IDesignTimeDbContextFactory<DeskinationDbContext>
{
    private const string DefaultConnectionString =
        "Host=localhost;Port=5432;Database=deskination;Username=deskination;Password=deskination_dev_password";

    public DeskinationDbContext CreateDbContext(string[] args)
    {
        var basePath = Directory.GetCurrentDirectory();

        var configuration = new ConfigurationBuilder()
            .SetBasePath(basePath)
            .AddJsonFile("appsettings.json", optional: true)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        var connectionString = configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            connectionString = DefaultConnectionString;
        }

        var optionsBuilder = new DbContextOptionsBuilder<DeskinationDbContext>();
        optionsBuilder.UseNpgsql(
            connectionString,
            npgsql => npgsql.MigrationsAssembly(typeof(DeskinationDbContext).Assembly.GetName().Name));

        return new DeskinationDbContext(optionsBuilder.Options);
    }
}
