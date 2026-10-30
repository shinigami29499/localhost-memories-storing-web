using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Apis.Authorization;
using Apis.Interfaces;
using Services.Interfaces;
using Services.Responses.Auth;
using Services.Models.Users;
using Services.Requests.Users;

namespace Apis.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController(IUserService userService, ICurrentUserContext currentUser) : ControllerBase
{
    private readonly IUserService _userService = userService;
    private readonly ICurrentUserContext _currentUser = currentUser;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<UserResponse>>> ListAsync(CancellationToken cancellationToken)
        => Ok(await _userService.ListAsync(cancellationToken));

    [HttpGet("me/home-location")]
    public async Task<ActionResult<HomeLocationDto?>> GetHomeLocationAsync(CancellationToken cancellationToken)
        => Ok(await _userService.GetHomeLocationAsync(_currentUser.RequireUserId(), cancellationToken));

    [HttpPut("me/home-location")]
    public async Task<ActionResult<HomeLocationDto>> SetHomeLocationAsync(
        SetHomeLocationRequest request, CancellationToken cancellationToken)
        => Ok(await _userService.SetHomeLocationAsync(
            _currentUser.RequireUserId(), request, cancellationToken));

    [HttpDelete("me/home-location")]
    public async Task<IActionResult> ClearHomeLocationAsync(CancellationToken cancellationToken)
    {
        await _userService.ClearHomeLocationAsync(_currentUser.RequireUserId(), cancellationToken);
        return NoContent();
    }

    [RequireAdmin]
    [HttpPost("{id:guid}/approve")]
    public async Task<ActionResult<UserResponse>> ApproveAsync(Guid id, CancellationToken cancellationToken)
        => Ok(await _userService.ApproveAsync(id, cancellationToken));

    [RequireAdmin]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        await _userService.DeleteAsync(id, _currentUser.RequireUserId(), cancellationToken);
        return NoContent();
    }
}
