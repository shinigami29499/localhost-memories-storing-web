using Microsoft.EntityFrameworkCore;
using Domains.Entities;
using Infrastructures.Adapters.Storage;
using Infrastructures.Data.Interfaces;
using Services.Models.Collections;

namespace Infrastructures.Data.Implementations;

public sealed class CollectionRepository(ApplicationDbContext db) : ICollectionRepository
{
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

    public Task<CollectionSource?> GetCollectionSourceAsync(
        Guid collectionId, CancellationToken cancellationToken = default)
        => Project(db.Collections.AsNoTracking().Where(collection => collection.Id == collectionId), null)
            .FirstOrDefaultAsync(cancellationToken);

    public Task<Collection?> FindCollectionAsync(
        Guid collectionId, CancellationToken cancellationToken = default)
        => db.Collections.FirstOrDefaultAsync(collection => collection.Id == collectionId, cancellationToken);

    public async Task<IReadOnlyList<Guid>> GetCollectionMediaIdsPageAsync(
        Guid collectionId, int offset, int limit, CancellationToken cancellationToken = default)
        => await db.CollectionMedia.AsNoTracking()
            .Where(item => item.CollectionId == collectionId && item.MediaFile.DeletedAt == null)
            .OrderBy(item => item.CreatedAt)
            .ThenBy(item => item.Id)
            .Skip(offset)
            .Take(limit)
            .Select(item => item.MediaFileId)
            .ToListAsync(cancellationToken);

    public Task<long> CountCollectionMediaAsync(
        Guid collectionId, CancellationToken cancellationToken = default)
        => db.CollectionMedia
            .Where(item => item.CollectionId == collectionId && item.MediaFile.DeletedAt == null)
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
        => db.MediaFiles.AnyAsync(media => media.Id == mediaId, cancellationToken);

    public Task<CollectionMedia?> FindCollectionMediaAsync(
        Guid collectionId, Guid mediaId, CancellationToken cancellationToken = default)
        => db.CollectionMedia.FirstOrDefaultAsync(
            item => item.CollectionId == collectionId && item.MediaFileId == mediaId,
            cancellationToken);

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

    // A custom preview is valid only while an active saved image remains in the collection.
    private static IQueryable<CollectionSource> Project(
        IQueryable<Collection> query, Guid? mediaId)
        => query.Select(collection => new CollectionSource(
            collection,
            collection.Owner,
            collection.MediaItems.Count(item => item.MediaFile.DeletedAt == null),
            collection.PreviewMediaFileId != null
                && collection.MediaItems.Any(item =>
                    item.MediaFileId == collection.PreviewMediaFileId
                    && item.MediaFile.MediaKind == MediaKinds.Image
                    && item.MediaFile.DeletedAt == null)
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
                item.MediaFileId == mediaId && item.MediaFile.DeletedAt == null)));
}
