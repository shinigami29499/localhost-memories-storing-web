using Services.Models.Media;
using Services.Responses.Media;

namespace Services.Interfaces;

public interface IPreviewService
{
    Task<PagedMediaResponse<MediaFileDto>> ListAsync(
        Guid viewerId, int offset, int limit, CancellationToken cancellationToken = default);
    Task<MediaFileDto> UploadAsync(
        Guid ownerId, Stream content, string filename, long size, CancellationToken cancellationToken = default);
    Task<MediaFileDto> GetImageAsync(Guid mediaId, Guid viewerId, CancellationToken cancellationToken = default);
    Task ReleaseDraftAsync(Guid mediaId, Guid ownerId, CancellationToken cancellationToken = default);
}
