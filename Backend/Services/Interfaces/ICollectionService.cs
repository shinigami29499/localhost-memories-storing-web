using Services.Models.Collections;
using Services.Models.Media;
using Services.Requests.Collections;
using Services.Requests.Media;
using Services.Responses.Media;

namespace Services.Interfaces;

public interface ICollectionService
{
    Task<IReadOnlyList<CollectionDto>> GetCollectionsAsync(
        Guid viewerId, CollectionListRequest request, CancellationToken cancellationToken = default);
    Task<CollectionDto> GetCollectionAsync(
        Guid collectionId, Guid viewerId, CancellationToken cancellationToken = default);
    Task<PagedMediaResponse<MediaFileDto>> GetCollectionMediaAsync(
        Guid collectionId, Guid viewerId, int offset, int limit, CancellationToken cancellationToken = default);
    Task<PagedMediaResponse<MediaFileDto>> GetCollectionMediaAsync(
        Guid collectionId, Guid viewerId, MediaPageRequest request, CancellationToken cancellationToken = default);
    Task<CollectionDto> CreateCollectionAsync(
        Guid ownerId, CreateCollectionRequest request, CancellationToken cancellationToken = default);
    Task<CollectionDto> UpdateCollectionAsync(
        Guid collectionId, Guid ownerId, UpdateCollectionRequest request, CancellationToken cancellationToken = default);
    Task<CollectionDto> UpdateCollectionCaptionAsync(
        Guid collectionId, Guid editorId, UpdateCollectionCaptionRequest request,
        CancellationToken cancellationToken = default);
    Task DeleteCollectionAsync(Guid collectionId, Guid ownerId, CancellationToken cancellationToken = default);
    Task<CollectionDto> AddMediaAsync(
        Guid collectionId, Guid ownerId, Guid mediaId, CancellationToken cancellationToken = default);
    Task<CollectionDto> RemoveMediaAsync(
        Guid collectionId, Guid ownerId, Guid mediaId, CancellationToken cancellationToken = default);
}
