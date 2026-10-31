using Microsoft.Extensions.Logging;
using Infrastructures.Data.Interfaces;
using Services.Exceptions;
using Services.Interfaces;
using Services.Models.Media;
using Services.Requests.Media;
using Services.Responses.Media;
using Domains.Entities;

namespace Infrastructures.Data.ApplicationServices;

public partial class MediaService(
    IMediaRepository repository,
    IUnitOfWork unitOfWork,
    IMediaStorage storage,
    IMapper mapper,
    ILogger<MediaService> logger) : IMediaService
{
    private readonly IMediaRepository _repository = repository;
    private readonly IUnitOfWork _unitOfWork = unitOfWork;
    private readonly IMediaStorage _storage = storage;
    private readonly IMapper _mapper = mapper;
    private readonly ILogger<MediaService> _logger = logger;

    public async Task<MediaFileContent> GetMediaFileAsync(
        Guid mediaId, bool includeDeleted, CancellationToken cancellationToken = default, bool preview = false)
    {
        var media = includeDeleted
            ? await _repository.FindMediaIncludingDeletedAsync(mediaId, cancellationToken)
            : await _repository.FindOwnedMediaAsync(mediaId, cancellationToken);

        if (media is null)
            throw new NotFoundException($"Media '{mediaId}' was not found.");

        var relativePath = media.DeletedAt is null
            ? media.RelativePath
            : media.TrashRelativePath
                ?? throw new NotFoundException($"Media '{mediaId}' has no file in trash.");

        if (!await _storage.ExistsAsync(relativePath))
            throw new NotFoundException($"Media '{mediaId}' is present in the database but missing on disk.");

        if (preview)
        {
            var previewStream = await _storage.OpenPreviewAsync(relativePath, cancellationToken);
            return new MediaFileContent(
                previewStream, "image/jpeg", $"{Path.GetFileNameWithoutExtension(media.OriginalFilename)}.preview.jpg");
        }

        var stream = await _storage.OpenAsync(relativePath);
        return new MediaFileContent(stream, media.MimeType, media.OriginalFilename);
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

        if (!media.IsDeleted)
            throw new ConflictException("Media must be in trash before permanent deletion.");

        var trashPath = media.TrashRelativePath
            ?? throw new NotFoundException($"Media '{mediaId}' has no file in trash.");
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
        var total = await _repository.CountMediaAsync(
            mediaKind, favoriteUserId, includeDeleted, cancellationToken);
        var favoriteIds = (await _repository.GetFavoritedMediaIdsAsync(
            viewerId, media.Select(item => item.Media.Id).ToArray(), cancellationToken)).ToHashSet();
        return new PagedMediaResponse<MediaFileDto>(
            offset,
            limit,
            total,
            media.Select(item => _mapper.Map(item.Media, favoriteIds.Contains(item.Media.Id)) with
            {
                OwnerUsername = item.OwnerUsername,
            }).ToList());
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
}
