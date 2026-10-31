using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Apis.Interfaces;
using Services.Interfaces;
using Services.Models.Food;
using Services.Requests.Food;

namespace Apis.Controllers;

[ApiController]
[Route("api/location/food")]
[Route("api/food-places")]
[Authorize]
public class FoodPlacesController(
    IFoodPlaceService foodPlaceService,
    ICurrentUserContext currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<FoodPlaceDto>>> GetFoodPlacesAsync(
        CancellationToken cancellationToken)
        => Ok(await foodPlaceService.GetFoodPlacesAsync(cancellationToken));

    [HttpGet("{foodPlaceId:guid}")]
    public async Task<ActionResult<FoodPlaceDto>> GetFoodPlaceAsync(
        Guid foodPlaceId, CancellationToken cancellationToken)
        => Ok(await foodPlaceService.GetFoodPlaceAsync(foodPlaceId, cancellationToken));

    [HttpGet("visits")]
    public async Task<ActionResult<IReadOnlyList<FoodPlaceVisitDto>>> GetFoodPlaceVisitHistoryAsync(
        CancellationToken cancellationToken)
        => Ok(await foodPlaceService.GetFoodPlaceVisitHistoryAsync(
            currentUser.RequireUserId(), cancellationToken));

    [HttpPost("{foodPlaceId:guid}/visits")]
    public async Task<IActionResult> CheckInFoodPlaceAsync(
        Guid foodPlaceId, CancellationToken cancellationToken)
    {
        await foodPlaceService.CheckInFoodPlaceAsync(
            foodPlaceId, currentUser.RequireUserId(), cancellationToken);
        return NoContent();
    }

    [HttpDelete("visits/{visitId:guid}")]
    public async Task<IActionResult> DeleteFoodPlaceVisitAsync(
        Guid visitId, CancellationToken cancellationToken)
    {
        await foodPlaceService.DeleteFoodPlaceVisitAsync(
            visitId, currentUser.RequireUserId(), cancellationToken);
        return NoContent();
    }

    [HttpPost]
    public async Task<ActionResult<FoodPlaceDto>> CreateFoodPlaceAsync(
        SaveFoodPlaceRequest request, CancellationToken cancellationToken)
    {
        var created = await foodPlaceService.CreateFoodPlaceAsync(
            currentUser.RequireUserId(), request, cancellationToken);
        return Created($"/api/location/food/{created.Id}", created);
    }

    [HttpPut("{foodPlaceId:guid}")]
    public async Task<ActionResult<FoodPlaceDto>> UpdateFoodPlaceAsync(
        Guid foodPlaceId, SaveFoodPlaceRequest request, CancellationToken cancellationToken)
        => Ok(await foodPlaceService.UpdateFoodPlaceAsync(
            foodPlaceId, currentUser.RequireUserId(), currentUser.IsAdmin, request, cancellationToken));

    [HttpDelete("{foodPlaceId:guid}")]
    public async Task<IActionResult> DeleteFoodPlaceAsync(Guid foodPlaceId, CancellationToken cancellationToken)
    {
        await foodPlaceService.DeleteFoodPlaceAsync(
            foodPlaceId, currentUser.RequireUserId(), currentUser.IsAdmin, cancellationToken);
        return NoContent();
    }
}
