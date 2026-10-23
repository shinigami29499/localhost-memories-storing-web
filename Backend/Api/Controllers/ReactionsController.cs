using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Service.Models.Posts;
using Service.Requests.Reactions;
using Service.Interfaces;

namespace Api.Controllers;

[ApiController]
[Route("api/posts/{postId:guid}/reactions")]
[Authorize]
public class ReactionsController(IReactionService reactionService, ICurrentUserContext currentUser) : ControllerBase
{
    private readonly IReactionService _reactionService = reactionService;
    private readonly ICurrentUserContext _currentUser = currentUser;

    [HttpPost]
    public async Task<ActionResult<IReadOnlyList<ReactionCountDto>>> ReactAsync(
        Guid postId, ReactionRequest request, CancellationToken cancellationToken)
        => Ok(await _reactionService.ReactAsync(
            postId, _currentUser.RequireUserId(), request.ReactionType, cancellationToken));

    [HttpDelete("{reactionType}")]
    public async Task<ActionResult<IReadOnlyList<ReactionCountDto>>> UnreactAsync(
        Guid postId, string reactionType, CancellationToken cancellationToken)
        => Ok(await _reactionService.UnreactAsync(
            postId, _currentUser.RequireUserId(), reactionType, cancellationToken));
}
