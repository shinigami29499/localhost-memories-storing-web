using Microsoft.EntityFrameworkCore;
using Domains.Entities;
using Domains.Enums;
using Infrastructures.Data.Interfaces;
using Services.Models.Posts;
using Services.Requests.Posts;

namespace Infrastructures.Data.Implementations;

public sealed class PostRepository(ApplicationDbContext db) : IPostRepository
{
    public Task<IReadOnlyList<Post>> GetFeedPageAsync(
        int offset, int limit, string? mediaKind = null, CancellationToken cancellationToken = default)
        => PageAsync(FilterByMediaKind(db.Posts, mediaKind), offset, limit, cancellationToken);

    public Task<long> CountActivePostsAsync(string? mediaKind = null, CancellationToken cancellationToken = default)
        => FilterByMediaKind(db.Posts, mediaKind).LongCountAsync(cancellationToken);

    public Task<IReadOnlyList<Post>> GetFavoritePageAsync(
        Guid userId, string reactionType, int offset, int limit, string? mediaKind = null,
        CancellationToken cancellationToken = default)
        => PageAsync(FavoritePosts(userId, reactionType, mediaKind), offset, limit, cancellationToken);

    public Task<long> CountFavoritePostsAsync(
        Guid userId, string reactionType, string? mediaKind = null, CancellationToken cancellationToken = default)
        => FavoritePosts(userId, reactionType, mediaKind).LongCountAsync(cancellationToken);

    private IQueryable<Post> FavoritePosts(Guid userId, string reactionType, string? mediaKind)
        => FilterByMediaKind(db.Posts, mediaKind)
            .Where(p => db.Reactions.Any(r => r.PostId == p.Id && r.UserId == userId && r.ReactionType == reactionType));

    private static IQueryable<Post> FilterByMediaKind(IQueryable<Post> posts, string? mediaKind)
        => mediaKind is null ? posts : posts.Where(p => p.MediaFiles.Any(m => m.MediaKind == mediaKind));

    private static async Task<IReadOnlyList<Post>> PageAsync(
        IQueryable<Post> posts, int offset, int limit, CancellationToken cancellationToken)
        => await posts.AsNoTracking()
            .Include(p => p.User)
            .Include(p => p.MediaFiles)
            .OrderByDescending(p => p.CreatedAt)
            .ThenByDescending(p => p.Id)
            .Skip(offset)
            .Take(limit)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyDictionary<Guid, long>> GetActiveCommentCountsAsync(
        IReadOnlyCollection<Guid> postIds, CancellationToken cancellationToken = default)
        => await db.Comments.AsNoTracking()
            .Where(c => postIds.Contains(c.PostId))
            .GroupBy(c => c.PostId)
            .Select(g => new { g.Key, Count = g.LongCount() })
            .ToDictionaryAsync(x => x.Key, x => x.Count, cancellationToken);

    public async Task<IReadOnlyList<PostReactionCount>> GetActiveReactionCountsAsync(
        IReadOnlyCollection<Guid> postIds, CancellationToken cancellationToken = default)
        => await db.Reactions.AsNoTracking()
            .Where(r => postIds.Contains(r.PostId))
            .GroupBy(r => new { r.PostId, r.ReactionType })
            .Select(g => new PostReactionCount(g.Key.PostId, g.Key.ReactionType, (long)g.Count()))
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<UserPostReaction>> GetActiveUserReactionsAsync(
        Guid userId, IReadOnlyCollection<Guid> postIds, CancellationToken cancellationToken = default)
        => await db.Reactions.AsNoTracking()
            .Where(r => r.UserId == userId && postIds.Contains(r.PostId))
            .Select(r => new UserPostReaction(r.PostId, r.ReactionType))
            .ToListAsync(cancellationToken);

    public Task<Post?> FindPostWithMediaAsync(Guid postId, CancellationToken cancellationToken = default)
        => db.Posts.AsNoTracking()
            .Include(p => p.User)
            .Include(p => p.MediaFiles)
            .FirstOrDefaultAsync(p => p.Id == postId, cancellationToken);

