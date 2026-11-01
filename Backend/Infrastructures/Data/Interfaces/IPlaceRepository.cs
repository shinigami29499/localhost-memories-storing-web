using Domains.Entities;
using Services.Models.Place;

namespace Infrastructures.Data.Interfaces;

public interface IPlaceRepository
{
    Task<IReadOnlyList<PlaceSource>> GetPlacesAsync(CancellationToken cancellationToken = default);
    Task<PlaceSource?> GetPlaceSourceAsync(Guid placeId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<PlaceVisitSource>> GetPlaceVisitHistoryAsync(
        Guid userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<PlaceVisitSource>> GetAllPlaceVisitHistoryAsync(
        CancellationToken cancellationToken = default);
    Task<IReadOnlyList<PlaceVisitSource>> GetPlaceVisitHistoryForPlaceAsync(
        Guid placeId, CancellationToken cancellationToken = default);
    Task<Place?> FindPlaceAsync(Guid placeId, CancellationToken cancellationToken = default);
    Task<PlaceVisit?> FindPlaceVisitAsync(Guid visitId, CancellationToken cancellationToken = default);
    void AddPlace(Place place);
    void AddPlaceVisit(PlaceVisit visit);

    /// <summary>Returns the ids among <paramref name="mediaIds"/> that are active images.</summary>
    Task<IReadOnlySet<Guid>> GetActiveImageIdsAsync(
        IReadOnlyCollection<Guid> mediaIds, CancellationToken cancellationToken = default);

    /// <summary>Returns the tracked active image links of a place.</summary>
    Task<List<PlaceMedia>> GetPlaceMediaAsync(Guid placeId, CancellationToken cancellationToken = default);
    void AddPlaceMedia(PlaceMedia item);
}
