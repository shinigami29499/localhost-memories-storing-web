using Microsoft.Extensions.Logging;
using Infrastructures.Data.Interfaces;
using Services.Exceptions;
using Services.Models.Posts;
using Services.Interfaces;
using Domains.Entities;
using Domains.Enums;
using Services.Responses.Reactions;

namespace Infrastructures.Data.ApplicationServices;

public class ReactionService(
    IReactionRepository repository,
    IUnitOfWork unitOfWork,
    ILogger<ReactionService> logger,
    INotificationRepository notificationRepository) : IReactionService
{
    private readonly IReactionRepository _repository = repository;
    private readonly IUnitOfWork _unitOfWork = unitOfWork;
    private readonly ILogger<ReactionService> _logger = logger;
    private readonly INotificationRepository _notificationRepository = notificationRepository;

    public async Task<ReactionResult> ReactAsync(
        Guid postId, Guid userId, string reactionType, CancellationToken cancellationToken = default)
    {
        if (!await _repository.PostExistsAsync(postId, cancellationToken))
            throw new NotFoundException($"Post '{postId}' was not found.");

        var active = await _repository.FindReactionAsync(postId, userId, reactionType, includeDeleted: false, cancellationToken);
        if (active is not null)
            return new ReactionResult(await GetCountsAsync(postId, cancellationToken), null);

        // Revive deleted reactions to preserve their history.
        var previouslyDeleted = await _repository.FindReactionAsync(
            postId, userId, reactionType, includeDeleted: true, cancellationToken);

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
            _repository.AddReaction(new Reaction
            {
                PostId = postId,
                UserId = userId,
                ReactionType = reactionType,
            });
        }

        var notification = await _notificationRepository.AddPostActivityNotificationAsync(
            postId, userId, NotificationTypes.ReactionAdded, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return new ReactionResult(await GetCountsAsync(postId, cancellationToken), notification);
    }

    public async Task<IReadOnlyList<ReactionCountDto>> UnreactAsync(
        Guid postId, Guid userId, string reactionType, CancellationToken cancellationToken = default)
    {
        var active = await _repository.FindReactionAsync(postId, userId, reactionType, includeDeleted: false, cancellationToken);

        if (active is not null)
        {
            active.DeletedAt = DateTime.UtcNow;
            active.DeletedBy = userId;
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("User {UserId} removed reaction '{Type}' on post {PostId}",
                userId, reactionType, postId);
        }

        return await GetCountsAsync(postId, cancellationToken);
    }

    private async Task<IReadOnlyList<ReactionCountDto>> GetCountsAsync(Guid postId, CancellationToken cancellationToken)
        => await _repository.GetCountsAsync(postId, cancellationToken);
}
