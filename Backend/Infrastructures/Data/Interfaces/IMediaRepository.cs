using Domains.Entities;

namespace Infrastructures.Data.Interfaces;

public interface IMediaRepository
{
    Task<MediaFile?> FindOwnedMediaAsync(
        Guid mediaId, CancellationToken cancellationToken = default);
    Task<MediaFile?> FindMediaIncludingDeletedAsync(
        Guid mediaId, CancellationToken cancellationToken = default);
    Task PermanentlyDeleteMediaAsync(
        Guid mediaId, Guid actorId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<MediaFile>> GetMediaPageAsync(
        int offset, int limit, string? mediaKind, Guid? favoriteUserId, bool includeDeleted,
        CancellationToken cancellationToken = default);
    Task<long> CountMediaAsync(
        string? mediaKind, Guid? favoriteUserId, bool includeDeleted,
        CancellationToken cancellationToken = default);
    Task<bool> MediaExistsAsync(Guid mediaId, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<Guid>> GetFavoritedMediaIdsAsync(
        Guid userId, IReadOnlyCollection<Guid> mediaIds, CancellationToken cancellationToken = default);
    Task<MediaFavorite?> FindMediaFavoriteAsync(
        Guid userId, Guid mediaId, bool includeDeleted, CancellationToken cancellationToken = default);
    void AddMediaFavorite(MediaFavorite favorite);
}
