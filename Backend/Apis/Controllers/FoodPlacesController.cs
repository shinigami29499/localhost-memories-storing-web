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
