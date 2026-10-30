using Microsoft.EntityFrameworkCore;
using Domains.Entities;
using Domains.Enums;
using Infrastructures.Data.Interfaces;

namespace Infrastructures.Data;

/// <summary>Applies soft-delete filters and audit stamping; rejects physical deletes.</summary>
public class ApplicationDbContext(
    DbContextOptions<ApplicationDbContext> options,
    IAuditActorProvider? actorProvider = null) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<MediaFile> MediaFiles => Set<MediaFile>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<UploadBatch> UploadBatches => Set<UploadBatch>();
    public DbSet<UploadItem> UploadItems => Set<UploadItem>();
    public DbSet<Collection> Collections => Set<Collection>();
    public DbSet<CollectionMedia> CollectionMedia => Set<CollectionMedia>();
    public DbSet<MediaFavorite> MediaFavorites => Set<MediaFavorite>();
    public DbSet<FoodPlace> FoodPlaces => Set<FoodPlace>();
    public DbSet<FoodPlaceMedia> FoodPlaceMedia => Set<FoodPlaceMedia>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            entityType.FindProperty(nameof(Entity.Id))?.SetDefaultValueSql("gen_random_uuid()");
        }

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(u => u.Username).IsUnique().HasFilter("deleted_at IS NULL");
            entity.Property(u => u.Status).HasDefaultValue(AccountStatus.Active);

            entity.Property(u => u.Username).HasMaxLength(64).IsRequired();
            entity.Property(u => u.Password).HasMaxLength(128).IsRequired();

            entity.HasQueryFilter(u => u.DeletedAt == null);
        });

        modelBuilder.Entity<MediaFile>(entity =>
        {
            entity.Property(m => m.OriginalFilename).HasMaxLength(260).IsRequired();
            entity.Property(m => m.StoredFilename).HasMaxLength(300).IsRequired();
            entity.Property(m => m.RelativePath).HasMaxLength(500).IsRequired();
            entity.Property(m => m.TrashRelativePath).HasMaxLength(500);
            entity.Property(m => m.MimeType).HasMaxLength(100).IsRequired();
            entity.Property(m => m.FileExtension).HasMaxLength(10).IsRequired();
            entity.Property(m => m.MediaKind).HasMaxLength(20).IsRequired();
            entity.Property(m => m.Metadata).HasColumnType("jsonb");

            entity.HasOne(m => m.Owner)
                .WithMany()
                .HasForeignKey(m => m.OwnerId)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasIndex(m => m.OwnerId);
            entity.HasIndex(m => new { m.DeletedAt, m.CreatedAt });

            entity.HasIndex(m => m.RelativePath).IsUnique().HasFilter("deleted_at IS NULL");

            entity.HasQueryFilter(m => m.DeletedAt == null);
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.Property(t => t.TokenHash).HasMaxLength(128).IsRequired();
            entity.Property(t => t.RevokedReason).HasMaxLength(64);

            entity.HasOne(t => t.User)
                .WithMany()
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasIndex(t => t.TokenHash).IsUnique();
            entity.HasIndex(t => new { t.UserId, t.ExpiresAt });

            entity.HasQueryFilter(t => t.DeletedAt == null);
        });

        modelBuilder.Entity<UploadBatch>(entity =>
        {
            entity.Property(batch => batch.Status)
                .HasConversion(
                    status => status.ToString(),
                    status => status == "Success"
                        ? UploadBatchStatus.Completed
                        : status == "PartialFailure"
                            ? UploadBatchStatus.Failed
                            : Enum.Parse<UploadBatchStatus>(status))
                .HasMaxLength(32);
            entity.HasOne(batch => batch.Owner)
                .WithMany()
                .HasForeignKey(batch => batch.OwnerId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasMany(batch => batch.Items)
                .WithOne(item => item.Batch)
                .HasForeignKey(item => item.UploadBatchId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasIndex(batch => new { batch.OwnerId, batch.CreatedAt });
            entity.HasQueryFilter(batch => batch.DeletedAt == null);
        });

        modelBuilder.Entity<UploadItem>(entity =>
        {
            entity.Property(item => item.OriginalFilename).HasMaxLength(260).IsRequired();
            entity.Property(item => item.ContentType).HasMaxLength(100).IsRequired();
            entity.Property(item => item.Status).HasConversion<string>().HasMaxLength(32);
            entity.Property(item => item.ErrorDetails).HasMaxLength(2000);
            entity.Property(item => item.StoredFilename).HasMaxLength(300);
            entity.Property(item => item.RelativePath).HasMaxLength(500);
            entity.Property(item => item.MimeType).HasMaxLength(100);
            entity.Property(item => item.FileExtension).HasMaxLength(10);
            entity.Property(item => item.MediaKind).HasMaxLength(20);
            entity.Property(item => item.Revision).IsConcurrencyToken();
            entity.HasIndex(item => item.UploadBatchId);
            entity.HasIndex(item => item.UploadBatchId)
                .IsUnique()
                .HasFilter("status = 'Uploading' AND deleted_at IS NULL")
                .HasDatabaseName("ix_upload_items_one_uploading_per_batch");
            entity.HasQueryFilter(item => item.DeletedAt == null);
        });

        modelBuilder.Entity<Collection>(entity =>
        {
            entity.Property(c => c.Name).HasMaxLength(100).IsRequired();
            entity.Property(c => c.Caption).HasMaxLength(4000).IsRequired().HasDefaultValue("");

            entity.HasOne(c => c.Owner)
                .WithMany()
                .HasForeignKey(c => c.OwnerId)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasOne(c => c.PreviewMediaFile)
                .WithMany()
                .HasForeignKey(c => c.PreviewMediaFileId)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasIndex(c => new { c.OwnerId, c.CreatedAt });
            entity.HasIndex(c => new { c.IsPublic, c.CreatedAt });
            entity.HasIndex(c => c.PreviewMediaFileId);

            entity.HasQueryFilter(c => c.DeletedAt == null);
        });

        modelBuilder.Entity<CollectionMedia>(entity =>
        {
            entity.HasOne(item => item.Collection)
                .WithMany(collection => collection.MediaItems)
                .HasForeignKey(item => item.CollectionId)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasOne(item => item.MediaFile)
                .WithMany()
                .HasForeignKey(item => item.MediaFileId)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasIndex(item => new { item.CollectionId, item.MediaFileId })
                .IsUnique()
                .HasFilter("deleted_at IS NULL");
            entity.HasIndex(item => new { item.CollectionId, item.CreatedAt });
            entity.HasIndex(item => item.MediaFileId);

            entity.HasQueryFilter(item => item.DeletedAt == null);
        });

        modelBuilder.Entity<MediaFavorite>(entity =>
        {
            entity.HasOne(favorite => favorite.MediaFile)
                .WithMany()
                .HasForeignKey(favorite => favorite.MediaFileId)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasOne(favorite => favorite.User)
                .WithMany()
                .HasForeignKey(favorite => favorite.UserId)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasIndex(favorite => new { favorite.MediaFileId, favorite.UserId })
                .IsUnique()
                .HasFilter("deleted_at IS NULL");
            entity.HasIndex(favorite => new { favorite.UserId, favorite.CreatedAt });

            entity.HasQueryFilter(favorite => favorite.DeletedAt == null);
        });

        modelBuilder.Entity<FoodPlace>(entity =>
        {
            entity.Property(place => place.Name).HasMaxLength(120).IsRequired();
            entity.Property(place => place.Address).HasMaxLength(300).IsRequired().HasDefaultValue("");
            entity.Property(place => place.Note).HasMaxLength(2000).IsRequired().HasDefaultValue("");
            entity.Property(place => place.MarkerIcon).HasMaxLength(16).IsRequired().HasDefaultValue("");
            entity.Property(place => place.MarkerColor).HasMaxLength(9).IsRequired().HasDefaultValue("");

            entity.HasOne(place => place.Owner)
                .WithMany()
                .HasForeignKey(place => place.OwnerId)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasIndex(place => new { place.OwnerId, place.CreatedAt });
            entity.HasIndex(place => place.CreatedAt);

            entity.HasQueryFilter(place => place.DeletedAt == null);
        });

        modelBuilder.Entity<FoodPlaceMedia>(entity =>
        {
            entity.HasOne(item => item.FoodPlace)
                .WithMany(place => place.MediaItems)
                .HasForeignKey(item => item.FoodPlaceId)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasOne(item => item.MediaFile)
                .WithMany()
                .HasForeignKey(item => item.MediaFileId)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasIndex(item => new { item.FoodPlaceId, item.MediaFileId })
                .IsUnique()
                .HasFilter("deleted_at IS NULL");
            entity.HasIndex(item => new { item.FoodPlaceId, item.Position });
            entity.HasIndex(item => item.MediaFileId);

            entity.HasQueryFilter(item => item.DeletedAt == null);
        });
    }

    public override int SaveChanges() => throw new NotSupportedException(
        "Use SaveChangesAsync — every persistence path in this application is asynchronous.");

    public override int SaveChanges(bool acceptAllChangesOnSuccess) => throw new NotSupportedException(
        "Use SaveChangesAsync — every persistence path in this application is asynchronous.");

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        => await SaveChangesAsync(true, cancellationToken);

    public override async Task<int> SaveChangesAsync(
        bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        ApplyAuditRules();
        return await base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    private void ApplyAuditRules()
    {
        var actor = actorProvider?.GetActor();
        var utcNow = DateTime.UtcNow;

        foreach (var entry in ChangeTracker.Entries<AuditableEntity>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.CreatedAt = utcNow;
                    entry.Entity.CreatedBy ??= actor;
                    break;

                case EntityState.Modified:
                    entry.Entity.UpdatedAt = utcNow;
                    if (actor.HasValue)
                        entry.Entity.UpdatedBy = actor;
                    break;

                case EntityState.Deleted:
                    throw new InvalidOperationException(
                        $"Physical deletion is prohibited: '{entry.Entity.GetType().Name}' with id "
                        + $"'{entry.Entity.Id}' was queued for Remove(). Use soft delete (DeletedAt/DeletedBy) instead.");
            }
        }
    }
}
