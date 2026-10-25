using Microsoft.Extensions.Logging;
using Infrastructures.Data.Interfaces;
using Services.Models.Comments;
using Services.Exceptions;
using Services.Interfaces;
using Domains.Entities;

namespace Infrastructures.Data.ApplicationServices;

public class CommentService(
    ICommentRepository repository,
    IUnitOfWork unitOfWork,
    ILogger<CommentService> logger,
    IMapper mapper) : ICommentService
{
    private readonly ICommentRepository _repository = repository;
    private readonly IUnitOfWork _unitOfWork = unitOfWork;
    private readonly ILogger<CommentService> _logger = logger;

    public async Task<IReadOnlyList<CommentDto>> GetCommentsAsync(
        Guid postId, int offset, int limit, CancellationToken cancellationToken = default)
    {
        if (limit < 1 || limit > 100)
            throw new ValidationException(
                "Invalid comment page.",
                new Dictionary<string, string[]> { ["limit"] = ["Must be between 1 and 100."] });

        var pageItems = await _repository.GetPageWithAuthorsAsync(postId, offset, limit, cancellationToken);

        return pageItems.Select(comment => mapper.Map(comment, comment.User)).ToList();
    }

    public async Task<CommentDto> AddCommentAsync(
        Guid postId, Guid authorId, string content, CancellationToken cancellationToken = default)
    {
        var postExists = await _repository.PostExistsAsync(postId, cancellationToken);
        if (!postExists)
            throw new NotFoundException($"Post '{postId}' was not found.");

        var comment = new Comment
        {
            PostId = postId,
            UserId = authorId,
            Content = content.Trim(),
        };

        _repository.AddComment(comment);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var author = await _repository.FindUserAsync(authorId, cancellationToken)
            ?? throw new NotFoundException($"User '{authorId}' was not found.");
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
        await _unitOfWork.SaveChangesAsync(cancellationToken);
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
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Comment {CommentId} soft-deleted by {ActorId}", commentId, actorId);
    }

    private async Task<Comment> LoadOwnedCommentAsync(
        Guid commentId, Guid actorId, bool isAdmin, CancellationToken cancellationToken)
    {
        // Include deleted rows for idempotent deletes.
        var comment = await _repository.FindCommentAsync(commentId, includeDeleted: true, cancellationToken)
            ?? throw new NotFoundException($"Comment '{commentId}' was not found.");

        if (!isAdmin && comment.UserId != actorId)
            throw new ForbiddenException("Only the comment author or an administrator may modify this comment.");

        return comment;
    }

    private async Task<CommentDto> GetCommentDtoAsync(Guid commentId, CancellationToken cancellationToken)
    {
        var comment = await _repository.FindCommentWithAuthorAsync(commentId, cancellationToken)
            ?? throw new NotFoundException($"Comment '{commentId}' was not found.");
        return mapper.Map(comment, comment.User);
    }
}
