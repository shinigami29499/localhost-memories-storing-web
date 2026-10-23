using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Service.Exceptions;
using Service.Models.Posts;
using Service.Interfaces;
using Data;
using Domain.Entities;

namespace Service.Implementations;

public class ReactionService(ApplicationDbContext db, ILogger<ReactionService> logger) : IReactionService
{
    private readonly ApplicationDbContext _db = db;
    private readonly ILogger<ReactionService> _logger = logger;

    public async Task<IReadOnlyList<ReactionCountDto>> ReactAsync(
        Guid postId, Guid userId, string reactionType, CancellationToken cancellationToken = default)
    {
        if (!await _db.Posts.AnyAsync(p => p.Id == postId, cancellationToken))
            throw new NotFoundException($"Post '{postId}' was not found.");

        var active = await _db.Reactions.FirstOrDefaultAsync(
            r => r.PostId == postId && r.UserId == userId && r.ReactionType == reactionType,
            cancellationToken);
        if (active is not null)
            return await GetCountsAsync(postId, cancellationToken);

        // Revive deleted reactions to preserve their history.
        var previouslyDeleted = await _db.Reactions
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(
                r => r.PostId == postId && r.UserId == userId && r.ReactionType == reactionType,
                cancellationToken);

        var now = DateTime.UtcNow;
        if (previouslyDeleted is not null)
        {
            previouslyDeleted.DeletedAt = null;
            previouslyDeleted.DeletedBy = null;
            previouslyDeleted.UpdatedAt = now;
            previouslyDeleted.UpdatedBy = userId;
        }
        else
        {
            _db.Reactions.Add(new Reaction
            {
                PostId = postId,
                UserId = userId,
                ReactionType = reactionType,
            });
        }

        await _db.SaveChangesAsync(cancellationToken);
        return await GetCountsAsync(postId, cancellationToken);
    }

    public async Task<IReadOnlyList<ReactionCountDto>> UnreactAsync(
        Guid postId, Guid userId, string reactionType, CancellationToken cancellationToken = default)
    {
        var active = await _db.Reactions.FirstOrDefaultAsync(
            r => r.PostId == postId && r.UserId == userId && r.ReactionType == reactionType,
            cancellationToken);

        if (active is not null)
        {
            active.DeletedAt = DateTime.UtcNow;
            active.DeletedBy = userId;
            await _db.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("User {UserId} removed reaction '{Type}' on post {PostId}",
                userId, reactionType, postId);
        }

        return await GetCountsAsync(postId, cancellationToken);
    }

    private async Task<IReadOnlyList<ReactionCountDto>> GetCountsAsync(Guid postId, CancellationToken cancellationToken)
        => await _db.Reactions.AsNoTracking()
            .Where(r => r.PostId == postId)
            .GroupBy(r => r.ReactionType)
            .Select(g => new ReactionCountDto(g.Key, (long)g.Count()))
            .ToListAsync(cancellationToken);
}
