using Microsoft.EntityFrameworkCore;
using Domains.Entities;
using Infrastructures.Adapters.Storage;
using Infrastructures.Data.Interfaces;
using Services.Models.Collections;

namespace Infrastructures.Data.Implementations;

public sealed class CollectionRepository(ApplicationDbContext db) : ICollectionRepository
{
    public async Task<IReadOnlyList<CollectionSource>> GetCollectionsPageAsync(
        Guid viewerId, string scope, Guid? mediaId, int limit, DateTime? cursorDate, Guid? cursorId, string? search,
        CancellationToken cancellationToken = default)
    {
        IQueryable<Collection> query = scope switch
        {
            "mine" => db.Collections.AsNoTracking().Where(collection => collection.OwnerId == viewerId),
            "public" => db.Collections.AsNoTracking().Where(collection => collection.IsPublic && collection.OwnerId != viewerId),
            "feed" => db.Collections.AsNoTracking().Where(collection => collection.IsPublic || collection.OwnerId == viewerId),
            "all" => db.Collections.AsNoTracking(),
            _ => throw new ArgumentOutOfRangeException(nameof(scope)),
        };
        if (!string.IsNullOrWhiteSpace(search))
        {
            var escaped = search.Trim().Replace("\\", "\\\\", StringComparison.Ordinal)
                .Replace("%", "\\%", StringComparison.Ordinal).Replace("_", "\\_", StringComparison.Ordinal);
            var pattern = $"%{escaped}%";
            query = query.Where(collection => EF.Functions.ILike(collection.Name, pattern, "\\"));
        }
        if (cursorDate is { } date && cursorId is { } id)
            query = query.Where(collection => EF.Functions.LessThan(
                ValueTuple.Create(collection.CreatedAt, collection.Id), ValueTuple.Create(date, id)));
        return await Project(query.OrderByDescending(collection => collection.CreatedAt)
                .ThenByDescending(collection => collection.Id).Take(limit + 1), mediaId)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<(Guid MediaId, Guid AlbumId)>> GetOwnedMembershipAsync(
        Guid ownerId, IReadOnlyCollection<Guid> mediaIds, CancellationToken cancellationToken = default)
    {
        var rows = await db.CollectionMedia.AsNoTracking()
            .Where(item => item.Collection.OwnerId == ownerId
                && mediaIds.Contains(item.MediaFileId)
                && item.MediaFile.DeletedAt == null
                && !item.MediaFile.IsPreviewOnly)
            .Select(item => new { MediaId = item.MediaFileId, AlbumId = item.CollectionId })
            .ToListAsync(cancellationToken);
        return rows.Select(row => (row.MediaId, row.AlbumId)).ToList();
    }

    public async Task<IReadOnlyList<CollectionSource>> GetOwnedCollectionsAsync(
        Guid ownerId, Guid? mediaId, CancellationToken cancellationToken = default)
        => await Project(
                db.Collections.AsNoTracking()
                    .Where(collection => collection.OwnerId == ownerId)
                    .OrderByDescending(collection => collection.CreatedAt)
                    .ThenByDescending(collection => collection.Id),
                mediaId)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<CollectionSource>> GetPublicCollectionsAsync(
        Guid excludedOwnerId, Guid? mediaId, CancellationToken cancellationToken = default)
        => await Project(
                db.Collections.AsNoTracking()
                    .Where(collection => collection.IsPublic && collection.OwnerId != excludedOwnerId)
                    .OrderByDescending(collection => collection.CreatedAt)
                    .ThenByDescending(collection => collection.Id),
                mediaId)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<CollectionSource>> GetAllCollectionsAsync(
        Guid? mediaId, CancellationToken cancellationToken = default)
        => await Project(
                db.Collections.AsNoTracking()
                    .OrderByDescending(collection => collection.CreatedAt)
                    .ThenByDescending(collection => collection.Id),
                mediaId)
            .ToListAsync(cancellationToken);

    public Task<CollectionSource?> GetCollectionSourceAsync(
        Guid collectionId, CancellationToken cancellationToken = default)
        => Project(db.Collections.AsNoTracking().Where(collection => collection.Id == collectionId), null)
            .FirstOrDefaultAsync(cancellationToken);

    public Task<Collection?> FindCollectionAsync(
        Guid collectionId, CancellationToken cancellationToken = default)
        => db.Collections.FirstOrDefaultAsync(collection => collection.Id == collectionId, cancellationToken);

    public Task<IReadOnlyList<Guid>> GetCollectionMediaIdsPageAsync(
        Guid collectionId, int offset, int limit, CancellationToken cancellationToken = default)
        => GetCollectionMediaIdsPageAsync(collectionId, offset, limit, null, cancellationToken);

    public async Task<IReadOnlyList<Guid>> GetCollectionMediaIdsPageAsync(
        Guid collectionId, int offset, int limit, string? mediaKind, CancellationToken cancellationToken = default)
        => await db.CollectionMedia.AsNoTracking()
            .Where(item => item.CollectionId == collectionId && item.MediaFile.DeletedAt == null
                && (mediaKind == null || item.MediaFile.MediaKind == mediaKind))
            .OrderBy(item => item.CreatedAt)
            .ThenBy(item => item.Id)
            .Skip(offset)
            .Take(limit)
            .Select(item => item.MediaFileId)
            .ToListAsync(cancellationToken);

    public Task<long> CountCollectionMediaAsync(
        Guid collectionId, CancellationToken cancellationToken = default)
        => CountCollectionMediaAsync(collectionId, null, cancellationToken);

    public Task<long> CountCollectionMediaAsync(
        Guid collectionId, string? mediaKind, CancellationToken cancellationToken = default)
        => db.CollectionMedia
            .Where(item => item.CollectionId == collectionId && item.MediaFile.DeletedAt == null
                && (mediaKind == null || item.MediaFile.MediaKind == mediaKind))
            .LongCountAsync(cancellationToken);

    public async Task<IReadOnlyList<MediaFile>> GetMediaFilesAsync(
        IReadOnlyCollection<Guid> mediaIds, CancellationToken cancellationToken = default)
        => await db.MediaFiles.AsNoTracking()
            .Where(media => mediaIds.Contains(media.Id))
            .ToListAsync(cancellationToken);

    public Task<bool> IsCollectionImageAsync(
        Guid collectionId, Guid mediaId, CancellationToken cancellationToken = default)
        => db.CollectionMedia.AnyAsync(item =>
                item.CollectionId == collectionId
                && item.MediaFileId == mediaId
                && item.MediaFile.MediaKind == MediaKinds.Image
                && item.MediaFile.DeletedAt == null,
            cancellationToken);

    public Task<bool> MediaExistsAsync(Guid mediaId, CancellationToken cancellationToken = default)
        => db.MediaFiles.AnyAsync(media => media.Id == mediaId && !media.IsPreviewOnly, cancellationToken);

    public Task<CollectionMedia?> FindCollectionMediaAsync(
        Guid collectionId, Guid mediaId, CancellationToken cancellationToken = default)
        => db.CollectionMedia.FirstOrDefaultAsync(
            item => item.CollectionId == collectionId && item.MediaFileId == mediaId,
            cancellationToken);

    public async Task<IReadOnlyList<CollectionMedia>> GetCollectionMediaEntriesAsync(
        Guid collectionId, IReadOnlyCollection<Guid> mediaIds, bool includeDeleted,
        CancellationToken cancellationToken = default)
    {
        var query = db.CollectionMedia.AsQueryable();
        if (includeDeleted)
            query = query.IgnoreQueryFilters();
        return await query.Where(item => item.CollectionId == collectionId && mediaIds.Contains(item.MediaFileId))
            .OrderBy(item => item.DeletedAt != null)
            .ThenByDescending(item => item.DeletedAt)
            .ThenBy(item => item.Id)
            .ToListAsync(cancellationToken);
    }

    public async Task DeleteCollectionMediaAsync(
        Guid collectionId, Guid actorId, DateTime utcNow, CancellationToken cancellationToken = default)
        => await db.CollectionMedia
            .Where(item => item.CollectionId == collectionId)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(item => item.DeletedAt, utcNow)
                .SetProperty(item => item.DeletedBy, actorId)
                .SetProperty(item => item.UpdatedAt, utcNow)
                .SetProperty(item => item.UpdatedBy, actorId), cancellationToken);

