using Domains.Entities;
using Infrastructures.Data.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Infrastructures.Data.Implementations;

public sealed class PreviewRepository(ApplicationDbContext db) : IPreviewRepository
{
    public async Task LockAsync(CancellationToken cancellationToken)
    {
        if (db.Database.CurrentTransaction is null)
            throw new InvalidOperationException("Preview lifecycle locking requires a transaction.");
        // Serialize reference changes and cleanup across API processes.
        await db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(2949901)", cancellationToken);
    }

    public async Task<MediaFile?> FindAsync(Guid mediaId, CancellationToken cancellationToken)
    {
        var media = await db.MediaFiles.IgnoreQueryFilters()
            .FirstOrDefaultAsync(item => item.Id == mediaId, cancellationToken);
        if (media is not null)
            await db.Entry(media).ReloadAsync(cancellationToken);
        return media;
    }

    public async Task<bool> IsReferencedAsync(Guid mediaId, CancellationToken cancellationToken)
        => await db.Collections.AnyAsync(collection => collection.PreviewMediaFileId == mediaId, cancellationToken)
            || await db.PlaceMedia.AnyAsync(
                item => item.MediaFileId == mediaId && item.Place.DeletedAt == null, cancellationToken);

    public Task<bool> IsSelectableImageAsync(Guid mediaId, Guid actorId, CancellationToken cancellationToken)
        => db.MediaFiles.AnyAsync(media => media.Id == mediaId && media.MediaKind == "image"
            && (!media.IsPreviewOnly || media.OwnerId == actorId
                || db.Collections.Any(collection => collection.PreviewMediaFileId == media.Id)
                || db.PlaceMedia.Any(item => item.MediaFileId == media.Id && item.Place.DeletedAt == null)),
            cancellationToken);

    private IQueryable<MediaFile> Visible(Guid viewerId)
        => db.MediaFiles.AsNoTracking().Where(media => media.IsPreviewOnly
            && (media.OwnerId == viewerId
                || db.Collections.Any(collection => collection.PreviewMediaFileId == media.Id)
                || db.PlaceMedia.Any(item => item.MediaFileId == media.Id && item.Place.DeletedAt == null)));

    public Task<List<MediaFile>> ListAsync(Guid viewerId, int offset, int limit, CancellationToken cancellationToken)
        => Visible(viewerId).OrderByDescending(media => media.CreatedAt).ThenByDescending(media => media.Id)
            .Skip(offset).Take(limit).ToListAsync(cancellationToken);

    public Task<long> CountAsync(Guid viewerId, CancellationToken cancellationToken)
        => Visible(viewerId).LongCountAsync(cancellationToken);

    public Task<List<Guid>> GetCleanupIdsAsync(DateTime draftCutoff, CancellationToken cancellationToken)
        => db.MediaFiles.IgnoreQueryFilters().Where(media => media.IsPreviewOnly
            && ((media.DeletedAt != null && media.TrashRelativePath != null)
                || (media.DeletedAt == null && (media.PreviewDraftExpiresAt == null || media.PreviewDraftExpiresAt < draftCutoff)
                    && !db.Collections.Any(collection => collection.PreviewMediaFileId == media.Id)
                    && !db.PlaceMedia.Any(item => item.MediaFileId == media.Id && item.Place.DeletedAt == null))))
            .OrderBy(media => media.CreatedAt).Take(100).Select(media => media.Id).ToListAsync(cancellationToken);

    public void Add(MediaFile media) => db.MediaFiles.Add(media);
}
