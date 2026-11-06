using Microsoft.EntityFrameworkCore;
using Domains.Entities;
using Infrastructures.Data.Interfaces;
using Services.Models.Media;
using Services.Models.Place;

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
            WHERE owner_id = {{ownerId}} AND media_kind = 'image' AND deleted_at IS NULL AND NOT is_preview_only
                AND metadata->>'location' IS NULL
            """, cancellationToken);
    }

    public async Task<IReadOnlyList<MediaFile>> GetLocationScanBatchAsync(
        Guid actorId, bool isAdmin, int offset, int limit, CancellationToken cancellationToken)
        => await db.MediaFiles.AsNoTracking()
            .Where(media => !media.IsPreviewOnly && media.MediaKind == "image" && (isAdmin || media.OwnerId == actorId))
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

    public Task<string?> GetOwnerUsernameAsync(Guid ownerId, CancellationToken cancellationToken = default)
        => db.Users.AsNoTracking().Where(user => user.Id == ownerId)
            .Select(user => user.Username).FirstOrDefaultAsync(cancellationToken);

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
        await db.PlaceMedia.IgnoreQueryFilters()
            .Where(item => item.MediaFileId == mediaId)
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

    public async Task<(IReadOnlyList<(MediaFile Media, string? OwnerUsername)> Items, long Total)> GetLocatedMediaPageAsync(
        int offset, int limit, PlaceMapBounds bounds, CancellationToken cancellationToken = default)
    {
        // CASE avoids casting malformed or missing legacy location metadata.
        var located = db.MediaFiles.FromSqlInterpolated($"""
            SELECT * FROM media_files
            WHERE media_kind = 'image' AND NOT is_preview_only
              AND (CASE WHEN jsonb_typeof(metadata->'location'->'latitude') = 'number'
                   THEN (metadata->'location'->>'latitude')::double precision END) BETWEEN {bounds.South} AND {bounds.North}
              AND (({bounds.West} <= {bounds.East} AND
                    (CASE WHEN jsonb_typeof(metadata->'location'->'longitude') = 'number'
                     THEN (metadata->'location'->>'longitude')::double precision END) BETWEEN {bounds.West} AND {bounds.East})
                OR ({bounds.West} > {bounds.East} AND
                    ((CASE WHEN jsonb_typeof(metadata->'location'->'longitude') = 'number'
                      THEN (metadata->'location'->>'longitude')::double precision END) >= {bounds.West}
                     OR (CASE WHEN jsonb_typeof(metadata->'location'->'longitude') = 'number'
                         THEN (metadata->'location'->>'longitude')::double precision END) <= {bounds.East})))
            """).AsNoTracking();
        var total = await located.LongCountAsync(cancellationToken);
        var page = await located.OrderByDescending(media => media.CreatedAt).ThenByDescending(media => media.Id)
            .Skip(offset).Take(limit)
            .Select(media => new
            {
                Media = media,
                OwnerUsername = db.Users.Where(user => user.Id == media.OwnerId)
                    .Select(user => user.Username).FirstOrDefault(),
            }).ToListAsync(cancellationToken);
        return (page.Select(item => (item.Media, item.OwnerUsername)).ToList(), total);
    }

    public async Task<(IReadOnlyList<(MediaFile Media, string? OwnerUsername)> Items, long Total)> GetUnlocatedMediaPageAsync(
        int offset, int limit, CancellationToken cancellationToken = default)
    {
        var unlocated = db.MediaFiles.FromSqlRaw("""
            SELECT * FROM media_files
            WHERE media_kind = 'image' AND NOT is_preview_only AND metadata->>'location' IS NULL
            """).AsNoTracking();
        var total = await unlocated.LongCountAsync(cancellationToken);
        var page = await unlocated.OrderByDescending(media => media.CreatedAt).ThenByDescending(media => media.Id)
            .Skip(offset).Take(limit)
            .Select(media => new
            {
                Media = media,
                OwnerUsername = db.Users.Where(user => user.Id == media.OwnerId)
                    .Select(user => user.Username).FirstOrDefault(),
            }).ToListAsync(cancellationToken);
        return (page.Select(item => (item.Media, item.OwnerUsername)).ToList(), total);
    }

    public Task<long> CountMediaAsync(
        string? mediaKind,
        Guid? favoriteUserId,
        bool includeDeleted,
        CancellationToken cancellationToken = default)
        => BuildMediaQuery(mediaKind, favoriteUserId, includeDeleted).LongCountAsync(cancellationToken);

    public Task<bool> MediaExistsAsync(Guid mediaId, CancellationToken cancellationToken = default)
        => db.MediaFiles.AnyAsync(media => media.Id == mediaId && !media.IsPreviewOnly, cancellationToken);

    public async Task<IReadOnlyList<(Guid Id, Guid OwnerId, DateTime? UpdatedAt, bool IsDeleted)>> GetMediaChangesAsync(
        DateTime? since, Guid viewerId, bool isAdmin, CancellationToken cancellationToken = default)
        => await db.MediaFiles.IgnoreQueryFilters().AsNoTracking()
            .Where(media => !media.IsPreviewOnly && (isAdmin || media.OwnerId == viewerId)
                && (since == null || media.UpdatedAt > since))
            .OrderBy(media => media.UpdatedAt).ThenBy(media => media.Id)
            .Select(media => new ValueTuple<Guid, Guid, DateTime?, bool>(media.Id, media.OwnerId, media.UpdatedAt, media.IsDeleted))
            .ToListAsync(cancellationToken);

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

    public async Task<IReadOnlyCollection<Guid>> GetExistingMediaIdsAsync(
        IReadOnlyCollection<Guid> mediaIds, CancellationToken cancellationToken = default)
        => await db.MediaFiles.Where(media => mediaIds.Contains(media.Id) && !media.IsPreviewOnly)
            .Select(media => media.Id).ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<MediaFavorite>> GetMediaFavoritesAsync(
        Guid userId, IReadOnlyCollection<Guid> mediaIds, bool includeDeleted,
        CancellationToken cancellationToken = default)
    {
        var query = db.MediaFavorites.AsQueryable();
        if (includeDeleted)
            query = query.IgnoreQueryFilters();
        return await query.Where(favorite => favorite.UserId == userId && mediaIds.Contains(favorite.MediaFileId))
            .OrderBy(favorite => favorite.DeletedAt != null)
            .ThenByDescending(favorite => favorite.DeletedAt)
            .ThenBy(favorite => favorite.Id)
            .ToListAsync(cancellationToken);
    }

    public void AddMediaFile(MediaFile mediaFile) => db.MediaFiles.Add(mediaFile);

    public void AddMediaFavorite(MediaFavorite favorite) => db.MediaFavorites.Add(favorite);

    private IQueryable<MediaFile> BuildMediaQuery(string? mediaKind, Guid? favoriteUserId, bool includeDeleted)
    {
        var query = db.MediaFiles.AsNoTracking();
        if (includeDeleted)
            query = query.IgnoreQueryFilters().Where(media => media.DeletedAt != null);
        query = query.Where(media => !media.IsPreviewOnly);
        if (mediaKind is not null)
            query = query.Where(media => media.MediaKind == mediaKind);
        if (favoriteUserId is { } userId)
            query = query.Where(media => db.MediaFavorites.Any(
                favorite => favorite.UserId == userId && favorite.MediaFileId == media.Id));
        return query;
    }
}
