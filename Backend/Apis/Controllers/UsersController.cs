using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Apis.Authorization;
using Apis.Interfaces;
using Services.Interfaces;
using Services.Responses.Auth;
using Services.Models.Users;
using Services.Requests.Users;
using Microsoft.AspNetCore.SignalR;
using Apis.Realtime;

namespace Apis.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController(
    IUserService userService,
    ICurrentUserContext currentUser,
    Microsoft.AspNetCore.SignalR.IHubContext<Apis.Realtime.NotificationsHub> notificationsHub,
    ILogger<UsersController> logger) : ControllerBase
{
    private readonly IUserService _userService = userService;
    private readonly ICurrentUserContext _currentUser = currentUser;

    [HttpPost("me/heartbeat")]
    public async Task<IActionResult> HeartbeatAsync(CancellationToken cancellationToken)
    {
        var userId = _currentUser.RequireUserId();
        var lastSeenAt = await _userService.HeartbeatAsync(userId, cancellationToken);
        await notificationsHub.NotifyTransitionAsync(userId, _currentUser.RequireUsername(), true, lastSeenAt, cancellationToken);
        return Ok(new { lastSeenAt });
    }

    [HttpPost("me/offline")]
    public async Task<IActionResult> OfflineAsync(CancellationToken cancellationToken)
    {
        var userId = _currentUser.RequireUserId();
        var user = await _userService.GetProfileAsync(userId, cancellationToken);
        await notificationsHub.NotifyTransitionAsync(userId, user.Username, false, user.LastSeenAt ?? DateTime.UtcNow, cancellationToken);
        return NoContent();
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<UserResponse>>> ListAsync(CancellationToken cancellationToken)
        => Ok(await _userService.ListAsync(cancellationToken));

    [HttpGet("me")]
    public async Task<ActionResult<UserResponse>> GetProfileAsync(CancellationToken cancellationToken)
        => Ok(await _userService.GetProfileAsync(_currentUser.RequireUserId(), cancellationToken));

    [HttpPut("me/password")]
    public async Task<IActionResult> ChangePasswordAsync(ChangePasswordRequest request, CancellationToken cancellationToken)
    {
        await _userService.ChangePasswordAsync(_currentUser.RequireUserId(), request, cancellationToken);
        return NoContent();
    }

    [HttpPut("me/avatar")]
    public async Task<ActionResult<UserResponse>> SetAvatarAsync(
        SetAvatarRequest request, CancellationToken cancellationToken)
        => Ok(await _userService.SetAvatarAsync(
            _currentUser.RequireUserId(), request, cancellationToken));

    [HttpGet("~/api/location/food/home-location")]
    [HttpGet("me/home-location")]
    public async Task<ActionResult<HomeLocationDto?>> GetHomeLocationAsync(CancellationToken cancellationToken)
        => Ok(await _userService.GetHomeLocationAsync(_currentUser.RequireUserId(), cancellationToken));

    [HttpPut("~/api/location/food/home-location")]
    [HttpPut("me/home-location")]
    public async Task<ActionResult<HomeLocationDto>> SetHomeLocationAsync(
        SetHomeLocationRequest request, CancellationToken cancellationToken)
        => Ok(await _userService.SetHomeLocationAsync(
            _currentUser.RequireUserId(), request, cancellationToken));

    [HttpDelete("~/api/location/food/home-location")]
    [HttpDelete("me/home-location")]
    public async Task<IActionResult> ClearHomeLocationAsync(CancellationToken cancellationToken)
    {
        await _userService.ClearHomeLocationAsync(_currentUser.RequireUserId(), cancellationToken);
        return NoContent();
    }

    [RequireAdmin]
    [HttpPost("{id:guid}/approve")]
    public async Task<ActionResult<UserResponse>> ApproveAsync(Guid id, CancellationToken cancellationToken)
    {
        var user = await _userService.ApproveAsync(id, cancellationToken);
        await NotifyUsersChangedAsync(id);
        return Ok(user);
    }

    [RequireAdmin]
    [HttpPost("{id:guid}/disable")]
    public async Task<ActionResult<UserResponse>> DisableAsync(Guid id, CancellationToken cancellationToken)
    {
        var user = await _userService.DisableAsync(id, _currentUser.RequireUserId(), cancellationToken);
        await NotifyAccountChangedAsync(id, "disabled");
        await NotifyUsersChangedAsync(id);
        return Ok(user);
    }

    [RequireAdmin]
    [HttpPost("{id:guid}/activate")]
    public async Task<ActionResult<UserResponse>> ActivateAsync(Guid id, CancellationToken cancellationToken)
    {
        var user = await _userService.ActivateAsync(id, cancellationToken);
        await NotifyUsersChangedAsync(id);
        return Ok(user);
    }

    [RequireAdmin]
    [HttpPut("{id:guid}/role")]
    public async Task<ActionResult<UserResponse>> UpdateRoleAsync(Guid id, UpdateUserRoleRequest request, CancellationToken cancellationToken)
    {
        var previous = await _userService.GetProfileAsync(id, cancellationToken);
        var user = await _userService.UpdateRoleAsync(id, _currentUser.RequireUserId(), request, cancellationToken);
        if (!string.Equals(previous.Role, user.Role, StringComparison.OrdinalIgnoreCase))
            await NotifyAccountChangedAsync(id, "roleUpdated");
        await NotifyUsersChangedAsync(id, resetPresence: false);
        return Ok(user);
    }

    [RequireAdmin]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        await _userService.DeleteAsync(id, _currentUser.RequireUserId(), cancellationToken);
        await NotifyUsersChangedAsync(id);
        return NoContent();
    }

    private async Task NotifyUsersChangedAsync(Guid userId, bool resetPresence = true)
    {
        try
        {
            await notificationsHub.Clients.Group(NotificationsHub.UserAdminsGroup).SendAsync("UsersChanged", userId, resetPresence);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Could not notify admins about changes to user {UserId}", userId);
        }
    }

    private async Task NotifyAccountChangedAsync(Guid userId, string reason)
    {
        try
        {
            await notificationsHub.Clients.User(userId.ToString()).SendAsync("AccountChanged", reason);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Could not notify user {UserId} about account change", userId);
        }
    }
}
