using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Apis.Interfaces;
using Services.Interfaces;
using Services.Models.Notifications;

namespace Apis.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public sealed class NotificationsController(
    INotificationService notificationService,
    ICurrentUserContext currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<NotificationFeedDto>> GetAsync(
        CancellationToken cancellationToken, [FromQuery] int limit = 50)
        => Ok(await notificationService.GetNotificationsAsync(
            currentUser.RequireUserId(), limit, cancellationToken));

    [HttpPost("{notificationId:guid}/read")]
    public async Task<IActionResult> MarkReadAsync(
        Guid notificationId, CancellationToken cancellationToken)
    {
        await notificationService.MarkReadAsync(
            notificationId, currentUser.RequireUserId(), cancellationToken);
        return NoContent();
    }

    [HttpPost("read")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> MarkAllReadAsync(CancellationToken cancellationToken)
    {
        await notificationService.MarkAllReadAsync(
            currentUser.RequireUserId(), cancellationToken);
        return NoContent();
    }
}
