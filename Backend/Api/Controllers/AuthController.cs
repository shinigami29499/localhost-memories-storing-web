using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Service.Requests.Auth;
using Service.Responses.Auth;
using Service.Interfaces;

namespace Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(IAuthService authService, ICurrentUserContext currentUser) : ControllerBase
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
        => Ok(await _authService.LoginAsync(request, cancellationToken));

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> RefreshAsync(RefreshTokenRequest request, CancellationToken cancellationToken)
        => Ok(await _authService.RefreshAsync(request.RefreshToken, cancellationToken));

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> LogoutAsync(LogoutRequest request, CancellationToken cancellationToken)
    {
        await _authService.LogoutAsync(_currentUser.RequireUserId(), request.RefreshToken, cancellationToken);
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
