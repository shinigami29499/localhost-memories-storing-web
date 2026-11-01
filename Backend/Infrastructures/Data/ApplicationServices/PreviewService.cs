using Infrastructures.Data.Interfaces;
using Microsoft.Extensions.Logging;
using Services.Exceptions;
using Services.Interfaces;
using Services.Models.Media;
using Services.Responses.Media;

namespace Infrastructures.Data.ApplicationServices;

public sealed class PreviewService(
    IPreviewRepository repository, IUnitOfWork unitOfWork, IMediaStorage storage,
    IMapper mapper, ILogger<PreviewService> logger) : IPreviewService, IPreviewLifecycle
{
    public Task LockAsync(CancellationToken cancellationToken) => repository.LockAsync(cancellationToken);

    public async Task ValidateImageAsync(Guid mediaId, Guid actorId, CancellationToken cancellationToken)
    {
        if (!await repository.IsSelectableImageAsync(mediaId, actorId, cancellationToken))
            throw new ValidationException("Invalid preview image.", new Dictionary<string, string[]>
            {
                ["mediaIds"] = ["Choose an available gallery image or preview."],
            });
        var media = await repository.FindAsync(mediaId, cancellationToken);
        if (media is { IsPreviewOnly: true })
            media.PreviewDraftExpiresAt = null;
    }

    public async Task<PagedMediaResponse<MediaFileDto>> ListAsync(
        Guid viewerId, int offset, int limit, CancellationToken cancellationToken = default)
    {
        if (offset < 0 || limit is < 1 or > 100)
            throw new ValidationException("Invalid preview page.", new Dictionary<string, string[]>
            {
                ["limit"] = ["Use an offset of 0 or more and a limit between 1 and 100."],
            });
        var total = await repository.CountAsync(viewerId, cancellationToken);
        var items = await repository.ListAsync(viewerId, offset, limit, cancellationToken);
        return new(offset, limit, total, items.Select(media => mapper.Map(media, false)).ToList());
    }

    public async Task<MediaFileDto> UploadAsync(
        Guid ownerId, Stream content, string filename, long size, CancellationToken cancellationToken = default)
    {
        if (size <= 0)
            throw new ValidationException("Invalid preview image.", new Dictionary<string, string[]>
            {
                ["file"] = ["Choose a non-empty image file."],
            });
        var stored = await storage.SavePreviewAsync(content, filename, size, cancellationToken);
        try
        {
            var media = mapper.Map(stored, ownerId, filename);
            media.IsPreviewOnly = true;
            media.PreviewDraftExpiresAt = DateTime.UtcNow.AddDays(1);
            repository.Add(media);
            await unitOfWork.SaveChangesAsync(cancellationToken);
            return mapper.Map(media, false);
        }
        catch
        {
            await storage.DeleteAsync(stored.RelativePath, CancellationToken.None);
            throw;
        }
    }

    public async Task ReleaseDraftAsync(
        Guid mediaId, Guid ownerId, CancellationToken cancellationToken = default)
    {
        var media = await repository.FindAsync(mediaId, cancellationToken);
        if (media is null) return;
        if (!media.IsPreviewOnly || media.OwnerId != ownerId)
            throw new ForbiddenException("Only the uploader may release a preview draft.");
        await CleanupAsync([mediaId], ownerId, cancellationToken);
    }

    public async Task<MediaFileDto> GetImageAsync(
        Guid mediaId, Guid viewerId, CancellationToken cancellationToken = default)
    {
        if (!await repository.IsSelectableImageAsync(mediaId, viewerId, cancellationToken))
            throw new NotFoundException($"Image '{mediaId}' was not found.");
        var media = await repository.FindAsync(mediaId, cancellationToken)
            ?? throw new NotFoundException($"Image '{mediaId}' was not found.");
        return mapper.Map(media, false);
    }

    public async Task CleanupAsync(
        IEnumerable<Guid> mediaIds, Guid actorId, CancellationToken cancellationToken)
    {
        foreach (var mediaId in mediaIds.Distinct())
        {
            string? purgePath;
            await using (var transaction = await unitOfWork.BeginTransactionAsync(cancellationToken))
            {
                await LockAsync(cancellationToken);
                var media = await repository.FindAsync(mediaId, cancellationToken);
                if (media is null || !media.IsPreviewOnly || await repository.IsReferencedAsync(mediaId, cancellationToken))
                    continue;
                purgePath = media.TrashRelativePath;
                if (!media.IsDeleted)
                {
                    purgePath = await storage.MoveToPurgeAsync(media.RelativePath, mediaId, cancellationToken);
                    try
                    {
                        media.DeletedAt = DateTime.UtcNow;
                        media.DeletedBy = actorId == Guid.Empty ? media.OwnerId : actorId;
                        media.TrashRelativePath = purgePath;
                        await unitOfWork.SaveChangesAsync(cancellationToken);
                        await transaction.CommitAsync(cancellationToken);
                    }
                    catch (Exception exception)
                    {
                        logger.LogError(exception, "Preview {MediaId} cleanup failed; restoring its file", mediaId);
                        if (purgePath is not null)
                            await storage.RestoreFromTrashAsync(purgePath, media.RelativePath, CancellationToken.None);
                        throw;
                    }
                }
                else
                {
                    await transaction.CommitAsync(cancellationToken);
                }
            }
            if (purgePath is not null)
            {
                await storage.DeleteAsync(purgePath, CancellationToken.None);
                var deleted = await repository.FindAsync(mediaId, CancellationToken.None);
                if (deleted is not null)
                {
                    deleted.TrashRelativePath = null;
                    await unitOfWork.SaveChangesAsync(CancellationToken.None);
                }
            }
            logger.LogInformation("Unused preview {MediaId} permanently removed from storage", mediaId);
        }
    }

    public async Task CleanupAbandonedAsync(CancellationToken cancellationToken)
    {
        var ids = await repository.GetCleanupIdsAsync(DateTime.UtcNow, cancellationToken);
        await CleanupAsync(ids, Guid.Empty, cancellationToken);
    }
}
