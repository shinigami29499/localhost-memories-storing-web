namespace Service.Interfaces;

public interface IMediaService
{
    Task DeleteMediaAsync(Guid mediaId, Guid actorId, bool isAdmin, CancellationToken cancellationToken = default);
    Task RestoreMediaAsync(Guid mediaId, Guid actorId, bool isAdmin, CancellationToken cancellationToken = default);
}
