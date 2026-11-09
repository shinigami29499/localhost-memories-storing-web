using Microsoft.Extensions.Logging;
using Infrastructures.Data.Interfaces;
using Services.Exceptions;
using Services.Interfaces;
using Services.Models.Media;
using Services.Models.Place;
using Services.Requests.Media;
using Services.Responses.Media;
using Domains.Entities;

namespace Infrastructures.Data.ApplicationServices;

public partial class MediaService(
    IMediaRepository repository,
    IUnitOfWork unitOfWork,
    IMediaStorage storage,
    IMapper mapper,
    CityLookup cityLookup,
    ILogger<MediaService> logger,
    IPreviewRepository previews) : IMediaService
{
    private readonly IMediaRepository _repository = repository;
    private readonly IUnitOfWork _unitOfWork = unitOfWork;
    private readonly IMediaStorage _storage = storage;
    private readonly IMapper _mapper = mapper;
    private readonly ILogger<MediaService> _logger = logger;

    public async Task<MediaFileContent> GetMediaFileAsync(
        Guid mediaId, bool includeDeleted, CancellationToken cancellationToken = default, bool preview = false,
        Guid? viewerId = null, int previewSize = 640)
        => await GetMediaFileAsync(mediaId, includeDeleted, isAdmin: false, cancellationToken, preview, viewerId, previewSize);

    public async Task<MediaFileContent> GetMediaFileAsync(
        Guid mediaId, bool includeDeleted, bool isAdmin, CancellationToken cancellationToken = default,
        bool preview = false, Guid? viewerId = null, int previewSize = 640)
    {
        var media = includeDeleted
            ? await _repository.FindMediaIncludingDeletedAsync(mediaId, cancellationToken)
            : isAdmin
                ? await _repository.FindMediaIncludingDeletedAsync(mediaId, cancellationToken)
                : await _repository.FindOwnedMediaAsync(mediaId, cancellationToken);

        if (media is null || (!includeDeleted && media.IsDeleted))
            throw new NotFoundException($"Media '{mediaId}' was not found.");
        if (media.IsPreviewOnly && (media.IsDeleted
            || (media.OwnerId != viewerId && !await previews.IsReferencedAsync(mediaId, cancellationToken))))
            throw new NotFoundException($"Preview '{mediaId}' was not found.");

        var relativePath = media.DeletedAt is null
            ? media.RelativePath
            : media.TrashRelativePath
                ?? throw new NotFoundException($"Media '{mediaId}' has no file in trash.");

        if (!await _storage.ExistsAsync(relativePath))
            throw new NotFoundException($"Media '{mediaId}' is present in the database but missing on disk.");

        if (preview)
        {
            var previewStream = await _storage.OpenPreviewAsync(relativePath, previewSize, cancellationToken);
            return new MediaFileContent(
                previewStream, "image/jpeg", $"{Path.GetFileNameWithoutExtension(media.OriginalFilename)}.preview.jpg");
        }

        var stream = await _storage.OpenAsync(relativePath);
        return new MediaFileContent(stream, media.MimeType, media.OriginalFilename);
    }

    public async Task<MediaFileDto?> GetMediaForNotificationAsync(Guid mediaId, CancellationToken cancellationToken = default)
    {
        var media = await _repository.FindMediaIncludingDeletedAsync(mediaId, cancellationToken);
        return media is null ? null : new MediaFileDto(media.Id, media.MediaKind,
            media.OriginalFilename, media.CreatedAt, false, media.OwnerId);
    }

    public async Task<MediaFileDto> GetMediaAsync(Guid mediaId, Guid viewerId,
        CancellationToken cancellationToken = default)
    {
        var media = await _repository.FindOwnedMediaAsync(mediaId, cancellationToken);
        if (media is null || media.IsPreviewOnly)
            throw new NotFoundException($"Media '{mediaId}' was not found.");
        var favorites = await _repository.GetFavoritedMediaIdsAsync(viewerId, [mediaId], cancellationToken);
        var ownerUsername = await _repository.GetOwnerUsernameAsync(media.OwnerId, cancellationToken);
        return _mapper.Map(media, favorites.Contains(mediaId)) with { OwnerUsername = ownerUsername };
    }

    public async Task<PagedMediaResponse<MediaFileDto>> GetLocatedMediaPageAsync(Guid viewerId, int offset,
        int limit, PlaceMapBounds bounds, CancellationToken cancellationToken = default)
    {
        if (offset < 0 || limit is < 1 or > 100 || !double.IsFinite(bounds.West) || !double.IsFinite(bounds.East)
            || !double.IsFinite(bounds.South) || !double.IsFinite(bounds.North)
            || bounds.West is < -180 or > 180 || bounds.East is < -180 or > 180
            || bounds.South is < -90 or > 90 || bounds.North is < -90 or > 90 || bounds.South > bounds.North)
            throw new ValidationException("Invalid map page.", new Dictionary<string, string[]>
            {
                ["bounds"] = ["Provide valid bounds, a nonnegative offset and a limit from 1 to 100."],
            });
        var (page, total) = await _repository.GetLocatedMediaPageAsync(offset, limit, bounds, cancellationToken);
        var favorites = (await _repository.GetFavoritedMediaIdsAsync(
            viewerId, page.Select(item => item.Media.Id).ToArray(), cancellationToken)).ToHashSet();
        return new PagedMediaResponse<MediaFileDto>(offset, total,
            page.Select(item => _mapper.Map(item.Media, favorites.Contains(item.Media.Id)) with
            {
                OwnerUsername = item.OwnerUsername,
            }).ToList());
    }

    public async Task<PagedMediaResponse<MediaFileDto>> GetUnlocatedMediaPageAsync(Guid viewerId, int offset,
        int limit, CancellationToken cancellationToken = default)
    {
        if (offset < 0 || limit is < 1 or > 100)
            throw new ValidationException("Invalid photo page.", new Dictionary<string, string[]>
            {
                ["offset"] = ["Use a nonnegative offset and a limit from 1 to 100."],
            });
        var (page, total) = await _repository.GetUnlocatedMediaPageAsync(offset, limit, cancellationToken);
        var favorites = (await _repository.GetFavoritedMediaIdsAsync(
            viewerId, page.Select(item => item.Media.Id).ToArray(), cancellationToken)).ToHashSet();
        return new PagedMediaResponse<MediaFileDto>(offset, total,
            page.Select(item => _mapper.Map(item.Media, favorites.Contains(item.Media.Id)) with
            {
                OwnerUsername = item.OwnerUsername,
            }).ToList());
    }

    public async Task<bool> IsMediaFileAvailableAsync(
        Guid mediaId, Guid actorId, bool isAdmin, CancellationToken cancellationToken = default)
    {
        if (!isAdmin)
            throw new ForbiddenException("Only administrators may check media file availability.");
        var media = await LoadOwnedMediaAsync(mediaId, actorId, isAdmin, cancellationToken);
        return await _storage.ExistsAsync(media.RelativePath);
    }

    public async Task DeleteMediaAsync(Guid mediaId, Guid actorId, bool isAdmin, CancellationToken cancellationToken = default)
    {
        var media = await LoadOwnedMediaAsync(mediaId, actorId, isAdmin, cancellationToken);

        var utcNow = DateTime.UtcNow;
        media.TrashRelativePath = await _storage.MoveToTrashAsync(media.RelativePath, cancellationToken);
        media.TrashedAt = utcNow;

        try
        {
            await using var tx = await _unitOfWork.BeginTransactionAsync(cancellationToken);
            media.DeletedAt = utcNow;
            media.DeletedBy = actorId;
            media.UpdatedAt = utcNow;
            media.UpdatedBy = actorId;
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await tx.CommitAsync(cancellationToken);
        }
        catch
        {
            _logger.LogError(
                "Media {MediaId} deletion failed at database stage; restoring file from trash", mediaId);
            await _storage.RestoreFromTrashAsync(media.TrashRelativePath!, media.RelativePath, cancellationToken);
            throw;
        }

        _logger.LogInformation("Media {MediaId} soft-deleted by {ActorId} (file trashed as {TrashPath})",
            mediaId, actorId, media.TrashRelativePath);
    }

    public async Task RestoreMediaAsync(Guid mediaId, Guid actorId, bool isAdmin, CancellationToken cancellationToken = default)
    {
        var media = await _repository.FindMediaIncludingDeletedAsync(mediaId, cancellationToken)
            ?? throw new NotFoundException($"Media '{mediaId}' was not found.");
        if (media.IsPreviewOnly)
            throw new ForbiddenException("Preview-only images cannot be restored as gallery media.");

        if (!media.IsDeleted)
            throw new ConflictException("Media is not deleted; nothing to restore.");

        // Restore the file first; compensate if the database update fails.
        await _storage.RestoreFromTrashAsync(
            media.TrashRelativePath!, media.RelativePath, cancellationToken);

        try
        {
            await using var tx = await _unitOfWork.BeginTransactionAsync(cancellationToken);
            media.DeletedAt = null;
            media.DeletedBy = null;
            media.TrashRelativePath = null;
            media.TrashedAt = null;
            media.UpdatedAt = DateTime.UtcNow;
            media.UpdatedBy = actorId;
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await tx.CommitAsync(cancellationToken);
        }
        catch
        {
            _logger.LogError(
                "Media {MediaId} restoration failed at database stage; moving file back to trash", mediaId);
            await _storage.MoveToTrashAsync(media.RelativePath, cancellationToken);
            throw;
        }

        _logger.LogInformation("Media {MediaId} restored by {ActorId}", mediaId, actorId);
    }

    public async Task DeleteMediaRecordAsync(
        Guid mediaId, Guid actorId, bool isAdmin, CancellationToken cancellationToken = default)
    {
        if (!isAdmin)
            throw new ForbiddenException("Only administrators may permanently delete media records.");

        var media = await _repository.FindMediaIncludingDeletedAsync(mediaId, cancellationToken);
        if (media is null) return;
        if (media.IsPreviewOnly)
            throw new ForbiddenException("Preview-only images are removed by reference cleanup.");

        await using var tx = await _unitOfWork.BeginTransactionAsync(cancellationToken);
        await _repository.PermanentlyDeleteMediaAsync(mediaId, actorId, cancellationToken);
        await tx.CommitAsync(cancellationToken);
        _logger.LogInformation(
            "Media {MediaId} database record deleted by {ActorId}; storage left untouched", mediaId, actorId);
    }

    public async Task PermanentlyDeleteMediaAsync(
        Guid mediaId, Guid actorId, bool isAdmin, CancellationToken cancellationToken = default)
    {
        if (!isAdmin)
            throw new ForbiddenException("Only administrators may permanently delete media.");

        var media = await _repository.FindMediaIncludingDeletedAsync(mediaId, cancellationToken);
        if (media is null)
        {
            await _storage.DeleteAsync($"trash/purge/{mediaId:N}", cancellationToken);
            return;
        }
        if (media.IsPreviewOnly)
            throw new ForbiddenException("Preview-only images are removed by reference cleanup.");

        if (!media.IsDeleted)
            throw new ConflictException("Media must be in trash before permanent deletion.");

        var trashPath = media.TrashRelativePath;
        if (trashPath is null || !await _storage.ExistsAsync(trashPath))
        {
            await DeleteMediaRecordAsync(mediaId, actorId, isAdmin, cancellationToken);
            return;
        }
        var purgePath = await _storage.MoveToPurgeAsync(trashPath, mediaId, cancellationToken);

        try
        {
            await using var tx = await _unitOfWork.BeginTransactionAsync(cancellationToken);
            await _repository.PermanentlyDeleteMediaAsync(mediaId, actorId, cancellationToken);
            await tx.CommitAsync(cancellationToken);
        }
        catch (Exception exception)
        {
            if (purgePath is not null)
            {
                _logger.LogError(
                    exception,
                    "Media {MediaId} permanent deletion failed at database stage; restoring file to trash",
                    mediaId);
                await _storage.RestoreFromTrashAsync(purgePath, trashPath, cancellationToken);
            }
            throw;
        }

        if (purgePath is not null)
            await _storage.DeleteAsync(purgePath, cancellationToken);

        _logger.LogInformation("Media {MediaId} permanently deleted", mediaId);
    }

    private async Task<MediaFile> LoadOwnedMediaAsync(
        Guid mediaId, Guid actorId, bool isAdmin, CancellationToken cancellationToken)
    {
        var media = await _repository.FindOwnedMediaAsync(mediaId, cancellationToken)
            ?? throw new NotFoundException($"Media '{mediaId}' was not found.");
        if (media.IsPreviewOnly)
            throw new ForbiddenException("Preview-only images cannot be managed as gallery media.");

        if (!isAdmin && media.OwnerId != actorId)
            throw new ForbiddenException("Only the media owner or an administrator may manage this media.");

        return media;
    }

    public async Task<PagedMediaResponse<MediaFileDto>> GetMediaPageAsync(
        Guid viewerId,
        int offset,
        int limit,
        string? mediaKind,
        bool favoritesOnly,
        bool includeDeleted,
        CancellationToken cancellationToken = default)
    {
        if (offset < 0 || limit < 1 || limit > MediaPageRequest.MaxLimit)
            throw new Services.Exceptions.ValidationException(
                "Invalid media page.",
                new Dictionary<string, string[]>
                {
                    ["offset"] = ["Offset must be zero or greater."],
                    ["limit"] = [$"Must be between 1 and {MediaPageRequest.MaxLimit}."],
                });
        if (mediaKind is not null && mediaKind is not ("image" or "video"))
            throw new Services.Exceptions.ValidationException(
                "Invalid media page.",
                new Dictionary<string, string[]> { ["mediaKind"] = ["Must be 'image' or 'video'."] });

        Guid? favoriteUserId = favoritesOnly ? viewerId : null;
        var media = await _repository.GetMediaPageAsync(
            offset, limit, mediaKind, favoriteUserId, includeDeleted, cancellationToken);
        var pendingCities = media.Select(item => (item.Media, Location: MediaLocationMetadata.Read(item.Media.Metadata)))
            .Where(item => item.Location is { City: null }).ToList();
        using var lookupTimeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        lookupTimeout.CancelAfter(TimeSpan.FromSeconds(6));
        var resolvedCities = await Task.WhenAll(pendingCities.Select(async item =>
        {
            try { return (item.Media, Location: item.Location!, City: await cityLookup.FindAsync(item.Location!, lookupTimeout.Token)); }
            catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
            { return (item.Media, Location: item.Location!, City: (string?)null); }
        }));
        foreach (var item in resolvedCities)
        {
            if (item.City is not null && await _repository.TrySetCityAsync(item.Media.Id, item.Location, item.City, cancellationToken))
                item.Media.Metadata = MediaLocationMetadata.Write(item.Media.Metadata, item.Location with { City = item.City });
        }
        var total = await _repository.CountMediaAsync(
            mediaKind, favoriteUserId, includeDeleted, cancellationToken);
        var favoriteIds = (await _repository.GetFavoritedMediaIdsAsync(
            viewerId, media.Select(item => item.Media.Id).ToArray(), cancellationToken)).ToHashSet();
        return new PagedMediaResponse<MediaFileDto>(
            offset,
            total,
            media.Select(item => _mapper.Map(item.Media, favoriteIds.Contains(item.Media.Id)) with
            {
                OwnerUsername = item.OwnerUsername,
                DeletedAt = item.Media.DeletedAt,
            }).ToList());
    }

    public async Task<OwnedMediaCountsResponse> GetOwnedMediaCountsAsync(
        Guid ownerId, CancellationToken cancellationToken = default)
    {
        var (images, videos) = await _repository.GetOwnedMediaCountsAsync(ownerId, cancellationToken);
        return new OwnedMediaCountsResponse(images, videos);
    }

    public async Task<MediaChangesResponse> GetMediaChangesAsync(
        Guid viewerId, bool isAdmin, DateTime? since, CancellationToken cancellationToken = default)
    {
        var checkedAt = DateTime.UtcNow;
        var changes = await _repository.GetMediaChangesAsync(since, viewerId, isAdmin, cancellationToken);
        return new MediaChangesResponse(checkedAt, changes.Select(item =>
            new MediaChange(item.Id, item.UpdatedAt, item.IsDeleted)).ToArray());
    }

    public async Task SetMediaFavoriteAsync(
        Guid mediaId, Guid userId, bool isFavorite, CancellationToken cancellationToken = default)
    {
        if (!await _repository.MediaExistsAsync(mediaId, cancellationToken))
            throw new NotFoundException($"Media '{mediaId}' was not found.");

        var favorite = await _repository.FindMediaFavoriteAsync(
            userId, mediaId, includeDeleted: isFavorite, cancellationToken);
        if (isFavorite)
        {
            if (favorite is { DeletedAt: null })
                return;
            if (favorite is not null)
            {
                favorite.DeletedAt = null;
                favorite.DeletedBy = null;
                favorite.UpdatedAt = DateTime.UtcNow;
                favorite.UpdatedBy = userId;
            }
            else
            {
                _repository.AddMediaFavorite(new MediaFavorite { MediaFileId = mediaId, UserId = userId });
            }
        }
        else if (favorite is { DeletedAt: null })
        {
            favorite.DeletedAt = DateTime.UtcNow;
            favorite.DeletedBy = userId;
        }
        else
        {
            return;
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task SetMediaFavoritesAsync(
        IReadOnlyCollection<Guid> mediaIds, Guid userId, bool isFavorite,
        CancellationToken cancellationToken = default)
    {
        var ids = mediaIds.Distinct().ToArray();
        if (ids.Length == 0)
            throw new ValidationException("At least one media item is required.",
                new Dictionary<string, string[]> { ["mediaIds"] = ["Select at least one media item."] });

        var existingIds = (await _repository.GetExistingMediaIdsAsync(ids, cancellationToken)).ToHashSet();
        var missingId = ids.FirstOrDefault(id => !existingIds.Contains(id));
        if (missingId != Guid.Empty)
            throw new NotFoundException($"Media '{missingId}' was not found.");

        var favorites = await _repository.GetMediaFavoritesAsync(userId, ids, isFavorite, cancellationToken);
        var favoriteByMediaId = favorites.GroupBy(item => item.MediaFileId)
            .ToDictionary(group => group.Key, group => group.First());
        var changed = false;
        var now = DateTime.UtcNow;
        foreach (var mediaId in ids)
        {
            favoriteByMediaId.TryGetValue(mediaId, out var favorite);
            if (isFavorite)
            {
                if (favorite is { DeletedAt: null })
                    continue;
                if (favorite is not null)
                {
                    favorite.DeletedAt = null;
                    favorite.DeletedBy = null;
                    favorite.UpdatedAt = now;
                    favorite.UpdatedBy = userId;
                }
                else
                {
                    _repository.AddMediaFavorite(new MediaFavorite { MediaFileId = mediaId, UserId = userId });
                }
            }
            else if (favorite is { DeletedAt: null })
            {
                favorite.DeletedAt = now;
                favorite.DeletedBy = userId;
                favorite.UpdatedAt = now;
                favorite.UpdatedBy = userId;
            }
            else
            {
                continue;
            }
            changed = true;
        }

        if (changed)
            await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
