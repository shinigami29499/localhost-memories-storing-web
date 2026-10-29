using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Apis.Interfaces;
using Services.Interfaces;
using Services.Models.Collections;
using Services.Models.Posts;
using Services.Requests.Collections;
using Services.Requests.Posts;
using Services.Responses.Posts;

namespace Apis.Controllers;

[ApiController]
[Route("api/collections")]
[Authorize]
public class CollectionsController(
    ICollectionService collectionService,
    ICurrentUserContext currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CollectionDto>>> GetCollectionsAsync(
        [FromQuery] CollectionListRequest request, CancellationToken cancellationToken)
        => Ok(await collectionService.GetCollectionsAsync(currentUser.RequireUserId(), request, cancellationToken));

    [HttpGet("{collectionId:guid}")]
    public async Task<ActionResult<CollectionDto>> GetCollectionAsync(
        Guid collectionId, CancellationToken cancellationToken)
        => Ok(await collectionService.GetCollectionAsync(collectionId, currentUser.RequireUserId(), cancellationToken));

    [HttpGet("{collectionId:guid}/posts")]
    public async Task<ActionResult<PagedFeedResponse<PostSummaryDto>>> GetCollectionPostsAsync(
        Guid collectionId, [FromQuery] FeedRequest request, CancellationToken cancellationToken)
        => Ok(await collectionService.GetCollectionPostsAsync(
            collectionId, currentUser.RequireUserId(), request.Offset, request.Limit, cancellationToken));

    [HttpPost]
    public async Task<ActionResult<CollectionDto>> CreateCollectionAsync(
        CreateCollectionRequest request, CancellationToken cancellationToken)
    {
        var created = await collectionService.CreateCollectionAsync(
            currentUser.RequireUserId(), request, cancellationToken);
        return Created($"/api/collections/{created.Id}", created);
    }

    [HttpPut("{collectionId:guid}")]
    public async Task<ActionResult<CollectionDto>> UpdateCollectionAsync(
        Guid collectionId, UpdateCollectionRequest request, CancellationToken cancellationToken)
        => Ok(await collectionService.UpdateCollectionAsync(
            collectionId, currentUser.RequireUserId(), request, cancellationToken));

    [HttpDelete("{collectionId:guid}")]
    public async Task<IActionResult> DeleteCollectionAsync(Guid collectionId, CancellationToken cancellationToken)
    {
        await collectionService.DeleteCollectionAsync(collectionId, currentUser.RequireUserId(), cancellationToken);
        return NoContent();
    }

    [HttpPost("{collectionId:guid}/posts")]
    public async Task<ActionResult<CollectionDto>> AddPostAsync(
        Guid collectionId, AddCollectionPostRequest request, CancellationToken cancellationToken)
        => Ok(await collectionService.AddPostAsync(
            collectionId, currentUser.RequireUserId(), request.PostId, cancellationToken));

    [HttpDelete("{collectionId:guid}/posts/{postId:guid}")]
    public async Task<ActionResult<CollectionDto>> RemovePostAsync(
        Guid collectionId, Guid postId, CancellationToken cancellationToken)
        => Ok(await collectionService.RemovePostAsync(
            collectionId, currentUser.RequireUserId(), postId, cancellationToken));
}
