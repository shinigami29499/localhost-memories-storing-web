using Services.Models.Posts;
using Services.Responses.Reactions;

namespace Services.Interfaces;

public interface IReactionService
{
    Task<ReactionResult> ReactAsync(
        Guid postId, Guid userId, string reactionType, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ReactionCountDto>> UnreactAsync(
        Guid postId, Guid userId, string reactionType, CancellationToken cancellationToken = default);
}
