using Domains.Entities;
using Services.Models.Media;
using Services.Models.Place;

namespace Infrastructures.Data.Interfaces;

public interface IMediaRepository
{
    Task<bool> TrySetCityAsync(Guid mediaId, MediaLocationDto location, string city, CancellationToken cancellationToken);
    Task AssignHomeToUnlocatedMediaAsync(
        Guid ownerId, MediaLocationDto location, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<MediaFile>> GetLocationScanBatchAsync(
        Guid actorId, bool isAdmin, int offset, int limit, CancellationToken cancellationToken);
    Task<bool> TrySetExtractedLocationAsync(
        Guid mediaId, Guid actorId, string metadata, CancellationToken cancellationToken);
    Task<MediaFile?> FindOwnedMediaAsync(
        Guid mediaId, CancellationToken cancellationToken = default);
    Task<string?> GetOwnerUsernameAsync(Guid ownerId, CancellationToken cancellationToken = default);
    Task<MediaFile?> FindMediaIncludingDeletedAsync(
        Guid mediaId, CancellationToken cancellationToken = default);
    Task PermanentlyDeleteMediaAsync(
        Guid mediaId, Guid actorId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<(MediaFile Media, string? OwnerUsername, string? OwnerAvatarSeed)>> GetMediaPageAsync(
        int offset, int limit, string? mediaKind, Guid? favoriteUserId, bool includeDeleted,
        CancellationToken cancellationToken = default);
    Task<(IReadOnlyList<(MediaFile Media, string? OwnerUsername, string? OwnerAvatarSeed)> Items, long Total)> GetLocatedMediaPageAsync(
        int offset, int limit, PlaceMapBounds bounds, CancellationToken cancellationToken = default);
    Task<(IReadOnlyList<(MediaFile Media, string? OwnerUsername, string? OwnerAvatarSeed)> Items, long Total)> GetUnlocatedMediaPageAsync(
        int offset, int limit, CancellationToken cancellationToken = default);
    Task<long> CountMediaAsync(
        string? mediaKind, Guid? favoriteUserId, bool includeDeleted,
        CancellationToken cancellationToken = default);
    Task<bool> MediaExistsAsync(Guid mediaId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<(Guid Id, Guid OwnerId, DateTime? UpdatedAt, bool IsDeleted)>> GetMediaChangesAsync(
        DateTime? since, Guid viewerId, bool isAdmin, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<Guid>> GetFavoritedMediaIdsAsync(
        Guid userId, IReadOnlyCollection<Guid> mediaIds, CancellationToken cancellationToken = default);
    Task<MediaFavorite?> FindMediaFavoriteAsync(
        Guid userId, Guid mediaId, bool includeDeleted, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<Guid>> GetExistingMediaIdsAsync(
        IReadOnlyCollection<Guid> mediaIds, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<MediaFavorite>> GetMediaFavoritesAsync(
        Guid userId, IReadOnlyCollection<Guid> mediaIds, bool includeDeleted,
        CancellationToken cancellationToken = default);
    void AddMediaFile(MediaFile mediaFile);
    void AddMediaFavorite(MediaFavorite favorite);
}
