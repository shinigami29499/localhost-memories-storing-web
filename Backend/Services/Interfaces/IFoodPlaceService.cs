using Services.Models.Food;
using Services.Requests.Food;

namespace Services.Interfaces;

public interface IFoodPlaceService
{
    Task<IReadOnlyList<FoodPlaceDto>> GetFoodPlacesAsync(CancellationToken cancellationToken = default);
    Task<FoodPlaceDto> GetFoodPlaceAsync(Guid foodPlaceId, CancellationToken cancellationToken = default);
    Task<FoodPlaceDto> CreateFoodPlaceAsync(
        Guid ownerId, SaveFoodPlaceRequest request, CancellationToken cancellationToken = default);
    Task<FoodPlaceDto> UpdateFoodPlaceAsync(
        Guid foodPlaceId, Guid actorId, bool isAdmin, SaveFoodPlaceRequest request,
        CancellationToken cancellationToken = default);
    Task DeleteFoodPlaceAsync(
        Guid foodPlaceId, Guid actorId, bool isAdmin, CancellationToken cancellationToken = default);
}
