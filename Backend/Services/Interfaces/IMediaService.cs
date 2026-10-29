using Services.Models.Media;
using Services.Responses.Media;

namespace Services.Interfaces;

public interface IMediaService
{
    Task<MediaFileContent> GetMediaFileAsync(
        Guid mediaId, bool includeDeleted, CancellationToken cancellationToken = default);
    Task DeleteMediaAsync(Guid mediaId, Guid actorId, bool isAdmin, CancellationToken cancellationToken = default);
    Task RestoreMediaAsync(Guid mediaId, Guid actorId, bool isAdmin, CancellationToken cancellationToken = default);
    Task<PagedMediaResponse<MediaFileDto>> GetMediaPageAsync(
        Guid viewerId, int offset, int limit, string? mediaKind, bool favoritesOnly, bool includeDeleted,
        CancellationToken cancellationToken = default);
    Task SetMediaFavoriteAsync(
        Guid mediaId, Guid userId, bool isFavorite, CancellationToken cancellationToken = default);
}
