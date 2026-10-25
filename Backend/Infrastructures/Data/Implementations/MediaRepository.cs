using Microsoft.EntityFrameworkCore;
using Domains.Entities;
using Infrastructures.Data.Interfaces;

namespace Infrastructures.Data.Implementations;

public sealed class MediaRepository(ApplicationDbContext db) : IMediaRepository
{
    public Task<MediaFile?> FindOwnedMediaAsync(
        Guid mediaId, CancellationToken cancellationToken = default)
        => db.MediaFiles
            .Include(m => m.Post)
            .FirstOrDefaultAsync(m => m.Id == mediaId, cancellationToken);

    public Task<MediaFile?> FindMediaIncludingDeletedAsync(
        Guid mediaId, CancellationToken cancellationToken = default)
        => db.MediaFiles
            .IgnoreQueryFilters()
            .Include(m => m.Post)
            .FirstOrDefaultAsync(m => m.Id == mediaId, cancellationToken);

    public Task<bool> ActivePostExistsAsync(Guid postId, CancellationToken cancellationToken = default)
        => db.Posts.AnyAsync(p => p.Id == postId, cancellationToken);

    public Task<bool> PostExistsAsync(
        Guid postId, bool includeDeleted, CancellationToken cancellationToken = default)
    {
        var query = db.Posts.AsQueryable();
        if (includeDeleted)
            query = query.IgnoreQueryFilters();
        return query.AnyAsync(p => p.Id == postId, cancellationToken);
    }
}
