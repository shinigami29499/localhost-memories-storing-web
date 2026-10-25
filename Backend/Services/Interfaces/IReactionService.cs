using Services.Models.Posts;

namespace Services.Interfaces;

public interface IReactionService
{
    Task<IReadOnlyList<ReactionCountDto>> ReactAsync(
        Guid postId, Guid userId, string reactionType, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ReactionCountDto>> UnreactAsync(
        Guid postId, Guid userId, string reactionType, CancellationToken cancellationToken = default);
}
