using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Service.Exceptions;
using Service.Interfaces;
using Data;
using Domain.Entities;
using Infrastructure.Interfaces;

namespace Service.Implementations;

public class MediaService(
    ApplicationDbContext db,
    IMediaStorageService storage,
    ILogger<MediaService> logger) : IMediaService
{
    private readonly ApplicationDbContext _db = db;
    private readonly IMediaStorageService _storage = storage;
    private readonly ILogger<MediaService> _logger = logger;

    public async Task DeleteMediaAsync(Guid mediaId, Guid actorId, bool isAdmin, CancellationToken cancellationToken = default)
    {
        var media = await LoadOwnedMediaAsync(mediaId, actorId, isAdmin, cancellationToken);

        var utcNow = DateTime.UtcNow;
        media.TrashRelativePath = await _storage.MoveToTrashAsync(media.RelativePath, cancellationToken);
        media.TrashedAt = utcNow;

        try
        {
            await using var tx = await _db.Database.BeginTransactionAsync(cancellationToken);
            media.DeletedAt = utcNow;
            media.DeletedBy = actorId;
            media.UpdatedAt = utcNow;
            media.UpdatedBy = actorId;
            await _db.SaveChangesAsync(cancellationToken);
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
        var media = await _db.MediaFiles
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(m => m.Id == mediaId, cancellationToken)
            ?? throw new NotFoundException($"Media '{mediaId}' was not found.");

        if (!media.IsDeleted)
            throw new ConflictException("Media is not deleted; nothing to restore.");

        // Restored media must belong to an active post.
        var parentActive = await _db.Posts.AnyAsync(p => p.Id == media.PostId, cancellationToken);
        if (!parentActive)
            throw new ConflictException("The owning post is deleted; restore it first.");

        // Restore the file first; compensate if the database update fails.
        await _storage.RestoreFromTrashAsync(
            media.TrashRelativePath!, media.RelativePath, cancellationToken);

        try
        {
            await using var tx = await _db.Database.BeginTransactionAsync(cancellationToken);
            media.DeletedAt = null;
            media.DeletedBy = null;
            media.TrashRelativePath = null;
            media.TrashedAt = null;
            media.UpdatedAt = DateTime.UtcNow;
            media.UpdatedBy = actorId;
            await _db.SaveChangesAsync(cancellationToken);
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
        var media = await _db.MediaFiles
            .Include(m => m.Post)
            .FirstOrDefaultAsync(m => m.Id == mediaId, cancellationToken)
            ?? throw new NotFoundException($"Media '{mediaId}' was not found.");

        if (!isAdmin && media.Post.UserId != actorId)
            throw new ForbiddenException("Only the post owner or an administrator may manage this media.");

        return media;
    }
}
