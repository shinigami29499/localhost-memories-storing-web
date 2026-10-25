using Microsoft.Extensions.Logging;
using Infrastructures.Data.Interfaces;
using Services.Exceptions;
using Services.Interfaces;
using Services.Models.Media;
using Domains.Entities;

namespace Infrastructures.Data.ApplicationServices;

public class MediaService(
    IMediaRepository repository,
    IUnitOfWork unitOfWork,
    IMediaStorage storage,
    ILogger<MediaService> logger) : IMediaService
{
    private readonly IMediaRepository _repository = repository;
    private readonly IUnitOfWork _unitOfWork = unitOfWork;
    private readonly IMediaStorage _storage = storage;
    private readonly ILogger<MediaService> _logger = logger;

    public async Task<MediaFileContent> GetMediaFileAsync(
        Guid mediaId, bool includeDeleted, CancellationToken cancellationToken = default)
    {
        var media = includeDeleted
            ? await _repository.FindMediaIncludingDeletedAsync(mediaId, cancellationToken)
            : await _repository.FindOwnedMediaAsync(mediaId, cancellationToken);

        if (media is null)
            throw new NotFoundException($"Media '{mediaId}' was not found.");

        if (!await _repository.PostExistsAsync(media.PostId, includeDeleted, cancellationToken))
            throw new NotFoundException($"Media '{mediaId}' belongs to an unavailable post.");

        var relativePath = media.DeletedAt is null
            ? media.RelativePath
            : media.TrashRelativePath
                ?? throw new NotFoundException($"Media '{mediaId}' has no file in trash.");

        if (!await _storage.ExistsAsync(relativePath))
            throw new NotFoundException($"Media '{mediaId}' is present in the database but missing on disk.");

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

        // Restored media must belong to an active post.
        var parentActive = await _repository.ActivePostExistsAsync(media.PostId, cancellationToken);
        if (!parentActive)
            throw new ConflictException("The owning post is deleted; restore it first.");

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

    private async Task<MediaFile> LoadOwnedMediaAsync(
        Guid mediaId, Guid actorId, bool isAdmin, CancellationToken cancellationToken)
    {
        var media = await _repository.FindOwnedMediaAsync(mediaId, cancellationToken)
            ?? throw new NotFoundException($"Media '{mediaId}' was not found.");

        if (!isAdmin && media.Post.UserId != actorId)
            throw new ForbiddenException("Only the post owner or an administrator may manage this media.");

        return media;
    }
}