    public Task<long> CountActiveCommentsAsync(Guid postId, CancellationToken cancellationToken = default)
        => db.Comments.AsNoTracking().LongCountAsync(c => c.PostId == postId, cancellationToken);

    public async Task<IReadOnlyList<ReactionCountDto>> GetActiveReactionCountsAsync(
        Guid postId, CancellationToken cancellationToken = default)
        => await db.Reactions.AsNoTracking()
            .Where(r => r.PostId == postId)
            .GroupBy(r => r.ReactionType)
            .Select(g => new ReactionCountDto(g.Key, (long)g.Count()))
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<string>> GetActiveUserReactionsAsync(
        Guid postId, Guid userId, CancellationToken cancellationToken = default)
        => await db.Reactions.AsNoTracking()
            .Where(r => r.PostId == postId && r.UserId == userId)
            .Select(r => r.ReactionType)
            .Distinct()
            .ToListAsync(cancellationToken);

    public Task<Post?> FindActivePostAsync(Guid postId, CancellationToken cancellationToken = default)
        => db.Posts.FirstOrDefaultAsync(p => p.Id == postId, cancellationToken);

    public async Task LockPostUploadsAsync(Guid postId, CancellationToken cancellationToken = default)
    {
        await db.UploadBatches
            .FromSqlInterpolated($"SELECT * FROM upload_batches WHERE post_id = {postId} FOR UPDATE")
            .IgnoreQueryFilters()
            .AsNoTracking()
            .ToListAsync(cancellationToken);
    }

