using Microsoft.AspNetCore.Mvc;
using Api.Authorization;
using Service.Interfaces;
using Service.Responses.Auth;

namespace Api.Controllers;

[ApiController]
[Route("api/users")]
[RequireAdmin]
public class UsersController(IUserService userService, ICurrentUserContext currentUser) : ControllerBase
{
    private readonly IUserService _userService = userService;
    private readonly ICurrentUserContext _currentUser = currentUser;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<UserResponse>>> ListAsync(CancellationToken cancellationToken)
        => Ok(await _userService.ListAsync(cancellationToken));

    [HttpPost("{id:guid}/approve")]
    public async Task<ActionResult<UserResponse>> ApproveAsync(Guid id, CancellationToken cancellationToken)
        => Ok(await _userService.ApproveAsync(id, cancellationToken));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        await _userService.DeleteAsync(id, _currentUser.RequireUserId(), cancellationToken);
        return NoContent();
    }
}
