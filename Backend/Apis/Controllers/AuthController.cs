using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Apis.Interfaces;
using Services.Requests.Auth;
using Services.Responses.Auth;
using Services.Interfaces;
using Microsoft.AspNetCore.SignalR;
using Apis.Realtime;

namespace Apis.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(
    IAuthService authService,
    ICurrentUserContext currentUser,
    IHubContext<NotificationsHub> notificationsHub,
    IUserService userService,
    ILogger<AuthController> logger) : ControllerBase
{
    private readonly IAuthService _authService = authService;
    private readonly ICurrentUserContext _currentUser = currentUser;

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<ActionResult<UserResponse>> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken)
        => Ok(await _authService.RegisterAsync(request, cancellationToken));

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        var session = await _authService.LoginAsync(request, cancellationToken);
        try
        {
            await notificationsHub.Clients.User(session.User.Id.ToString()).SendAsync("SessionChanged", cancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex, "Could not notify user {UserId} of a new session", session.User.Id);
        }
        await notificationsHub.NotifyTransitionAsync(session.User.Id, session.User.Username, true, DateTime.UtcNow, cancellationToken);
        return Ok(session);
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> RefreshAsync(RefreshTokenRequest request, CancellationToken cancellationToken)
        => Ok(await _authService.RefreshAsync(request.RefreshToken, cancellationToken));

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> LogoutAsync(LogoutRequest request, CancellationToken cancellationToken)
    {
        await _authService.LogoutAsync(_currentUser.RequireUserId(), request.RefreshToken, cancellationToken);
        var profile = await userService.GetProfileAsync(_currentUser.RequireUserId(), cancellationToken);
        await notificationsHub.NotifyTransitionAsync(profile.Id, profile.Username, false, DateTime.UtcNow, cancellationToken);
        return NoContent();
    }

    [HttpGet("me")]
    [Authorize]
    public IActionResult Me()
    {
        return Ok(new
        {
            id = _currentUser.UserId,
            username = _currentUser.Username,
            isAdmin = _currentUser.IsAdmin,
        });
    }
}
