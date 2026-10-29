using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Services.Interfaces;
using Services.Models.Users;
using Services.Requests.Users;

namespace Apis.Controllers;

[ApiController]
[Route("api/user-directory")]
[Authorize]
public class UserDirectoryController(IUserService userService) : ControllerBase
{
    [HttpGet("mentions")]
    public async Task<ActionResult<IReadOnlyList<UserMentionCandidateDto>>> SearchMentionCandidatesAsync(
        [FromQuery] UserMentionSearchRequest request,
        CancellationToken cancellationToken)
        => Ok(await userService.SearchMentionCandidatesAsync(request.Query, cancellationToken));
}
