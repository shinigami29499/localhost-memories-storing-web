namespace Infrastructures.Data.Interfaces;

public interface IPreviewLifecycle
{
    Task LockAsync(CancellationToken cancellationToken);
    Task ValidateImageAsync(Guid mediaId, Guid actorId, CancellationToken cancellationToken);
    Task CleanupAsync(IEnumerable<Guid> mediaIds, Guid actorId, CancellationToken cancellationToken);
    Task CleanupAbandonedAsync(CancellationToken cancellationToken);
}
