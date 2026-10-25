using Services.Models.Media;

namespace Services.Interfaces;

public interface IMediaService
{
    Task<MediaFileContent> GetMediaFileAsync(
        Guid mediaId, bool includeDeleted, CancellationToken cancellationToken = default);
    Task DeleteMediaAsync(Guid mediaId, Guid actorId, bool isAdmin, CancellationToken cancellationToken = default);
    Task RestoreMediaAsync(Guid mediaId, Guid actorId, bool isAdmin, CancellationToken cancellationToken = default);
}
