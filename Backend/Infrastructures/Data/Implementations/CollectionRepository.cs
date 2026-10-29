using Microsoft.EntityFrameworkCore;
using Domains.Entities;
using Infrastructures.Adapters.Storage;
using Infrastructures.Data.Interfaces;
using Services.Models.Collections;

namespace Infrastructures.Data.Implementations;

public sealed class CollectionRepository(ApplicationDbContext db) : ICollectionRepository
{
    public async Task<IReadOnlyList<CollectionSource>> GetOwnedCollectionsAsync(
        Guid ownerId, Guid? postId, CancellationToken cancellationToken = default)
        => await Project(
                db.Collections.AsNoTracking()
                    .Where(c => c.OwnerId == ownerId)
                    .OrderByDescending(c => c.CreatedAt)
                    .ThenByDescending(c => c.Id),
                postId)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<CollectionSource>> GetPublicCollectionsAsync(
        Guid excludedOwnerId, Guid? postId, CancellationToken cancellationToken = default)
        => await Project(
                db.Collections.AsNoTracking()
                    .Where(c => c.IsPublic && c.OwnerId != excludedOwnerId)
                    .OrderByDescending(c => c.CreatedAt)
                    .ThenByDescending(c => c.Id),
                postId)
            .ToListAsync(cancellationToken);

    public Task<CollectionSource?> GetCollectionSourceAsync(Guid collectionId, CancellationToken cancellationToken = default)
        => Project(db.Collections.AsNoTracking().Where(c => c.Id == collectionId), null)
            .FirstOrDefaultAsync(cancellationToken);

    public Task<Collection?> FindCollectionAsync(Guid collectionId, CancellationToken cancellationToken = default)
        => db.Collections.FirstOrDefaultAsync(c => c.Id == collectionId, cancellationToken);

    public async Task<IReadOnlyList<Guid>> GetCollectionPostIdsPageAsync(
        Guid collectionId, int offset, int limit, CancellationToken cancellationToken = default)
        => await db.CollectionPosts.AsNoTracking()
            .Where(cp => cp.CollectionId == collectionId && cp.Post.DeletedAt == null)
            .OrderBy(cp => cp.CreatedAt)
            .ThenBy(cp => cp.Id)
            .Skip(offset)
            .Take(limit)
            .Select(cp => cp.PostId)
            .ToListAsync(cancellationToken);

    public Task<long> CountCollectionPostsAsync(Guid collectionId, CancellationToken cancellationToken = default)
        => db.CollectionPosts
            .Where(cp => cp.CollectionId == collectionId && cp.Post.DeletedAt == null)
            .LongCountAsync(cancellationToken);

    public async Task<IReadOnlyList<Post>> GetPostsWithMediaAsync(
        IReadOnlyCollection<Guid> postIds, CancellationToken cancellationToken = default)
        => await db.Posts.AsNoTracking()
            .Include(p => p.User)
            .Include(p => p.MediaFiles)
            .Where(p => postIds.Contains(p.Id))
            .ToListAsync(cancellationToken);

    public Task<bool> PostExistsAsync(Guid postId, CancellationToken cancellationToken = default)
        => db.Posts.AnyAsync(p => p.Id == postId, cancellationToken);

    public Task<CollectionPost?> FindCollectionPostAsync(
        Guid collectionId, Guid postId, CancellationToken cancellationToken = default)
        => db.CollectionPosts.FirstOrDefaultAsync(
            cp => cp.CollectionId == collectionId && cp.PostId == postId, cancellationToken);

    public Task<bool> IsCollectionImageAsync(Guid collectionId, Guid mediaId, CancellationToken cancellationToken = default)
        => db.MediaFiles.AnyAsync(
            m => m.Id == mediaId
                && m.MediaKind == MediaKinds.Image
                && db.CollectionPosts.Any(cp => cp.CollectionId == collectionId && cp.PostId == m.PostId),
            cancellationToken);

    public Task<bool> IsPostMediaAsync(Guid postId, Guid mediaId, CancellationToken cancellationToken = default)
        => db.MediaFiles.IgnoreQueryFilters()
            .AnyAsync(m => m.Id == mediaId && m.PostId == postId, cancellationToken);

    public async Task DeleteCollectionPostsAsync(
        Guid collectionId, Guid actorId, DateTime utcNow, CancellationToken cancellationToken = default)
        => await db.CollectionPosts
            .Where(cp => cp.CollectionId == collectionId)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(cp => cp.DeletedAt, utcNow)
                .SetProperty(cp => cp.DeletedBy, actorId)
                .SetProperty(cp => cp.UpdatedAt, utcNow)
                .SetProperty(cp => cp.UpdatedBy, actorId), cancellationToken);

    public void AddCollection(Collection collection) => db.Collections.Add(collection);

    public void AddCollectionPost(CollectionPost collectionPost) => db.CollectionPosts.Add(collectionPost);

    // A custom preview counts only while its image still belongs to an active saved post.
    private static IQueryable<CollectionSource> Project(IQueryable<Collection> query, Guid? postId)
        => query.Select(c => new CollectionSource(
            c,
            c.Owner,
            c.Posts.Count(cp => cp.Post.DeletedAt == null),
            c.PreviewMediaFileId != null
                && c.Posts.Any(cp => cp.Post.DeletedAt == null
                    && cp.Post.MediaFiles.Any(m => m.Id == c.PreviewMediaFileId))
                ? c.PreviewMediaFileId
                : null,
            c.Posts
                .Where(cp => cp.Post.DeletedAt == null
                    && cp.Post.MediaFiles.Any(m => m.MediaKind == MediaKinds.Image))
                .OrderBy(cp => cp.CreatedAt)
                .ThenBy(cp => cp.Id)
                .Select(cp => cp.Post.MediaFiles
                    .Where(m => m.MediaKind == MediaKinds.Image)
                    .OrderBy(m => m.CreatedAt)
                    .ThenBy(m => m.Id)
                    .Select(m => (Guid?)m.Id)
                    .FirstOrDefault())
                .FirstOrDefault(),
            postId != null && c.Posts.Any(cp => cp.PostId == postId)));
}
