using Domains.Entities;
using Services.Models.Collections;

namespace Infrastructures.Data.Interfaces;

public interface ICollectionRepository
{
    Task<IReadOnlyList<(Guid MediaId, Guid AlbumId)>> GetOwnedMembershipAsync(
        Guid ownerId, IReadOnlyCollection<Guid> mediaIds, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<CollectionSource>> GetCollectionsPageAsync(
        Guid viewerId, string scope, Guid? mediaId, int limit, DateTime? cursorDate, Guid? cursorId, string? search,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyList<CollectionSource>> GetOwnedCollectionsAsync(
        Guid ownerId, Guid? mediaId, CancellationToken cancellationToken = default);
    /// <summary>Public collections owned by other users; the viewer's own appear only in the "mine" scope.</summary>
    Task<IReadOnlyList<CollectionSource>> GetPublicCollectionsAsync(
        Guid excludedOwnerId, Guid? mediaId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<CollectionSource>> GetAllCollectionsAsync(
        Guid? mediaId, CancellationToken cancellationToken = default);
    Task<CollectionSource?> GetCollectionSourceAsync(Guid collectionId, CancellationToken cancellationToken = default);
    Task<Collection?> FindCollectionAsync(Guid collectionId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Guid>> GetCollectionMediaIdsPageAsync(
        Guid collectionId, int offset, int limit, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Guid>> GetCollectionMediaIdsPageAsync(
        Guid collectionId, int offset, int limit, string? mediaKind, CancellationToken cancellationToken = default);
    Task<long> CountCollectionMediaAsync(Guid collectionId, CancellationToken cancellationToken = default);
    Task<long> CountCollectionMediaAsync(
        Guid collectionId, string? mediaKind, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<MediaFile>> GetMediaFilesAsync(
        IReadOnlyCollection<Guid> mediaIds, CancellationToken cancellationToken = default);
    Task<bool> IsCollectionImageAsync(Guid collectionId, Guid mediaId, CancellationToken cancellationToken = default);
    Task<bool> MediaExistsAsync(Guid mediaId, CancellationToken cancellationToken = default);
    Task<CollectionMedia?> FindCollectionMediaAsync(
        Guid collectionId, Guid mediaId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<CollectionMedia>> GetCollectionMediaEntriesAsync(
        Guid collectionId, IReadOnlyCollection<Guid> mediaIds, bool includeDeleted,
        CancellationToken cancellationToken = default);
    Task DeleteCollectionMediaAsync(
        Guid collectionId, Guid actorId, DateTime utcNow, CancellationToken cancellationToken = default);
    void AddCollection(Collection collection);
    void AddCollectionMedia(CollectionMedia collectionMedia);
}
