using Microsoft.EntityFrameworkCore;
using Domains.Entities;
using Infrastructures.Data.Interfaces;
using Services.Models.Posts;

namespace Infrastructures.Data.Implementations;

public sealed class ReactionRepository(ApplicationDbContext db) : IReactionRepository
{
    public Task<bool> PostExistsAsync(Guid postId, CancellationToken cancellationToken = default)
        => db.Posts.AnyAsync(p => p.Id == postId, cancellationToken);

    public Task<Reaction?> FindReactionAsync(
        Guid postId, Guid userId, string reactionType, bool includeDeleted,
        CancellationToken cancellationToken = default)
    {
        var query = db.Reactions.AsQueryable();
        if (includeDeleted)
            query = query.IgnoreQueryFilters();
        return query.FirstOrDefaultAsync(
            r => r.PostId == postId && r.UserId == userId && r.ReactionType == reactionType,
            cancellationToken);
    }

    public async Task<IReadOnlyList<ReactionCountDto>> GetCountsAsync(
        Guid postId, CancellationToken cancellationToken = default)
        => await db.Reactions.AsNoTracking()
            .Where(r => r.PostId == postId)
            .GroupBy(r => r.ReactionType)
            .Select(g => new ReactionCountDto(g.Key, (long)g.Count()))
            .ToListAsync(cancellationToken);

    public void AddReaction(Reaction reaction) => db.Reactions.Add(reaction);
}
