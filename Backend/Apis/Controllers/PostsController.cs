using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Apis.Authorization;
using Apis.Interfaces;
using Services.Models.Posts;
using Services.Requests.Posts;
using Services.Responses.Posts;
using Services.Interfaces;

namespace Apis.Controllers;

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

    /// <summary>Accepts multipart files and an optional caption.</summary>
    [HttpPost]
    public async Task<ActionResult<PostSummaryDto>> CreatePostAsync(
        CancellationToken cancellationToken,
        [FromForm] string? caption = null,
        IFormFileCollection files = null!)
        => Ok(await _postService.CreatePostAsync(
            _currentUser.RequireUserId(), caption, (files ?? new FormFileCollection()).ToList(), cancellationToken));

    [HttpPut("{postId:guid}")]
    public async Task<ActionResult<PostSummaryDto>> UpdatePostAsync(
        Guid postId, UpdatePostRequest request, CancellationToken cancellationToken)
        => Ok(await _postService.UpdateCaptionAsync(
            postId, _currentUser.RequireUserId(), _currentUser.IsAdmin, request.Caption, cancellationToken));

    [RequireAdmin]
    [HttpDelete("{postId:guid}")]
    public async Task<IActionResult> DeletePostAsync(Guid postId, CancellationToken cancellationToken)
    {
        await _postService.DeletePostAsync(
            postId, _currentUser.RequireUserId(), _currentUser.IsAdmin, cancellationToken);
        return NoContent();
    }

    /// <summary>Admin-only listing of soft-deleted posts.</summary>
    [RequireAdmin]
    [HttpGet("deleted")]
    public async Task<ActionResult<PagedFeedResponse<DeletedPostDto>>> GetDeletedAsync(
        [FromQuery] FeedRequest request, CancellationToken cancellationToken)
        => Ok(await _postService.GetDeletedPostsAsync(request.Offset, request.Limit, cancellationToken));

    /// <summary>Admin-only listing of all posts, active and soft-deleted.</summary>
    [RequireAdmin]
    [HttpGet("all")]
    public async Task<ActionResult<PagedFeedResponse<AdminPostDto>>> GetAllAsync(
        [FromQuery] FeedRequest request, CancellationToken cancellationToken)
        => Ok(await _postService.GetAllPostsAsync(request.Offset, request.Limit, cancellationToken));

    [RequireAdmin]
    [HttpPost("{postId:guid}/restore")]
    public async Task<IActionResult> RestorePostAsync(Guid postId, CancellationToken cancellationToken)
    {
        await _postService.RestorePostAsync(postId, _currentUser.RequireUserId(), cancellationToken);
        return NoContent();
    }

    [RequireAdmin]
    [HttpDelete("{postId:guid}/permanent")]
    public async Task<IActionResult> PurgePostAsync(Guid postId, CancellationToken cancellationToken)
    {
        await _postService.PurgePostAsync(postId, _currentUser.RequireUserId(), cancellationToken);
        return NoContent();
    }
}
