using Apis.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Services.Interfaces;
using Services.Models.Media;
using Services.Responses.Media;

namespace Apis.Controllers;

[ApiController]
[Route("api/previews")]
[Authorize]
public sealed class PreviewsController(IPreviewService previews, ICurrentUserContext currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedMediaResponse<MediaFileDto>>> ListAsync(
        CancellationToken cancellationToken, [FromQuery] int offset = 0, [FromQuery] int limit = 48)
        => Ok(await previews.ListAsync(currentUser.RequireUserId(), offset, limit, cancellationToken));

    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<MediaFileDto>> UploadAsync(IFormFile file, CancellationToken cancellationToken)
    {
        await using var content = file.OpenReadStream();
        return Ok(await previews.UploadAsync(
            currentUser.RequireUserId(), content, file.FileName, file.Length, cancellationToken));
    }

    [HttpGet("{mediaId:guid}")]
    public async Task<ActionResult<MediaFileDto>> GetImageAsync(Guid mediaId, CancellationToken cancellationToken)
        => Ok(await previews.GetImageAsync(mediaId, currentUser.RequireUserId(), cancellationToken));

    [HttpDelete("{mediaId:guid}/draft")]
    public async Task<IActionResult> ReleaseDraftAsync(Guid mediaId, CancellationToken cancellationToken)
    {
        await previews.ReleaseDraftAsync(mediaId, currentUser.RequireUserId(), cancellationToken);
        return NoContent();
    }
}
