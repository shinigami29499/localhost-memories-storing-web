using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Service.Exceptions;
using Service.Models.Posts;
using Service.Interfaces;
using Service.Requests.Posts;
using Service.Responses.Posts;
using Data;
using Domain.Entities;
using Infrastructure.Interfaces;

namespace Service.Implementations;

public class PostService(
    ApplicationDbContext db,
    IMediaStorageService storage,
    ILogger<PostService> logger,
    IMapper mapper) : IPostService
{
    private readonly ApplicationDbContext _db = db;
    private readonly IMediaStorageService _storage = storage;
    private readonly ILogger<PostService> _logger = logger;

    public async Task<PagedFeedResponse<PostSummaryDto>> GetFeedAsync(
        Guid viewerId, int offset, int limit, CancellationToken cancellationToken = default)
    {
        if (limit < 1 || limit > FeedRequest.MaxLimit)
            throw new ValidationException(
                "Invalid feed page.",
                new Dictionary<string, string[]> { ["limit"] = [$"Must be between 1 and {FeedRequest.MaxLimit}."] });
        if (offset < 0)
            throw new ValidationException(
                "Invalid feed page.",
                new Dictionary<string, string[]> { ["offset"] = ["Must be zero or greater."] });

        var page = await _db.Posts
            .AsNoTracking()
            .Include(p => p.User)
            .Include(p => p.MediaFiles)
            .OrderByDescending(p => p.CreatedAt)
            .ThenByDescending(p => p.Id)
            .Skip(offset)
            .Take(limit)
            .ToListAsync(cancellationToken);

        var total = await _db.Posts.LongCountAsync(cancellationToken);

        if (page.Count == 0)
            return new PagedFeedResponse<PostSummaryDto>(offset, limit, total, []);

        var postIds = page.Select(p => p.Id).ToList();

        var commentCounts = await _db.Comments.AsNoTracking()
            .Where(c => postIds.Contains(c.PostId))
            .GroupBy(c => c.PostId)
            .Select(g => new { g.Key, Count = g.LongCount() })
            .ToDictionaryAsync(x => x.Key, x => x.Count, cancellationToken);

        var reactionCounts = await _db.Reactions.AsNoTracking()
            .Where(r => postIds.Contains(r.PostId))
            .GroupBy(r => new { r.PostId, r.ReactionType })
            .Select(g => new { g.Key.PostId, g.Key.ReactionType, Count = (long)g.Count() })
            .ToListAsync(cancellationToken);

        var myReactions = reactionCounts.Count == 0
            ? []
            : await _db.Reactions.AsNoTracking()
                .Where(r => r.UserId == viewerId && postIds.Contains(r.PostId))
                .Select(r => new { r.PostId, r.ReactionType })
                .ToListAsync(cancellationToken);

        var items = page.Select(p => mapper.Map(
            p,
            commentCounts.GetValueOrDefault(p.Id),
            reactionCounts
                .Where(rc => rc.PostId == p.Id)
                .Select(rc => new ReactionCountDto(rc.ReactionType, rc.Count))
                .ToList(),
            myReactions
                .Where(mr => mr.PostId == p.Id)
                .Select(mr => mr.ReactionType)
                .Distinct()
                .ToList())).ToList();

        return new PagedFeedResponse<PostSummaryDto>(offset, limit, total, items);
    }

    public async Task<PostSummaryDto> GetPostAsync(Guid postId, Guid viewerId, CancellationToken cancellationToken = default)
    {
        var post = await _db.Posts.AsNoTracking()
            .Include(p => p.User)
            .Include(p => p.MediaFiles)
            .FirstOrDefaultAsync(p => p.Id == postId, cancellationToken)
            ?? throw new NotFoundException($"Post '{postId}' was not found.");

        var commentCount = await _db.Comments.AsNoTracking()
            .LongCountAsync(c => c.PostId == postId, cancellationToken);

        var reactionCounts = await _db.Reactions.AsNoTracking()
            .Where(r => r.PostId == postId)
            .GroupBy(r => r.ReactionType)
            .Select(g => new ReactionCountDto(g.Key, (long)g.Count()))
            .ToListAsync(cancellationToken);

        var myReactions = await _db.Reactions.AsNoTracking()
            .Where(r => r.PostId == postId && r.UserId == viewerId)
            .Select(r => r.ReactionType)
            .Distinct()
            .ToListAsync(cancellationToken);

        return mapper.Map(post, commentCount, reactionCounts, myReactions);
    }

    public async Task<PostSummaryDto> CreatePostAsync(
        Guid authorId, string caption, IReadOnlyList<IFormFile> mediaFiles, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(caption))
            throw new ValidationException(
                "Caption is required.",
                new Dictionary<string, string[]> { ["caption"] = ["Provide a caption or description."] });

        if (caption.Length > 4000)
            throw new ValidationException(
                "Caption is too long.",
                new Dictionary<string, string[]> { ["caption"] = ["Maximum length is 4000 characters."] });

        var post = new Post { Caption = caption.Trim(), UserId = authorId };
        _db.Posts.Add(post);

        var uploaded = new List<MediaFile>();

        foreach (var file in mediaFiles)
        {
            if (file.Length == 0)
                throw new ValidationException(
                    "Empty upload.",
                    new Dictionary<string, string[]> { ["mediaFiles"] = [$"'{file.FileName}' is empty."] });

            await using var stream = file.OpenReadStream();
            var stored = await _storage.SaveAsync(stream, file.FileName, file.Length, cancellationToken);

            uploaded.Add(mapper.Map(stored, post.Id, file.FileName));
        }

        _db.MediaFiles.AddRange(uploaded);

        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            // Failed writes leave uploaded files in trash, not active storage.
            foreach (var media in uploaded)
            {
                try
                {
                    await _storage.MoveToTrashAsync(media.RelativePath, cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex,
                        "Orphaned upload '{RelativePath}' could not be moved to trash after failed save",
                        media.RelativePath);
                }
            }
            throw;
        }

        _logger.LogInformation(
            "User {UserId} created post {PostId} with {MediaCount} media file(s)",
            authorId, post.Id, uploaded.Count);

        return await GetPostAsync(post.Id, authorId, cancellationToken);
    }

    public async Task<PostSummaryDto> UpdateCaptionAsync(
        Guid postId, Guid actorId, bool isAdmin, string caption, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(caption) || caption.Trim().Length > 4000)
            throw new ValidationException(
                "Invalid caption.",
                new Dictionary<string, string[]> { ["caption"] = ["Provide a caption of 1..4000 characters."] });

        var post = await LoadOwnedPostAsync(postId, actorId, isAdmin, cancellationToken);
        post.Caption = caption.Trim();
        await _db.SaveChangesAsync(cancellationToken);
        return await GetPostAsync(postId, actorId, cancellationToken);
    }

    public async Task DeletePostAsync(
        Guid postId, Guid actorId, bool isAdmin, CancellationToken cancellationToken = default)
    {
        var post = await LoadOwnedPostAsync(postId, actorId, isAdmin, cancellationToken);

        var media = await _db.MediaFiles
            .Where(m => m.PostId == postId)
            .ToListAsync(cancellationToken);

        var utcNow = DateTime.UtcNow;

        foreach (var file in media)
        {
            file.TrashRelativePath = await _storage.MoveToTrashAsync(file.RelativePath, cancellationToken);
            file.TrashedAt = utcNow;
        }

        try
        {
            await using var tx = await _db.Database.BeginTransactionAsync(cancellationToken);

            // Shared deletion audit values keep the post family restorable together.
            post.DeletedAt = utcNow;
            post.DeletedBy = actorId;
            post.UpdatedAt = utcNow;
            post.UpdatedBy = actorId;

            foreach (var file in media)
            {
                file.DeletedAt = utcNow;
                file.DeletedBy = actorId;
                file.UpdatedAt = utcNow;
                file.UpdatedBy = actorId;
            }

            await _db.Comments
                .Where(c => c.PostId == postId)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(c => c.DeletedAt, utcNow)
                    .SetProperty(c => c.DeletedBy, actorId)
                    .SetProperty(c => c.UpdatedAt, utcNow)
                    .SetProperty(c => c.UpdatedBy, actorId),
                    cancellationToken);

            await _db.Reactions
                .Where(r => r.PostId == postId)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(r => r.DeletedAt, utcNow)
                    .SetProperty(r => r.DeletedBy, actorId)
                    .SetProperty(r => r.UpdatedAt, utcNow)
                    .SetProperty(r => r.UpdatedBy, actorId),
                    cancellationToken);

            await _db.SaveChangesAsync(cancellationToken);
            await tx.CommitAsync(cancellationToken);
        }
        catch
        {
            // Compensate filesystem moves when the database transaction fails.
            _logger.LogError("Post {PostId} deletion failed at database stage; restoring files from trash", postId);
            foreach (var file in media.Where(m => m.TrashRelativePath is not null))
            {
                try
                {
                    await _storage.RestoreFromTrashAsync(file.TrashRelativePath!, file.RelativePath, cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex,
                        "Compensation failed: trashed file {TrashPath} could not be restored to {OriginalPath}",
                        file.TrashRelativePath, file.RelativePath);
                }
            }
            throw;
        }

        _logger.LogInformation(
            "Post {PostId} soft-deleted by {ActorId}: {MediaCount} media file(s) trashed",
            postId, actorId, media.Count);
    }

    private async Task<Post> LoadOwnedPostAsync(
        Guid postId, Guid actorId, bool isAdmin, CancellationToken cancellationToken)
    {
        var post = await _db.Posts
            .FirstOrDefaultAsync(p => p.Id == postId, cancellationToken)
            ?? throw new NotFoundException($"Post '{postId}' was not found.");

        if (!isAdmin && post.UserId != actorId)
            throw new ForbiddenException("Only the author or an administrator may modify this post.");

        return post;
    }
}
