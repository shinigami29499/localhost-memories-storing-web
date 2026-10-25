using Domains.Entities;
using Services.Models.Posts;

namespace Infrastructures.Data.Interfaces;

public interface IReactionRepository
{
    Task<bool> PostExistsAsync(Guid postId, CancellationToken cancellationToken = default);
    Task<Reaction?> FindReactionAsync(
        Guid postId, Guid userId, string reactionType, bool includeDeleted,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ReactionCountDto>> GetCountsAsync(
        Guid postId, CancellationToken cancellationToken = default);
    void AddReaction(Reaction reaction);
}