    public async Task CancelPostUploadsAsync(
        Guid postId, Guid actorId, DateTime utcNow, CancellationToken cancellationToken = default)
    {
        await db.UploadItems
            .Where(item => item.Batch.PostId == postId
                && (item.Status == UploadItemStatus.Pending || item.Status == UploadItemStatus.Uploading))
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(item => item.Status, UploadItemStatus.Cancelled)
                .SetProperty(item => item.CompletedAt, utcNow)
                .SetProperty(item => item.ErrorDetails, (string?)null)
                .SetProperty(item => item.Revision, item => item.Revision + 1)
                .SetProperty(item => item.UpdatedAt, utcNow)
                .SetProperty(item => item.UpdatedBy, actorId), cancellationToken);
        await db.UploadBatches
            .Where(batch => batch.PostId == postId && batch.CompletedAt == null)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(batch => batch.Status, UploadBatchStatus.Cancelled)
                .SetProperty(batch => batch.CompletedAt, utcNow)
                .SetProperty(batch => batch.UpdatedAt, utcNow)
                .SetProperty(batch => batch.UpdatedBy, actorId), cancellationToken);
    }

    public Task<Post?> FindPostIncludingDeletedAsync(Guid postId, CancellationToken cancellationToken = default)
        => db.Posts.IgnoreQueryFilters().FirstOrDefaultAsync(p => p.Id == postId, cancellationToken);

    public async Task<IReadOnlyList<MediaFile>> GetPostMediaAsync(
        Guid postId, bool includeDeleted, CancellationToken cancellationToken = default)
    {
        var query = db.MediaFiles.AsQueryable();
        if (includeDeleted)
            query = query.IgnoreQueryFilters();
        return await query.Where(m => m.PostId == postId).ToListAsync(cancellationToken);
    }

    public void AddPost(Post post) => db.Posts.Add(post);

    public void AddMediaFiles(IEnumerable<MediaFile> mediaFiles) => db.MediaFiles.AddRange(mediaFiles);

    public async Task DeletePostInteractionsAsync(
        Guid postId, Guid actorId, DateTime utcNow, CancellationToken cancellationToken = default)
    {
        await db.Comments.Where(c => c.PostId == postId)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(c => c.DeletedAt, utcNow)
                .SetProperty(c => c.DeletedBy, actorId)
                .SetProperty(c => c.UpdatedAt, utcNow)
                .SetProperty(c => c.UpdatedBy, actorId), cancellationToken);

        await db.Reactions.Where(r => r.PostId == postId)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(r => r.DeletedAt, utcNow)
                .SetProperty(r => r.DeletedBy, actorId)
                .SetProperty(r => r.UpdatedAt, utcNow)
                .SetProperty(r => r.UpdatedBy, actorId), cancellationToken);
    }

    public async Task<IReadOnlyList<Post>> GetDeletedPostsPageAsync(
        int offset, int limit, CancellationToken cancellationToken = default)
        => await db.Posts.IgnoreQueryFilters().AsNoTracking()
            .Where(p => p.DeletedAt != null)
            .Include(p => p.User)
            .OrderByDescending(p => p.DeletedAt)
            .ThenByDescending(p => p.Id)
            .Skip(offset)
            .Take(limit)
            .ToListAsync(cancellationToken);

    public Task<long> CountDeletedPostsAsync(CancellationToken cancellationToken = default)
        => db.Posts.IgnoreQueryFilters().LongCountAsync(p => p.DeletedAt != null, cancellationToken);

    public async Task<IReadOnlyDictionary<Guid, int>> GetMediaCountsAsync(
        IReadOnlyCollection<Guid> postIds, bool includeDeleted, CancellationToken cancellationToken = default)
    {
        var query = db.MediaFiles.AsNoTracking().AsQueryable();
        if (includeDeleted)
            query = query.IgnoreQueryFilters();
        return await query.Where(m => postIds.Contains(m.PostId))
            .GroupBy(m => m.PostId)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count, cancellationToken);
    }

    public async Task<IReadOnlyDictionary<Guid, long>> GetCommentCountsAsync(
        IReadOnlyCollection<Guid> postIds, bool includeDeleted, CancellationToken cancellationToken = default)
    {
        var query = db.Comments.AsNoTracking().AsQueryable();
        if (includeDeleted)
            query = query.IgnoreQueryFilters();
        return await query.Where(c => postIds.Contains(c.PostId))
            .GroupBy(c => c.PostId)
            .Select(g => new { g.Key, Count = g.LongCount() })
            .ToDictionaryAsync(x => x.Key, x => x.Count, cancellationToken);
    }

    public async Task<IReadOnlyDictionary<Guid, User>> GetUsersByIdsAsync(
        IReadOnlyCollection<Guid> userIds, bool includeDeleted, CancellationToken cancellationToken = default)
    {
        var query = db.Users.AsNoTracking().AsQueryable();
        if (includeDeleted)
            query = query.IgnoreQueryFilters();
        return await query.Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, cancellationToken);
    }

    public async Task<IReadOnlyList<Post>> GetAllPostsPageAsync(
        int offset, int limit, CancellationToken cancellationToken = default)
        => await GetAllPostsPageAsync(offset, limit, new AdminPostSearchRequest(), cancellationToken);

    public async Task<IReadOnlyList<Post>> GetAllPostsPageAsync(
        int offset, int limit, AdminPostSearchRequest filters, CancellationToken cancellationToken = default)
        => await GetFilteredAllPosts(filters)
            .Include(p => p.User)
            .Include(p => p.MediaFiles)
            .OrderByDescending(p => p.CreatedAt)
            .ThenByDescending(p => p.Id)
            .Skip(offset)
            .Take(limit)
            .ToListAsync(cancellationToken);

    public Task<long> CountAllPostsAsync(CancellationToken cancellationToken = default)
        => CountAllPostsAsync(new AdminPostSearchRequest(), cancellationToken);

    public Task<long> CountAllPostsAsync(
        AdminPostSearchRequest filters, CancellationToken cancellationToken = default)
        => GetFilteredAllPosts(filters).LongCountAsync(cancellationToken);

    private IQueryable<Post> GetFilteredAllPosts(AdminPostSearchRequest filters)
    {
        var query = db.Posts.IgnoreQueryFilters().AsNoTracking();

        if (!string.IsNullOrWhiteSpace(filters.Username))
        {
            var usernamePattern = $"%{EscapeLikePattern(filters.Username.Trim())}%";
            query = query.Where(post => EF.Functions.ILike(post.User.Username, usernamePattern, "\\"));
        }

        if (!string.IsNullOrWhiteSpace(filters.Caption))
        {
            var captionPattern = $"%{EscapeLikePattern(filters.Caption.Trim())}%";
            query = query.Where(post => EF.Functions.ILike(post.Caption, captionPattern, "\\"));
        }

        if (filters.CreatedFrom.HasValue)
        {
            var createdFrom = filters.CreatedFrom.Value.UtcDateTime;
            query = query.Where(post => post.CreatedAt >= createdFrom);
        }

        if (filters.CreatedBefore.HasValue)
        {
            var createdBefore = filters.CreatedBefore.Value.UtcDateTime;
            query = query.Where(post => post.CreatedAt < createdBefore);
        }

        if (filters.Status == "active")
            query = query.Where(post => post.DeletedAt == null);
        else if (filters.Status == "deleted")
            query = query.Where(post => post.DeletedAt != null);

        return query;
    }

    private static string EscapeLikePattern(string value)
        => value.Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace("%", "\\%", StringComparison.Ordinal)
            .Replace("_", "\\_", StringComparison.Ordinal);

    public async Task RestorePostInteractionsAsync(
        Guid postId, DateTime deletedAt, Guid? deletedBy, Guid actorId,
        CancellationToken cancellationToken = default)
    {
        await db.Comments.IgnoreQueryFilters()
            .Where(c => c.PostId == postId && c.DeletedAt == deletedAt && c.DeletedBy == deletedBy)
            .ExecuteUpdateAsync(s => s
                .SetProperty(c => c.DeletedAt, (DateTime?)null)
                .SetProperty(c => c.DeletedBy, (Guid?)null)
                .SetProperty(c => c.UpdatedAt, DateTime.UtcNow)
                .SetProperty(c => c.UpdatedBy, actorId), cancellationToken);

        await db.Reactions.IgnoreQueryFilters()
            .Where(r => r.PostId == postId && r.DeletedAt == deletedAt && r.DeletedBy == deletedBy)
            .ExecuteUpdateAsync(s => s
                .SetProperty(r => r.DeletedAt, (DateTime?)null)
                .SetProperty(r => r.DeletedBy, (Guid?)null)
                .SetProperty(r => r.UpdatedAt, DateTime.UtcNow)
                .SetProperty(r => r.UpdatedBy, actorId), cancellationToken);
    }

    public async Task<IReadOnlyList<string>> GetPostStoragePathsAsync(
        Guid postId, CancellationToken cancellationToken = default)
        => await db.MediaFiles.IgnoreQueryFilters()
            .Where(m => m.PostId == postId)
            .Select(m => m.TrashRelativePath ?? m.RelativePath)
            .ToListAsync(cancellationToken);

    public async Task PurgePostAsync(Guid postId, CancellationToken cancellationToken = default)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await db.UploadBatches.IgnoreQueryFilters()
            .Where(batch => batch.PostId == postId)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(batch => batch.PostId, (Guid?)null)
                .SetProperty(batch => batch.UpdatedAt, DateTime.UtcNow), cancellationToken);
        await db.Collections.IgnoreQueryFilters()
            .Where(c => c.PreviewMediaFile != null && c.PreviewMediaFile.PostId == postId)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(c => c.PreviewMediaFileId, (Guid?)null)
                .SetProperty(c => c.UpdatedAt, DateTime.UtcNow), cancellationToken);
        await db.CollectionPosts.IgnoreQueryFilters()
            .Where(cp => cp.PostId == postId)
            .ExecuteDeleteAsync(cancellationToken);
        await db.Comments.IgnoreQueryFilters()
            .Where(c => c.PostId == postId)
            .ExecuteDeleteAsync(cancellationToken);
        await db.Reactions.IgnoreQueryFilters()
            .Where(r => r.PostId == postId)
            .ExecuteDeleteAsync(cancellationToken);
        await db.MediaFiles.IgnoreQueryFilters()
            .Where(m => m.PostId == postId)
            .ExecuteDeleteAsync(cancellationToken);
        await db.Posts.IgnoreQueryFilters()
            .Where(p => p.Id == postId)
            .ExecuteDeleteAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }
}
