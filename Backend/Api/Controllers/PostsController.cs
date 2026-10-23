using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Service.Models.Posts;
using Service.Requests.Posts;
using Service.Responses.Posts;
using Service.Interfaces;

namespace Api.Controllers;

[ApiController]
[Route("api/posts")]
[Authorize]
public class PostsController(IPostService postService, ICurrentUserContext currentUser) : ControllerBase
{
    private readonly IPostService _postService = postService;
    private readonly ICurrentUserContext _currentUser = currentUser;

    [HttpGet]
    public async Task<ActionResult<PagedFeedResponse<PostSummaryDto>>> GetFeedAsync(
        [FromQuery] FeedRequest request, CancellationToken cancellationToken)
        => Ok(await _postService.GetFeedAsync(
            _currentUser.RequireUserId(), request.Offset, request.Limit, cancellationToken));

    [HttpGet("{postId:guid}")]
    public async Task<ActionResult<PostSummaryDto>> GetPostAsync(Guid postId, CancellationToken cancellationToken)
        => Ok(await _postService.GetPostAsync(postId, _currentUser.RequireUserId(), cancellationToken));

    /// <summary>Accepts multipart caption and files.</summary>
    [HttpPost]
    public async Task<ActionResult<PostSummaryDto>> CreatePostAsync(
        CancellationToken cancellationToken,
        [FromForm] string caption,
        IFormFileCollection files = null!)
        => Ok(await _postService.CreatePostAsync(
            _currentUser.RequireUserId(), caption, (files ?? new FormFileCollection()).ToList(), cancellationToken));

    [HttpPut("{postId:guid}")]
    public async Task<ActionResult<PostSummaryDto>> UpdatePostAsync(
        Guid postId, UpdatePostRequest request, CancellationToken cancellationToken)
        => Ok(await _postService.UpdateCaptionAsync(
            postId, _currentUser.RequireUserId(), _currentUser.IsAdmin, request.Caption, cancellationToken));

    [HttpDelete("{postId:guid}")]
    public async Task<IActionResult> DeletePostAsync(Guid postId, CancellationToken cancellationToken)
    {
        await _postService.DeletePostAsync(
            postId, _currentUser.RequireUserId(), _currentUser.IsAdmin, cancellationToken);
        return NoContent();
    }
}
