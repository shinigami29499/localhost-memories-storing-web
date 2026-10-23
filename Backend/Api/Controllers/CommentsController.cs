using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Service.Models.Comments;
using Service.Requests.Comments;
using Service.Interfaces;

namespace Api.Controllers;

[ApiController]
[Authorize]
public class CommentsController(ICommentService commentService, ICurrentUserContext currentUser) : ControllerBase
{
    private readonly ICommentService _commentService = commentService;
    private readonly ICurrentUserContext _currentUser = currentUser;

    [HttpGet("api/posts/{postId:guid}/comments")]
    public async Task<ActionResult<IReadOnlyList<CommentDto>>> GetPostCommentsAsync(
        Guid postId, [FromQuery] int offset = 0, [FromQuery] int limit = 50, CancellationToken cancellationToken = default)
        => Ok(await _commentService.GetCommentsAsync(postId, offset, limit, cancellationToken));

    [HttpPost("api/posts/{postId:guid}/comments")]
    public async Task<ActionResult<CommentDto>> AddPostCommentAsync(
        Guid postId, CreateCommentRequest request, CancellationToken cancellationToken)
        => Ok(await _commentService.AddCommentAsync(
            postId, _currentUser.RequireUserId(), request.Content, cancellationToken));

    [HttpPut("api/comments/{commentId:guid}")]
    public async Task<ActionResult<CommentDto>> UpdateCommentAsync(
        Guid commentId, UpdateCommentRequest request, CancellationToken cancellationToken)
        => Ok(await _commentService.UpdateCommentAsync(
            commentId, _currentUser.RequireUserId(), _currentUser.IsAdmin, request.Content, cancellationToken));

    [HttpDelete("api/comments/{commentId:guid}")]
    public async Task<IActionResult> DeleteCommentAsync(Guid commentId, CancellationToken cancellationToken)
    {
        await _commentService.DeleteCommentAsync(
            commentId, _currentUser.RequireUserId(), _currentUser.IsAdmin, cancellationToken);
        return NoContent();
    }
}
