using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Apis.Realtime;
using Apis.Authorization;
using Apis.Interfaces;
using Services.Exceptions;
using Services.Interfaces;
using Services.Models.Media;
using Services.Requests.Media;
using Services.Responses.Media;

namespace Apis.Controllers;

[ApiController]
[Route("api/library/gallery")]
[Route("api/media")]
[Authorize]
public class MediaController(
    IMediaService mediaService,
    IDownloadHistoryService downloadHistory,
    ICurrentUserContext currentUser,
    IHubContext<NotificationsHub> notificationsHub,
    ILogger<MediaController> logger) : ControllerBase
{
    private readonly IMediaService _mediaService = mediaService;
    private readonly ICurrentUserContext _currentUser = currentUser;

    /// <summary>Changes or clears a photo location; restricted to its owner or an administrator.</summary>
    [HttpPut("~/api/location/travel/{mediaId:guid}")]
    [HttpPut("~/api/media/{mediaId:guid}/location")]
    public async Task<IActionResult> SetLocationAsync(
        Guid mediaId, SetMediaLocationRequest request, CancellationToken cancellationToken)
    {
        await _mediaService.SetLocationAsync(
            mediaId, _currentUser.RequireUserId(), _currentUser.IsAdmin, request, cancellationToken);
        return NoContent();
    }

    /// <summary>Extracts GPS from up to 25 unscanned photos owned by the caller (all photos for admins).</summary>
    [HttpPost("~/api/location/travel/scan")]
    [HttpPost("~/api/media/locations/scan")]
    public async Task<ActionResult<ScanMediaLocationsResponse>> ScanLocationsAsync(
        CancellationToken cancellationToken, [FromQuery] int offset = 0)
        => Ok(await _mediaService.ScanLocationsAsync(
            _currentUser.RequireUserId(), _currentUser.IsAdmin, offset, cancellationToken));

    [HttpGet]
    public async Task<ActionResult<PagedMediaResponse<MediaFileDto>>> GetMediaAsync(
        [FromQuery] MediaPageRequest request, CancellationToken cancellationToken)
        => Ok(await _mediaService.GetMediaPageAsync(
            _currentUser.RequireUserId(),
            request.Offset,
            request.Limit,
            request.MediaKind,
            favoritesOnly: false,
            includeDeleted: false,
            cancellationToken));

    [RequireAdmin]
    [HttpGet("deleted")]
    public async Task<ActionResult<PagedMediaResponse<MediaFileDto>>> GetDeletedMediaAsync(
        [FromQuery] MediaPageRequest request, CancellationToken cancellationToken)
        => Ok(await _mediaService.GetMediaPageAsync(
            _currentUser.RequireUserId(),
            request.Offset,
            request.Limit,
            request.MediaKind,
            favoritesOnly: false,
            includeDeleted: true,
            cancellationToken));

    /// <summary>Streams originals or small JPEG previews; includeDeleted is restricted to admins.</summary>
    [HttpGet("{mediaId:guid}/file")]
    public async Task<IActionResult> GetFileAsync(
        Guid mediaId, CancellationToken cancellationToken, [FromQuery] bool includeDeleted = false,
        [FromQuery] bool preview = false, [FromQuery] bool download = false, [FromQuery] Guid? batchId = null)
    {

        if (includeDeleted && !_currentUser.IsAdmin)
            throw new ForbiddenException("Only administrators may preview deleted media.");

        if (includeDeleted || preview)
            Response.Headers.CacheControl = "no-store";

        var media = await _mediaService.GetMediaFileAsync(
            mediaId, includeDeleted, _currentUser.IsAdmin, cancellationToken, preview, _currentUser.RequireUserId());
        if (download && !preview)
            await downloadHistory.RecordAsync(_currentUser.RequireUserId(), mediaId, media.OriginalFilename, batchId, cancellationToken);
        return File(
            media.Content,
            media.MimeType,
            fileDownloadName: media.OriginalFilename,
            enableRangeProcessing: true);
    }

    [RequireAdmin]
    [HttpDelete("{mediaId:guid}")]
    public async Task<IActionResult> DeleteMediaAsync(Guid mediaId, CancellationToken cancellationToken)
    {
        var media = await _mediaService.GetMediaForNotificationAsync(mediaId, cancellationToken);
        await _mediaService.DeleteMediaAsync(
            mediaId, _currentUser.RequireUserId(), _currentUser.IsAdmin, cancellationToken);
        await NotifyMediaChangedAsync(media, "trashed");
        return NoContent();
    }

    [RequireAdmin]
    [HttpPost("{mediaId:guid}/restore")]
    public async Task<IActionResult> RestoreMediaAsync(Guid mediaId, CancellationToken cancellationToken)
    {
        var media = await _mediaService.GetMediaForNotificationAsync(mediaId, cancellationToken);
        await _mediaService.RestoreMediaAsync(
            mediaId, _currentUser.RequireUserId(), _currentUser.IsAdmin, cancellationToken);
        await NotifyMediaChangedAsync(media, "restored");
        return NoContent();
    }

    [RequireAdmin]
    [HttpDelete("{mediaId:guid}/permanent")]
    public async Task<IActionResult> PermanentlyDeleteMediaAsync(Guid mediaId, CancellationToken cancellationToken)
    {
        var media = await _mediaService.GetMediaForNotificationAsync(mediaId, cancellationToken);
        await _mediaService.PermanentlyDeleteMediaAsync(
            mediaId, _currentUser.RequireUserId(), _currentUser.IsAdmin, cancellationToken);
        await NotifyMediaChangedAsync(media, "deleted");
        return NoContent();
    }

    private async Task NotifyMediaChangedAsync(MediaFileDto? media, string action)
    {
        if (media is null) return;
        try
        {
            await notificationsHub.Clients.All.SendAsync("MediaChanged", new {
                mediaId = media.Id, name = media.OriginalFilename, ownerId = media.OwnerId,
                actorId = _currentUser.RequireUserId(), username = _currentUser.RequireUsername(), action
            });
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Could not notify users about media {MediaId}", media.Id);
        }
    }

}
