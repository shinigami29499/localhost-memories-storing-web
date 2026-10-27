using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Apis.Interfaces;
using Apis.Realtime;
using Services.Models.Notifications;
using Services.Models.Posts;
using Services.Requests.Reactions;
using Services.Interfaces;

namespace Apis.Controllers;

[ApiController]
[Route("api/posts/{postId:guid}/reactions")]
[Authorize]
public class ReactionsController(
    IReactionService reactionService,
    ICurrentUserContext currentUser,
    IHubContext<NotificationsHub> notificationsHub,
    ILogger<ReactionsController> logger) : ControllerBase
{
    private readonly IReactionService _reactionService = reactionService;
    private readonly ICurrentUserContext _currentUser = currentUser;
    private readonly IHubContext<NotificationsHub> _notificationsHub = notificationsHub;
    private readonly ILogger<ReactionsController> _logger = logger;

    [HttpPost]
    public async Task<ActionResult<IReadOnlyList<ReactionCountDto>>> ReactAsync(
        Guid postId, ReactionRequest request, CancellationToken cancellationToken)
    {
        var result = await _reactionService.ReactAsync(
            postId, _currentUser.RequireUserId(), request.ReactionType, cancellationToken);
        await PublishActivityNotificationAsync(result.Notification, cancellationToken);
        return Ok(result.Counts);
    }

    [HttpDelete("{reactionType}")]
    public async Task<ActionResult<IReadOnlyList<ReactionCountDto>>> UnreactAsync(
        Guid postId, string reactionType, CancellationToken cancellationToken)
        => Ok(await _reactionService.UnreactAsync(
            postId, _currentUser.RequireUserId(), reactionType, cancellationToken));

    private async Task PublishActivityNotificationAsync(
        NotificationDeliveryDto? delivery, CancellationToken cancellationToken)
    {
        if (delivery is null)
            return;

        try
        {
            await _notificationsHub.Clients
                .User(delivery.RecipientId.ToString())
                .SendAsync("PostActivity", delivery.Notification, cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            _logger.LogWarning(exception,
                "Realtime notification {NotificationId} for recipient {RecipientId} could not be delivered",
                delivery.Notification.Id, delivery.RecipientId);
        }
    }
}
