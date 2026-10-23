using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Service.Models.Comments;
using Service.Exceptions;
using Service.Interfaces;
using Data;
using Domain.Entities;

namespace Service.Implementations;

public class CommentService(
    ApplicationDbContext db,
    ILogger<CommentService> logger,
    IMapper mapper) : ICommentService
{
    private readonly ApplicationDbContext _db = db;
    private readonly ILogger<CommentService> _logger = logger;

    public async Task<IReadOnlyList<CommentDto>> GetCommentsAsync(
        Guid postId, int offset, int limit, CancellationToken cancellationToken = default)
    {
        if (limit < 1 || limit > 100)
            throw new ValidationException(
                "Invalid comment page.",
                new Dictionary<string, string[]> { ["limit"] = ["Must be between 1 and 100."] });

        var pageItems = await _db.Comments.AsNoTracking()
            .Include(c => c.User)
            .Where(c => c.PostId == postId)
            .OrderBy(c => c.CreatedAt)
            .ThenBy(c => c.Id)
            .Skip(offset)
            .Take(limit)
            .ToListAsync(cancellationToken);

        return pageItems.Select(comment => mapper.Map(comment, comment.User)).ToList();
    }

    public async Task<CommentDto> AddCommentAsync(
        Guid postId, Guid authorId, string content, CancellationToken cancellationToken = default)
    {
        var postExists = await _db.Posts.AnyAsync(p => p.Id == postId, cancellationToken);
        if (!postExists)
            throw new NotFoundException($"Post '{postId}' was not found.");

        var comment = new Comment
        {
            PostId = postId,
            UserId = authorId,
            Content = content.Trim(),
        };

        _db.Comments.Add(comment);
        await _db.SaveChangesAsync(cancellationToken);

        var author = await _db.Users.AsNoTracking().FirstAsync(u => u.Id == authorId, cancellationToken);
        _logger.LogInformation("User {UserId} commented on post {PostId}", authorId, postId);
        return mapper.Map(comment, author);
    }

    public async Task<CommentDto> UpdateCommentAsync(
        Guid commentId, Guid actorId, bool isAdmin, string content, CancellationToken cancellationToken = default)
    {
        var comment = await LoadOwnedCommentAsync(commentId, actorId, isAdmin, cancellationToken);

        if (comment.IsDeleted)
            throw new NotFoundException($"Comment '{commentId}' was not found.");

        comment.Content = content.Trim();
        await _db.SaveChangesAsync(cancellationToken);
        return await GetCommentDtoAsync(commentId, cancellationToken);
    }

    public async Task DeleteCommentAsync(
        Guid commentId, Guid actorId, bool isAdmin, CancellationToken cancellationToken = default)
    {
        var comment = await LoadOwnedCommentAsync(commentId, actorId, isAdmin, cancellationToken);

        if (comment.DeletedAt is not null)
            return;

        comment.DeletedAt = DateTime.UtcNow;
        comment.DeletedBy = actorId;
        await _db.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Comment {CommentId} soft-deleted by {ActorId}", commentId, actorId);
    }

    private async Task<Comment> LoadOwnedCommentAsync(
        Guid commentId, Guid actorId, bool isAdmin, CancellationToken cancellationToken)
    {
        // Include deleted rows for idempotent deletes.
        var comment = await _db.Comments
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.Id == commentId, cancellationToken)
            ?? throw new NotFoundException($"Comment '{commentId}' was not found.");

        if (!isAdmin && comment.UserId != actorId)
            throw new ForbiddenException("Only the comment author or an administrator may modify this comment.");

        return comment;
    }

    private async Task<CommentDto> GetCommentDtoAsync(Guid commentId, CancellationToken cancellationToken)
    {
        var comment = await _db.Comments.AsNoTracking()
            .Include(c => c.User)
            .FirstAsync(c => c.Id == commentId, cancellationToken);
        return mapper.Map(comment, comment.User);
    }
}
