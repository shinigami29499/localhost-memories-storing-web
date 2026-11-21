using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Apis.Authorization;
using Apis.Interfaces;
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
    ICurrentUserContext currentUser) : ControllerBase
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
            cancellationToken));

    [HttpGet("mine/counts")]
    public async Task<ActionResult<OwnedMediaCountsResponse>> GetOwnedMediaCountsAsync(
        CancellationToken cancellationToken)
        => Ok(await _mediaService.GetOwnedMediaCountsAsync(
            _currentUser.RequireUserId(), cancellationToken));

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

    /// <summary>Streams originals or small JPEG previews.</summary>
    [HttpGet("{mediaId:guid}/file")]
    public async Task<IActionResult> GetFileAsync(
        Guid mediaId, CancellationToken cancellationToken, [FromQuery] bool preview = false,
        [FromQuery] int previewSize = 640)
    {
        if (preview)
            Response.Headers.CacheControl = "no-store";

        if (preview && previewSize is not (320 or 640))
            throw new Services.Exceptions.ValidationException(
                "Invalid preview size.", new Dictionary<string, string[]> { ["previewSize"] = ["Choose 320 or 640 pixels."] });

        var media = await _mediaService.GetMediaFileAsync(
            mediaId, cancellationToken, preview, _currentUser.RequireUserId(), previewSize);
        return File(
            media.Content,
            media.MimeType,
            fileDownloadName: media.OriginalFilename,
            enableRangeProcessing: true);
    }
}
