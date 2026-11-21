using Domains.Entities;
using Infrastructures.Data.Interfaces;
using Microsoft.Extensions.Logging;
using Services.Interfaces;

namespace Infrastructures.Data.ApplicationServices;

public sealed class AlbumMediaCleanup(
    IMediaRepository repository,
    IMediaStorage storage,
    ILogger<AlbumMediaCleanup> logger)
{
    public async Task DeleteFilesAsync(IEnumerable<MediaFile> mediaFiles, CancellationToken cancellationToken)
    {
        foreach (var media in mediaFiles)
        {
            try
            {
                await storage.DeleteWithPreviewsAsync(media.RelativePath, cancellationToken);
                await repository.CompleteStorageDeletionAsync(media.Id, cancellationToken);
            }
            catch (Exception exception) when (exception is not OperationCanceledException)
            {
                logger.LogWarning(exception, "Storage deletion remains pending for media {MediaId}", media.Id);
            }
        }
    }

    public async Task RetryPendingAsync(CancellationToken cancellationToken)
        => await DeleteFilesAsync(await repository.GetPendingStorageDeletionsAsync(cancellationToken), cancellationToken);
}
