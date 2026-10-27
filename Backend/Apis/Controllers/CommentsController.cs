using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Apis.Interfaces;
using Apis.Realtime;
using Services.Models.Comments;
using Services.Models.Notifications;
using Services.Requests.Comments;
using Services.Interfaces;

namespace Apis.Controllers;

[ApiController]
[Authorize]
public class CommentsController(
    ICommentService commentService,
    ICurrentUserContext currentUser,
    IHubContext<NotificationsHub> notificationsHub,
    ILogger<CommentsController> logger) : ControllerBase
{
    private readonly ICommentService _commentService = commentService;
    private readonly ICurrentUserContext _currentUser = currentUser;
    private readonly IHubContext<NotificationsHub> _notificationsHub = notificationsHub;
    private readonly ILogger<CommentsController> _logger = logger;

    [HttpGet("api/posts/{postId:guid}/comments")]
    public async Task<ActionResult<IReadOnlyList<CommentDto>>> GetPostCommentsAsync(
        Guid postId, [FromQuery] int offset = 0, [FromQuery] int limit = 50, CancellationToken cancellationToken = default)
        => Ok(await _commentService.GetCommentsAsync(postId, offset, limit, cancellationToken));

    [HttpPost("api/posts/{postId:guid}/comments")]
    public async Task<ActionResult<CommentDto>> AddPostCommentAsync(
        Guid postId, CreateCommentRequest request, CancellationToken cancellationToken)
    {
        var result = await _commentService.AddCommentAsync(
            postId, _currentUser.RequireUserId(), request.Content, cancellationToken);
        await PublishActivityNotificationAsync(result.Notification, cancellationToken);
        return Ok(result.Comment);
    }

    [HttpPut("api/comments/{commentId:guid}")]
    public async Task<ActionResult<CommentDto>> UpdateCommentAsync(
        Guid commentId, UpdateCommentRequest request, CancellationToken cancellationToken)
        => Ok(await _commentService.UpdateCommentAsync(
            commentId, _currentUser.RequireUserId(), _currentUser.IsAdmin, request.Content, cancellationToken));

    [HttpDelete("api/comments/{commentId:guid}")]
    public async Task<IActionResult> DeleteCommentAsync(Guid commentId, CancellationToken cancellationToken)
    {
        await _commentService.DeleteCommentAsync(
            commentId, _currentUser.RequireUserId(), _currentUser.IsAdmin, cancellationToken);
        return NoContent();
    }

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