    public void AddCollection(Collection collection) => db.Collections.Add(collection);

    public void AddCollectionMedia(CollectionMedia collectionMedia) => db.CollectionMedia.Add(collectionMedia);

    // Custom previews may come from gallery media or the shared preview pool.
    private static IQueryable<CollectionSource> Project(
        IQueryable<Collection> query, Guid? mediaId)
        => query.Select(collection => new CollectionSource(
            collection,
            collection.Owner,
            collection.MediaItems.Count(item => item.MediaFile.DeletedAt == null),
            collection.PreviewMediaFileId != null
                && collection.PreviewMediaFile != null
                && collection.PreviewMediaFile.MediaKind == MediaKinds.Image
                && collection.PreviewMediaFile.DeletedAt == null
                ? collection.PreviewMediaFileId
                : null,
            collection.MediaItems
                .Where(item => item.MediaFile.MediaKind == MediaKinds.Image
                    && item.MediaFile.DeletedAt == null)
                .OrderBy(item => item.CreatedAt)
                .ThenBy(item => item.Id)
                .Select(item => (Guid?)item.MediaFileId)
                .FirstOrDefault(),
            mediaId != null && collection.MediaItems.Any(item =>
                item.MediaFileId == mediaId && item.MediaFile.DeletedAt == null),
            collection.PreviewMediaFile != null && collection.PreviewMediaFile.IsPreviewOnly
                && collection.PreviewMediaFile.DeletedAt == null));
}
