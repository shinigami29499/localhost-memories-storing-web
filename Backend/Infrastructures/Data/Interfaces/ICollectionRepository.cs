using Domains.Entities;
using Services.Models.Collections;

namespace Infrastructures.Data.Interfaces;

public interface ICollectionRepository
{
    Task<IReadOnlyList<CollectionSource>> GetOwnedCollectionsAsync(
        Guid ownerId, Guid? postId, CancellationToken cancellationToken = default);
    /// <summary>Public collections owned by other users; the viewer's own appear only in the "mine" scope.</summary>
    Task<IReadOnlyList<CollectionSource>> GetPublicCollectionsAsync(
        Guid excludedOwnerId, Guid? postId, CancellationToken cancellationToken = default);
    Task<CollectionSource?> GetCollectionSourceAsync(Guid collectionId, CancellationToken cancellationToken = default);
    Task<Collection?> FindCollectionAsync(Guid collectionId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Guid>> GetCollectionPostIdsPageAsync(
        Guid collectionId, int offset, int limit, CancellationToken cancellationToken = default);
    Task<long> CountCollectionPostsAsync(Guid collectionId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Post>> GetPostsWithMediaAsync(
        IReadOnlyCollection<Guid> postIds, CancellationToken cancellationToken = default);
    Task<bool> PostExistsAsync(Guid postId, CancellationToken cancellationToken = default);
    Task<CollectionPost?> FindCollectionPostAsync(
        Guid collectionId, Guid postId, CancellationToken cancellationToken = default);
    Task<bool> IsCollectionImageAsync(Guid collectionId, Guid mediaId, CancellationToken cancellationToken = default);
    Task<bool> IsPostMediaAsync(Guid postId, Guid mediaId, CancellationToken cancellationToken = default);
    Task DeleteCollectionPostsAsync(
        Guid collectionId, Guid actorId, DateTime utcNow, CancellationToken cancellationToken = default);
    void AddCollection(Collection collection);
    void AddCollectionPost(CollectionPost collectionPost);
}
