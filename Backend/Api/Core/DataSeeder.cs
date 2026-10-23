using Microsoft.EntityFrameworkCore;
using Data;
using Domain.Entities;
using Domain.Enums;

namespace Api.Core;

/// <summary>Migrates storage and seeds the configured admin once.</summary>
public static class DataSeeder
{
    public static async Task SeedAsync(IServiceProvider services, CancellationToken cancellationToken = default)
    {
        using var scope = services.CreateScope();
        var scoped = scope.ServiceProvider;

        var db = scoped.GetRequiredService<ApplicationDbContext>();

        await db.Database.MigrateAsync(cancellationToken);

        var storageOptions = scoped.GetRequiredService<
            Microsoft.Extensions.Options.IOptions<Infrastructure.Storage.MediaStorageOptions>>().Value;
        var storageRoot = storageOptions.Root;
        Directory.CreateDirectory(Path.Combine(storageRoot, "media", "images"));
        Directory.CreateDirectory(Path.Combine(storageRoot, "media", "videos"));
        Directory.CreateDirectory(Path.Combine(storageRoot, "trash", "images"));
        Directory.CreateDirectory(Path.Combine(storageRoot, "trash", "videos"));

        var configuration = scoped.GetRequiredService<IConfiguration>();
        var logger = scoped.GetRequiredService<ILoggerFactory>().CreateLogger("DataSeeder");

        var username = configuration["Seed:AdminUsername"];
        var password = configuration["Seed:AdminPassword"];

        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
        {
            logger.LogInformation("Admin seeding disabled (Seed:AdminUsername/Seed:AdminPassword not configured)");
            return;
        }

        var adminExists = await db.Users.IgnoreQueryFilters()
            .AnyAsync(u => u.Username == username, cancellationToken);
        if (adminExists)
            return;

        db.Users.Add(new User
        {
            Username = username,
            Password = password,
            Status = AccountStatus.Active,
            Role = UserRole.Admin,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = null,
        });

        await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Seeded local admin account '{Username}'", username);
    }
}
