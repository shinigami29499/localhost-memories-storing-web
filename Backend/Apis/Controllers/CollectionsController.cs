using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Apis.Interfaces;
using Services.Interfaces;
using Services.Models.Collections;
using Services.Models.Media;
using Services.Requests.Collections;
using Services.Requests.Media;
using Services.Responses.Media;

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

    [HttpGet("{collectionId:guid}/media")]
    public async Task<ActionResult<PagedMediaResponse<MediaFileDto>>> GetCollectionMediaAsync(
        Guid collectionId, [FromQuery] MediaPageRequest request, CancellationToken cancellationToken)
        => Ok(await collectionService.GetCollectionMediaAsync(
            collectionId, currentUser.RequireUserId(), request, cancellationToken));

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

    [HttpPut("{collectionId:guid}/caption")]
    public async Task<ActionResult<CollectionDto>> UpdateCollectionCaptionAsync(
        Guid collectionId, UpdateCollectionCaptionRequest request, CancellationToken cancellationToken)
        => Ok(await collectionService.UpdateCollectionCaptionAsync(
            collectionId, currentUser.RequireUserId(), request, cancellationToken));

    [HttpDelete("{collectionId:guid}")]
    public async Task<IActionResult> DeleteCollectionAsync(Guid collectionId, CancellationToken cancellationToken)
    {
        await collectionService.DeleteCollectionAsync(collectionId, currentUser.RequireUserId(), cancellationToken);
        return NoContent();
    }

    [HttpPost("{collectionId:guid}/media")]
    public async Task<ActionResult<CollectionDto>> AddMediaAsync(
        Guid collectionId, AddCollectionMediaRequest request, CancellationToken cancellationToken)
        => Ok(await collectionService.AddMediaAsync(
            collectionId, currentUser.RequireUserId(), request.MediaId, cancellationToken));

    [HttpDelete("{collectionId:guid}/media/{mediaId:guid}")]
    public async Task<ActionResult<CollectionDto>> RemoveMediaAsync(
        Guid collectionId, Guid mediaId, CancellationToken cancellationToken)
        => Ok(await collectionService.RemoveMediaAsync(
            collectionId, currentUser.RequireUserId(), mediaId, cancellationToken));
}
