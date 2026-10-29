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
    public DbSet<Post> Posts => Set<Post>();
    public DbSet<MediaFile> MediaFiles => Set<MediaFile>();
    public DbSet<Comment> Comments => Set<Comment>();
    public DbSet<Reaction> Reactions => Set<Reaction>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<PostUploadNotification> PostUploadNotifications => Set<PostUploadNotification>();
    public DbSet<UploadBatch> UploadBatches => Set<UploadBatch>();
    public DbSet<UploadItem> UploadItems => Set<UploadItem>();
    public DbSet<Collection> Collections => Set<Collection>();
    public DbSet<CollectionPost> CollectionPosts => Set<CollectionPost>();

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

        modelBuilder.Entity<Post>(entity =>
        {
            entity.Property(p => p.Caption).HasMaxLength(4000).IsRequired();

            entity.HasOne(p => p.User)
                .WithMany()
                .HasForeignKey(p => p.UserId)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasIndex(p => p.UserId);
            entity.HasIndex(p => new { p.DeletedAt, p.CreatedAt });

            entity.HasQueryFilter(p => p.DeletedAt == null);
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

            entity.HasOne(m => m.Post)
                .WithMany(p => p.MediaFiles)
                .HasForeignKey(m => m.PostId)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasIndex(m => m.PostId);
            entity.HasIndex(m => new { m.DeletedAt, m.CreatedAt });

            entity.HasIndex(m => m.RelativePath).IsUnique().HasFilter("deleted_at IS NULL");

            entity.HasQueryFilter(m => m.DeletedAt == null);
        });

        modelBuilder.Entity<Comment>(entity =>
        {
            entity.Property(c => c.Content).HasMaxLength(4000).IsRequired();

            entity.HasOne(c => c.Post)
                .WithMany()
                .HasForeignKey(c => c.PostId)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasOne(c => c.User)
                .WithMany()
                .HasForeignKey(c => c.UserId)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasIndex(c => new { c.PostId, c.CreatedAt });

            entity.HasQueryFilter(c => c.DeletedAt == null);
        });

        modelBuilder.Entity<Reaction>(entity =>
        {
            entity.Property(r => r.ReactionType).HasMaxLength(50).IsRequired();

            entity.HasOne(r => r.Post)
                .WithMany()
                .HasForeignKey(r => r.PostId)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasOne(r => r.User)
                .WithMany()
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.NoAction);

            // Deleted reactions free the unique slot.
            entity.HasIndex(r => new { r.PostId, r.UserId, r.ReactionType })
                .IsUnique()
                .HasFilter("deleted_at IS NULL");

            entity.HasIndex(r => new { r.DeletedAt, r.CreatedAt });

            entity.HasQueryFilter(r => r.DeletedAt == null);
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

        modelBuilder.Entity<PostUploadNotification>(entity =>
        {
            entity.Property(notification => notification.NotificationType)
                .HasMaxLength(32)
                .HasDefaultValue(NotificationTypes.PostUploaded)
                .IsRequired();
            entity.Property(notification => notification.ActorUsername).HasMaxLength(64).IsRequired();
            entity.Property(notification => notification.PostCaption).HasMaxLength(4000).IsRequired();
            entity.Property(notification => notification.CreatedAt).IsRequired();
            entity.HasIndex(notification => new { notification.RecipientId, notification.CreatedAt });
            entity.HasIndex(notification => new { notification.RecipientId, notification.ReadAt });
        });

        modelBuilder.Entity<UploadBatch>(entity =>
        {
            entity.Property(batch => batch.Caption).HasMaxLength(4000).IsRequired();
            entity.HasOne(batch => batch.Post)
                .WithOne()
                .HasForeignKey<UploadBatch>(batch => batch.PostId)
                .OnDelete(DeleteBehavior.NoAction);
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

        modelBuilder.Entity<CollectionPost>(entity =>
        {
            entity.HasOne(cp => cp.Collection)
                .WithMany(c => c.Posts)
                .HasForeignKey(cp => cp.CollectionId)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasOne(cp => cp.Post)
                .WithMany()
                .HasForeignKey(cp => cp.PostId)
                .OnDelete(DeleteBehavior.NoAction);

            // Removed entries free the unique slot so a post can be saved again.
            entity.HasIndex(cp => new { cp.CollectionId, cp.PostId })
                .IsUnique()
                .HasFilter("deleted_at IS NULL");
            entity.HasIndex(cp => new { cp.CollectionId, cp.CreatedAt });
            entity.HasIndex(cp => cp.PostId);

            entity.HasQueryFilter(cp => cp.DeletedAt == null);
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
