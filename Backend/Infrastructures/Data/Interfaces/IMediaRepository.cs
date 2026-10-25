using Domains.Entities;

namespace Infrastructures.Data.Interfaces;

public interface IMediaRepository
{
    Task<MediaFile?> FindOwnedMediaAsync(
        Guid mediaId, CancellationToken cancellationToken = default);
    Task<MediaFile?> FindMediaIncludingDeletedAsync(
        Guid mediaId, CancellationToken cancellationToken = default);
    Task<bool> ActivePostExistsAsync(Guid postId, CancellationToken cancellationToken = default);
    Task<bool> PostExistsAsync(
        Guid postId, bool includeDeleted, CancellationToken cancellationToken = default);
}
