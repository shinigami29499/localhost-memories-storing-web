using Service.Models.Posts;

namespace Service.Interfaces;

public interface IReactionService
{
    Task<IReadOnlyList<ReactionCountDto>> ReactAsync(
        Guid postId, Guid userId, string reactionType, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ReactionCountDto>> UnreactAsync(
        Guid postId, Guid userId, string reactionType, CancellationToken cancellationToken = default);
}
