using Services.Models.Comments;
using Services.Responses.Comments;

namespace Services.Interfaces;

public interface ICommentService
{
    Task<IReadOnlyList<CommentDto>> GetCommentsAsync(
        Guid postId, int offset, int limit, CancellationToken cancellationToken = default);
    Task<CommentCreationResult> AddCommentAsync(
        Guid postId, Guid authorId, string content, CancellationToken cancellationToken = default);
    Task<CommentDto> UpdateCommentAsync(
        Guid commentId, Guid actorId, bool isAdmin, string content, CancellationToken cancellationToken = default);
    Task DeleteCommentAsync(Guid commentId, Guid actorId, bool isAdmin, CancellationToken cancellationToken = default);
}
