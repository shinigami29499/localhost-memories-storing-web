using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Apis.Interfaces;
using Services.Interfaces;
using Services.Models.Media;
using Services.Requests.Media;
using Services.Responses.Media;

namespace Apis.Controllers;

[ApiController]
[Route("api/library/gallery")]
[Route("api/media")]
[Authorize]
public sealed class MediaFavoritesController(IMediaService mediaService, ICurrentUserContext currentUser) : ControllerBase
{
    [HttpGet("favorites")]
    public async Task<ActionResult<PagedMediaResponse<MediaFileDto>>> GetFavoritesAsync(
        [FromQuery] MediaPageRequest request, CancellationToken cancellationToken)
        => Ok(await mediaService.GetMediaPageAsync(
            currentUser.RequireUserId(),
            request.Offset,
            request.Limit,
            request.MediaKind,
            favoritesOnly: true,
            includeDeleted: false,
            cancellationToken));

    [HttpPost("{mediaId:guid}/favorite")]
    public async Task<IActionResult> FavoriteAsync(Guid mediaId, CancellationToken cancellationToken)
    {
        await mediaService.SetMediaFavoriteAsync(
            mediaId, currentUser.RequireUserId(), isFavorite: true, cancellationToken);
        return NoContent();
    }

    [HttpDelete("{mediaId:guid}/favorite")]
    public async Task<IActionResult> UnfavoriteAsync(Guid mediaId, CancellationToken cancellationToken)
    {
        await mediaService.SetMediaFavoriteAsync(
            mediaId, currentUser.RequireUserId(), isFavorite: false, cancellationToken);
        return NoContent();
    }
}
