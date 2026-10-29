using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Apis.Authorization;
using Apis.Interfaces;
using Apis.Realtime;
using Services.Models.Posts;
using Services.Requests.Posts;
using Services.Responses.Posts;
using Services.Interfaces;
using Services.Models.Uploads;
using Services.Requests.Uploads;

namespace Apis.Controllers;

[ApiController]
[Route("api/posts")]
[Authorize]
public class PostsController(
    IPostService postService,
    IUploadService uploadService,
    ICurrentUserContext currentUser,
    IHubContext<NotificationsHub> notificationsHub,
    ILogger<PostsController> logger) : ControllerBase
{
    private readonly IPostService _postService = postService;
    private readonly ICurrentUserContext _currentUser = currentUser;
    private readonly IHubContext<NotificationsHub> _notificationsHub = notificationsHub;
    private readonly ILogger<PostsController> _logger = logger;

    [HttpPost("uploads")]
    public async Task<ActionResult<UploadBatchDto>> CreateTrackedPostAsync(
        CreateUploadBatchRequest request, CancellationToken cancellationToken)
    {
        var batch = await uploadService.CreateBatchAsync(
            _currentUser.RequireUserId(), request, cancellationToken);
        await _notificationsHub.NotifyUploadsChangedAsync(
            _currentUser.RequireUserId(), _logger, cancellationToken);
        return Created($"/api/uploads/batches/{batch.Id}", batch);
    }

    [HttpGet]
    public async Task<ActionResult<PagedFeedResponse<PostSummaryDto>>> GetFeedAsync(
        [FromQuery] FeedRequest request, CancellationToken cancellationToken, [FromQuery] string? mediaKind = null)
        => Ok(await _postService.GetFeedAsync(
            _currentUser.RequireUserId(), request.Offset, request.Limit, mediaKind, cancellationToken));

    [HttpGet("favorites")]
    public async Task<ActionResult<PagedFeedResponse<PostSummaryDto>>> GetFavoritesAsync(
        [FromQuery] FeedRequest request, CancellationToken cancellationToken, [FromQuery] string? mediaKind = null)
        => Ok(await _postService.GetFavoritesAsync(
            _currentUser.RequireUserId(), request.Offset, request.Limit, mediaKind, cancellationToken));

    [HttpGet("{postId:guid}")]
    public async Task<ActionResult<PostSummaryDto>> GetPostAsync(Guid postId, CancellationToken cancellationToken)
        => Ok(await _postService.GetPostAsync(postId, _currentUser.RequireUserId(), cancellationToken));

    /// <summary>Accepts multipart files and an optional caption.</summary>
    [HttpPost]
    public async Task<ActionResult<PostSummaryDto>> CreatePostAsync(
        CancellationToken cancellationToken,
        [FromForm] string? caption = null,
        IFormFileCollection files = null!)
    {
        var result = await _postService.CreatePostAsync(
            _currentUser.RequireUserId(),
            _currentUser.RequireUsername(),
            caption,
            (files ?? new FormFileCollection()).ToList(),
            cancellationToken);

        foreach (var delivery in result.Notifications)
        {
            try
            {
                await _notificationsHub.Clients
                    .User(delivery.RecipientId.ToString())
                    .SendAsync("PostUploaded", delivery.Notification, cancellationToken);
            }
            catch (Exception exception) when (exception is not OperationCanceledException)
            {
                _logger.LogWarning(exception,
                    "Realtime notification {NotificationId} for recipient {RecipientId} could not be delivered",
                    delivery.Notification.Id, delivery.RecipientId);
            }
        }

        return Ok(result.Post);
    }

    [HttpPut("{postId:guid}")]
    public async Task<ActionResult<PostSummaryDto>> UpdatePostAsync(
        Guid postId, UpdatePostRequest request, CancellationToken cancellationToken)
        => Ok(await _postService.UpdateCaptionAsync(
            postId, _currentUser.RequireUserId(), _currentUser.IsAdmin, request.Caption, cancellationToken));

    [RequireAdmin]
    [HttpDelete("{postId:guid}")]
    public async Task<IActionResult> DeletePostAsync(Guid postId, CancellationToken cancellationToken)
    {
        var post = await _postService.GetPostAsync(
            postId, _currentUser.RequireUserId(), cancellationToken);
        await _postService.DeletePostAsync(
            postId, _currentUser.RequireUserId(), _currentUser.IsAdmin, cancellationToken);
        await _notificationsHub.NotifyUploadsChangedAsync(
            post.Author.Id, _logger, cancellationToken);
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
        [FromQuery] FeedRequest request,
        [FromQuery] AdminPostSearchRequest filters,
        CancellationToken cancellationToken)
        => Ok(await _postService.GetAllPostsAsync(
            request.Offset, request.Limit, filters, cancellationToken));

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
