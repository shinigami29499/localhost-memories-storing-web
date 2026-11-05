using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Apis.Interfaces;
using Apis.Realtime;
using Services.Interfaces;
using Services.Models.Place;
using Services.Requests.Place;
using Services.Responses.Place;

namespace Apis.Controllers;

[ApiController]
[Route("api/location")]
[Route("api/location/place")]
[Route("api/places")]
[Route("api/location/food")]
[Route("api/food-places")]
[Authorize]
public class PlacesController(
    IPlaceService placeService,
    ICurrentUserContext currentUser,
    IHubContext<NotificationsHub> notificationsHub,
    ILogger<PlacesController> logger) : ControllerBase
{
    [HttpGet]
    [HttpGet("saved")]
    public async Task<ActionResult<IReadOnlyList<PlaceDto>>> GetPlacesAsync(
        CancellationToken cancellationToken)
        => Ok(await placeService.GetPlacesAsync(cancellationToken));

    [HttpGet("saved/page")]
    public async Task<ActionResult<PlacePageResponse<PlaceDto>>> GetPlacesPageAsync(
        CancellationToken cancellationToken, [FromQuery] int page = 1, [FromQuery] int limit = 20,
        [FromQuery] string? search = null, [FromQuery] int minimumRating = 0)
        => Ok(await placeService.GetPlacesPageAsync(page, limit, search, minimumRating, cancellationToken));

    [HttpGet("map")]
    public async Task<ActionResult<IReadOnlyList<PlaceMapDto>>> GetMapPlacesAsync(
        CancellationToken cancellationToken)
        => Ok(await placeService.GetMapPlacesAsync(cancellationToken));

    [HttpGet("map/page")]
    public async Task<ActionResult<PlacePageResponse<PlaceMapDto>>> GetMapPlacesPageAsync(
        CancellationToken cancellationToken, [FromQuery] int page = 1, [FromQuery] int limit = 100,
        [FromQuery] double west = -180, [FromQuery] double south = -90,
        [FromQuery] double east = 180, [FromQuery] double north = 90)
        => Ok(await placeService.GetMapPlacesPageAsync(page, limit,
            new PlaceMapBounds(west, south, east, north), cancellationToken));

    [HttpGet("{placeId:guid}")]
    public async Task<ActionResult<PlaceDto>> GetPlaceAsync(
        Guid placeId, CancellationToken cancellationToken)
        => Ok(await placeService.GetPlaceAsync(placeId, cancellationToken));

    [HttpGet("visits")]
    [HttpGet("history")]
    public async Task<ActionResult<IReadOnlyList<PlaceVisitDto>>> GetPlaceVisitHistoryAsync(
        CancellationToken cancellationToken)
        => Ok(await placeService.GetPlaceVisitHistoryAsync(
            currentUser.RequireUserId(), cancellationToken));

    [HttpGet("visits/all")]
    [HttpGet("history/all")]
    public async Task<ActionResult<IReadOnlyList<PlaceVisitDto>>> GetAllPlaceVisitHistoryAsync(
        CancellationToken cancellationToken)
        => Ok(await placeService.GetAllPlaceVisitHistoryAsync(cancellationToken));

    [HttpGet("history/page")]
    public async Task<ActionResult<PlacePageResponse<PlaceVisitDto>>> GetVisitPageAsync(
        CancellationToken cancellationToken, [FromQuery] int page = 1, [FromQuery] int limit = 20,
        [FromQuery] bool all = false, [FromQuery] Guid? placeId = null)
        => Ok(await placeService.GetVisitPageAsync(page, limit,
            all ? null : currentUser.RequireUserId(), placeId, cancellationToken));

    [HttpGet("{placeId:guid}/visits")]
    public async Task<ActionResult<IReadOnlyList<PlaceVisitDto>>> GetPlaceVisitHistoryForPlaceAsync(
        Guid placeId, CancellationToken cancellationToken)
        => Ok(await placeService.GetPlaceVisitHistoryForPlaceAsync(placeId, cancellationToken));

    [HttpPost("{placeId:guid}/visits")]
    public async Task<IActionResult> CheckInPlaceAsync(
        Guid placeId, CancellationToken cancellationToken)
    {
        var userId = currentUser.RequireUserId();
        await placeService.CheckInPlaceAsync(
            placeId, userId, cancellationToken);
        var place = await placeService.GetPlaceAsync(placeId, cancellationToken);
        await NotifyPlaceCheckInAsync(userId, currentUser.RequireUsername(), placeId, place.Name);
        return NoContent();
    }

    [HttpDelete("visits/{visitId:guid}")]
    public async Task<IActionResult> DeletePlaceVisitAsync(
        Guid visitId, CancellationToken cancellationToken)
    {
        var userId = currentUser.RequireUserId();
        await placeService.DeletePlaceVisitAsync(
            visitId, userId, cancellationToken);
        await NotifyPlacesChangedAsync(userId, null, cancellationToken);
        return NoContent();
    }

    public sealed record UpdatePlaceVisitRequest(string? Note, int Rating);

    [HttpPut("visits/{visitId:guid}")]
    public async Task<ActionResult<PlaceVisitDto>> UpdatePlaceVisitAsync(
        Guid visitId, UpdatePlaceVisitRequest request, CancellationToken cancellationToken)
    {
        var updated = await placeService.UpdatePlaceVisitAsync(
            visitId, currentUser.RequireUserId(), request.Note, request.Rating, cancellationToken);
        await NotifyPlacesChangedAsync(currentUser.RequireUserId(), updated.PlaceId, cancellationToken);
        return Ok(updated);
    }

    [HttpPost]
    public async Task<ActionResult<PlaceDto>> CreatePlaceAsync(
        SavePlaceRequest request, CancellationToken cancellationToken)
    {
        var userId = currentUser.RequireUserId();
        var created = await placeService.CreatePlaceAsync(
            userId, request, cancellationToken);
        await NotifyPlacesChangedAsync(userId, created.Id, cancellationToken);
        return Created($"/api/location/{created.Id}", created);
    }

    [HttpPut("{placeId:guid}")]
    public async Task<ActionResult<PlaceDto>> UpdatePlaceAsync(
        Guid placeId, SavePlaceRequest request, CancellationToken cancellationToken)
    {
        var userId = currentUser.RequireUserId();
        var updated = await placeService.UpdatePlaceAsync(
            placeId, userId, currentUser.IsAdmin, request, cancellationToken);
        await NotifyPlacesChangedAsync(userId, placeId, cancellationToken);
        return Ok(updated);
    }

    [HttpDelete("{placeId:guid}")]
    public async Task<IActionResult> DeletePlaceAsync(Guid placeId, CancellationToken cancellationToken)
    {
        var userId = currentUser.RequireUserId();
        await placeService.DeletePlaceAsync(
            placeId, userId, currentUser.IsAdmin, cancellationToken);
        await NotifyPlacesChangedAsync(userId, placeId, cancellationToken);
        return NoContent();
    }

    private async Task NotifyPlacesChangedAsync(Guid actorUserId, Guid? placeId, CancellationToken cancellationToken)
    {
        try
        {
            await notificationsHub.Clients.All.SendAsync("PlacesChanged", new
            {
                actorUserId,
                placeId,
            }, cancellationToken);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Could not notify users about place changes for {PlaceId}", placeId);
        }
    }

    private async Task NotifyPlaceCheckInAsync(Guid actorUserId, string username, Guid placeId, string placeName)
    {
        try
        {
            await notificationsHub.Clients.All.SendAsync("PlaceCheckedIn", new
            {
                actorUserId,
                username,
                placeId,
                placeName,
            });
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Could not notify users about check-in at place {PlaceId}", placeId);
        }
    }
}
