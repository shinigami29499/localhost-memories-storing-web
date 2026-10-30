using Services.Models.Media;
using Services.Responses.Media;
using Services.Requests.Media;

namespace Services.Interfaces;

public interface IMediaService
{
    Task SetLocationAsync(
        Guid mediaId, Guid actorId, bool isAdmin, SetMediaLocationRequest request,
        CancellationToken cancellationToken = default);
    Task<ScanMediaLocationsResponse> ScanLocationsAsync(
        Guid actorId, bool isAdmin, int offset, CancellationToken cancellationToken = default);
    Task<MediaFileContent> GetMediaFileAsync(
        Guid mediaId, bool includeDeleted, CancellationToken cancellationToken = default, bool preview = false);
    Task DeleteMediaAsync(Guid mediaId, Guid actorId, bool isAdmin, CancellationToken cancellationToken = default);
    Task RestoreMediaAsync(Guid mediaId, Guid actorId, bool isAdmin, CancellationToken cancellationToken = default);
    Task PermanentlyDeleteMediaAsync(
        Guid mediaId, Guid actorId, bool isAdmin, CancellationToken cancellationToken = default);
    Task<PagedMediaResponse<MediaFileDto>> GetMediaPageAsync(
        Guid viewerId, int offset, int limit, string? mediaKind, bool favoritesOnly, bool includeDeleted,
        CancellationToken cancellationToken = default);
    Task SetMediaFavoriteAsync(
        Guid mediaId, Guid userId, bool isFavorite, CancellationToken cancellationToken = default);
}
