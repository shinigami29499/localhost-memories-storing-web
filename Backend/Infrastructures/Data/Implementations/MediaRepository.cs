using Microsoft.EntityFrameworkCore;
using Domains.Entities;
using Infrastructures.Data.Interfaces;
using Services.Models.Media;

namespace Infrastructures.Data.Implementations;

public sealed class MediaRepository(ApplicationDbContext db) : IMediaRepository
{
    public async Task AssignHomeToUnlocatedPhotosAsync(
        Guid ownerId, MediaLocationDto location, CancellationToken cancellationToken = default)
    {
        var patch = MediaLocationMetadata.Write(null, location);
        // Merge atomically so concurrent pins and unrelated metadata are preserved.
        await db.Database.ExecuteSqlInterpolatedAsync($$"""
            UPDATE media_files
            SET metadata = COALESCE(metadata, '{}'::jsonb) || {{patch}}::jsonb,
                updated_at = {{DateTime.UtcNow}}, updated_by = {{ownerId}}
            WHERE owner_id = {{ownerId}} AND media_kind = 'image' AND deleted_at IS NULL
                AND metadata->>'location' IS NULL
            """, cancellationToken);
    }

    public async Task<IReadOnlyList<MediaFile>> GetLocationScanBatchAsync(
        Guid actorId, bool isAdmin, int offset, int limit, CancellationToken cancellationToken)
        => await db.MediaFiles.AsNoTracking()
            .Where(media => media.MediaKind == "image" && (isAdmin || media.OwnerId == actorId))
            .Where(media => media.Metadata == null || !EF.Functions.JsonExists(media.Metadata, "locationScanned"))
            .OrderBy(media => media.Id)
            .Skip(offset).Take(limit)
            .ToListAsync(cancellationToken);

    public async Task<bool> TrySetExtractedLocationAsync(
        Guid mediaId, Guid actorId, string metadata, CancellationToken cancellationToken)
    {
        // A manual pin/removal marks metadata scanned, so a concurrent scan cannot overwrite it.
        var changed = await db.MediaFiles
            .Where(media => media.Id == mediaId)
            .Where(media => media.Metadata == null || !EF.Functions.JsonExists(media.Metadata, "locationScanned"))
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(media => media.Metadata, metadata)
                .SetProperty(media => media.UpdatedAt, DateTime.UtcNow)
                .SetProperty(media => media.UpdatedBy, actorId), cancellationToken);
        return changed > 0;
    }

    public Task<MediaFile?> FindOwnedMediaAsync(
        Guid mediaId, CancellationToken cancellationToken = default)
        => db.MediaFiles.FirstOrDefaultAsync(m => m.Id == mediaId, cancellationToken);

    public Task<MediaFile?> FindMediaIncludingDeletedAsync(
        Guid mediaId, CancellationToken cancellationToken = default)
        => db.MediaFiles
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(m => m.Id == mediaId, cancellationToken);

    public async Task PermanentlyDeleteMediaAsync(
        Guid mediaId, Guid actorId, CancellationToken cancellationToken = default)
    {
        var utcNow = DateTime.UtcNow;
        // Only this explicit purge path bypasses the DbContext's physical-delete guard.
        await db.Collections.IgnoreQueryFilters()
            .Where(collection => collection.PreviewMediaFileId == mediaId)
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(collection => collection.PreviewMediaFileId, (Guid?)null)
                    .SetProperty(collection => collection.UpdatedAt, utcNow)
                    .SetProperty(collection => collection.UpdatedBy, actorId),
                cancellationToken);
        await db.CollectionMedia.IgnoreQueryFilters()
            .Where(item => item.MediaFileId == mediaId)
            .ExecuteDeleteAsync(cancellationToken);
        await db.MediaFavorites.IgnoreQueryFilters()
            .Where(favorite => favorite.MediaFileId == mediaId)
            .ExecuteDeleteAsync(cancellationToken);
        await db.MediaFiles.IgnoreQueryFilters()
            .Where(media => media.Id == mediaId)
            .ExecuteDeleteAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<(MediaFile Media, string? OwnerUsername)>> GetMediaPageAsync(
        int offset,
        int limit,
        string? mediaKind,
        Guid? favoriteUserId,
        bool includeDeleted,
        CancellationToken cancellationToken = default)
    {
        var query = BuildMediaQuery(mediaKind, favoriteUserId, includeDeleted);
        var page = await query
            .OrderByDescending(media => media.CreatedAt)
            .ThenByDescending(media => media.Id)
            .Skip(offset)
            .Take(limit)
            .Select(media => new
            {
                Media = media,
                OwnerUsername = db.Users
                    .Where(user => user.Id == media.OwnerId)
                    .Select(user => user.Username)
                    .FirstOrDefault(),
            })
            .ToListAsync(cancellationToken);
        return page.Select(item => (item.Media, item.OwnerUsername)).ToList();
    }

    public Task<long> CountMediaAsync(
        string? mediaKind,
        Guid? favoriteUserId,
        bool includeDeleted,
        CancellationToken cancellationToken = default)
        => BuildMediaQuery(mediaKind, favoriteUserId, includeDeleted).LongCountAsync(cancellationToken);

    public Task<bool> MediaExistsAsync(Guid mediaId, CancellationToken cancellationToken = default)
        => db.MediaFiles.AnyAsync(media => media.Id == mediaId, cancellationToken);

    public async Task<IReadOnlyCollection<Guid>> GetFavoritedMediaIdsAsync(
        Guid userId, IReadOnlyCollection<Guid> mediaIds, CancellationToken cancellationToken = default)
        => await db.MediaFavorites.AsNoTracking()
            .Where(favorite => favorite.UserId == userId && mediaIds.Contains(favorite.MediaFileId))
            .Select(favorite => favorite.MediaFileId)
            .ToListAsync(cancellationToken);

    public Task<MediaFavorite?> FindMediaFavoriteAsync(
        Guid userId, Guid mediaId, bool includeDeleted, CancellationToken cancellationToken = default)
    {
        var query = db.MediaFavorites.AsQueryable();
        if (includeDeleted)
        {
            // Older deleted favorites can coexist with an active one.
            query = query.IgnoreQueryFilters()
                .OrderBy(favorite => favorite.DeletedAt != null)
                .ThenByDescending(favorite => favorite.DeletedAt)
                .ThenBy(favorite => favorite.Id);
        }
        return query.FirstOrDefaultAsync(
            favorite => favorite.UserId == userId && favorite.MediaFileId == mediaId,
            cancellationToken);
    }

    public void AddMediaFile(MediaFile mediaFile) => db.MediaFiles.Add(mediaFile);

    public void AddMediaFavorite(MediaFavorite favorite) => db.MediaFavorites.Add(favorite);

    private IQueryable<MediaFile> BuildMediaQuery(string? mediaKind, Guid? favoriteUserId, bool includeDeleted)
    {
        var query = db.MediaFiles.AsNoTracking();
        if (includeDeleted)
            query = query.IgnoreQueryFilters().Where(media => media.DeletedAt != null);
        if (mediaKind is not null)
            query = query.Where(media => media.MediaKind == mediaKind);
        if (favoriteUserId is { } userId)
            query = query.Where(media => db.MediaFavorites.Any(
                favorite => favorite.UserId == userId && favorite.MediaFileId == media.Id));
        return query;
    }
}
