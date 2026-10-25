using Domains.Entities;

namespace Infrastructures.Data.Interfaces;

public interface ICommentRepository
{
    Task<IReadOnlyList<Comment>> GetPageWithAuthorsAsync(
        Guid postId, int offset, int limit, CancellationToken cancellationToken = default);
    Task<bool> PostExistsAsync(Guid postId, CancellationToken cancellationToken = default);
    Task<User?> FindUserAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<Comment?> FindCommentAsync(
        Guid commentId, bool includeDeleted, CancellationToken cancellationToken = default);
    Task<Comment?> FindCommentWithAuthorAsync(Guid commentId, CancellationToken cancellationToken = default);
    void AddComment(Comment comment);
}
