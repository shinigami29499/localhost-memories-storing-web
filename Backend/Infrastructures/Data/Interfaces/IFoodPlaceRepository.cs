using Domains.Entities;
using Services.Models.Food;

namespace Infrastructures.Data.Interfaces;

public interface IFoodPlaceRepository
{
    Task<IReadOnlyList<FoodPlaceSource>> GetFoodPlacesAsync(CancellationToken cancellationToken = default);
    Task<FoodPlaceSource?> GetFoodPlaceSourceAsync(Guid foodPlaceId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<FoodPlaceVisitSource>> GetFoodPlaceVisitHistoryAsync(
        Guid userId, CancellationToken cancellationToken = default);
    Task<FoodPlace?> FindFoodPlaceAsync(Guid foodPlaceId, CancellationToken cancellationToken = default);
    Task<FoodPlaceVisit?> FindFoodPlaceVisitAsync(Guid visitId, CancellationToken cancellationToken = default);
    void AddFoodPlace(FoodPlace foodPlace);
    void AddFoodPlaceVisit(FoodPlaceVisit visit);

    /// <summary>Returns the ids among <paramref name="mediaIds"/> that are active images.</summary>
    Task<IReadOnlySet<Guid>> GetActiveImageIdsAsync(
        IReadOnlyCollection<Guid> mediaIds, CancellationToken cancellationToken = default);

    /// <summary>Returns the tracked active image links of a food place.</summary>
    Task<List<FoodPlaceMedia>> GetFoodPlaceMediaAsync(Guid foodPlaceId, CancellationToken cancellationToken = default);
    void AddFoodPlaceMedia(FoodPlaceMedia item);
}
