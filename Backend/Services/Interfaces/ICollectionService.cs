using Services.Models.Collections;
using Services.Models.Posts;
using Services.Requests.Collections;
using Services.Responses.Posts;

namespace Services.Interfaces;

public interface ICollectionService
{
    Task<IReadOnlyList<CollectionDto>> GetCollectionsAsync(
        Guid viewerId, CollectionListRequest request, CancellationToken cancellationToken = default);
    Task<CollectionDto> GetCollectionAsync(
        Guid collectionId, Guid viewerId, CancellationToken cancellationToken = default);
    Task<PagedFeedResponse<PostSummaryDto>> GetCollectionPostsAsync(
        Guid collectionId, Guid viewerId, int offset, int limit, CancellationToken cancellationToken = default);
    Task<CollectionDto> CreateCollectionAsync(
        Guid ownerId, CreateCollectionRequest request, CancellationToken cancellationToken = default);
    Task<CollectionDto> UpdateCollectionAsync(
        Guid collectionId, Guid ownerId, UpdateCollectionRequest request, CancellationToken cancellationToken = default);
    Task DeleteCollectionAsync(Guid collectionId, Guid ownerId, CancellationToken cancellationToken = default);
    Task<CollectionDto> AddPostAsync(
        Guid collectionId, Guid ownerId, Guid postId, CancellationToken cancellationToken = default);
    Task<CollectionDto> RemovePostAsync(
        Guid collectionId, Guid ownerId, Guid postId, CancellationToken cancellationToken = default);
}
