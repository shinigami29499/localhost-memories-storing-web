using Domains.Entities;

namespace Infrastructures.Data.Interfaces;

public interface IPreviewRepository
{
    Task LockAsync(CancellationToken cancellationToken);
    Task<MediaFile?> FindAsync(Guid mediaId, CancellationToken cancellationToken);
    Task<bool> IsReferencedAsync(Guid mediaId, CancellationToken cancellationToken);
    Task<bool> IsSelectableImageAsync(Guid mediaId, Guid actorId, CancellationToken cancellationToken);
    Task<List<MediaFile>> ListAsync(Guid viewerId, int offset, int limit, CancellationToken cancellationToken);
    Task<long> CountAsync(Guid viewerId, CancellationToken cancellationToken);
    Task<List<Guid>> GetCleanupIdsAsync(DateTime draftCutoff, CancellationToken cancellationToken);
    void Add(MediaFile media);
}
