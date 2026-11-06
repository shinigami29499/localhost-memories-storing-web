using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Apis.Realtime;
using Apis.Authorization;
using Apis.Interfaces;
using Services.Exceptions;
using Services.Interfaces;
using Services.Models.Media;
using Services.Models.Place;
using Services.Requests.Media;
using Services.Responses.Media;

namespace Apis.Controllers;

[ApiController]
[Route("api/library/gallery")]
[Route("api/media")]
[Authorize]
public class MediaController(
    IMediaService mediaService,
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

    [HttpGet("~/api/location/travel/map")]
    public async Task<ActionResult<PagedMediaResponse<MediaFileDto>>> GetLocatedMediaPageAsync(
        CancellationToken cancellationToken, [FromQuery] int offset = 0, [FromQuery] int limit = 100,
        [FromQuery] double west = -180, [FromQuery] double south = -90,
        [FromQuery] double east = 180, [FromQuery] double north = 90)
        => Ok(await _mediaService.GetLocatedMediaPageAsync(_currentUser.RequireUserId(), offset, limit,
            new PlaceMapBounds(west, south, east, north), cancellationToken));

    [HttpGet("~/api/location/travel/unlocated")]
    public async Task<ActionResult<PagedMediaResponse<MediaFileDto>>> GetUnlocatedMediaPageAsync(
        CancellationToken cancellationToken, [FromQuery] int offset = 0, [FromQuery] int limit = 50)
        => Ok(await _mediaService.GetUnlocatedMediaPageAsync(
            _currentUser.RequireUserId(), offset, limit, cancellationToken));

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

    [HttpGet("{mediaId:guid}")]
    public async Task<ActionResult<MediaFileDto>> GetMediaByIdAsync(
        Guid mediaId, CancellationToken cancellationToken)
        => Ok(await _mediaService.GetMediaAsync(mediaId, _currentUser.RequireUserId(), cancellationToken));

    /// <summary>Returns whether an active gallery media file exists on disk; restricted to admins.</summary>
    [RequireAdmin]
    [HttpGet("{mediaId:guid}/availability")]
    public async Task<ActionResult<bool>> GetMediaAvailabilityAsync(Guid mediaId, CancellationToken cancellationToken)
    {
        Response.Headers.CacheControl = "no-store";
        return Ok(await _mediaService.IsMediaFileAvailableAsync(
            mediaId, _currentUser.RequireUserId(), _currentUser.IsAdmin, cancellationToken));
    }

    /// <summary>Returns compact media change markers for local gallery reconciliation.</summary>
    [HttpGet("changes")]
    public async Task<ActionResult<MediaChangesResponse>> GetMediaChangesAsync(
        [FromQuery] DateTime? since, CancellationToken cancellationToken)
        => Ok(await _mediaService.GetMediaChangesAsync(
            _currentUser.RequireUserId(), _currentUser.IsAdmin, since, cancellationToken));

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
        [FromQuery] bool preview = false,
        [FromQuery] int previewSize = 640)
    {

        if (includeDeleted && !_currentUser.IsAdmin)
            throw new ForbiddenException("Only administrators may preview deleted media.");

        if (includeDeleted || preview)
            Response.Headers.CacheControl = "no-store";

        if (preview && previewSize is not (320 or 640))
            throw new Services.Exceptions.ValidationException(
                "Invalid preview size.", new Dictionary<string, string[]> { ["previewSize"] = ["Choose 320 or 640 pixels."] });

        var media = await _mediaService.GetMediaFileAsync(
            mediaId, includeDeleted, _currentUser.IsAdmin, cancellationToken, preview, _currentUser.RequireUserId(), previewSize);
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

    /// <summary>Removes a gallery record and its database links without accessing storage.</summary>
    [RequireAdmin]
    [HttpDelete("{mediaId:guid}/record")]
    public async Task<IActionResult> DeleteMediaRecordAsync(Guid mediaId, CancellationToken cancellationToken)
    {
        var media = await _mediaService.GetMediaForNotificationAsync(mediaId, cancellationToken);
        await _mediaService.DeleteMediaRecordAsync(
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
