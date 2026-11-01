using Services.Models.Place;
using Services.Requests.Place;

namespace Services.Interfaces;

public interface IPlaceService
{
    Task<IReadOnlyList<PlaceDto>> GetPlacesAsync(CancellationToken cancellationToken = default);
    Task<PlaceDto> GetPlaceAsync(Guid placeId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<PlaceVisitDto>> GetPlaceVisitHistoryAsync(
        Guid userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<PlaceVisitDto>> GetAllPlaceVisitHistoryAsync(
        CancellationToken cancellationToken = default);
    Task<IReadOnlyList<PlaceVisitDto>> GetPlaceVisitHistoryForPlaceAsync(
        Guid placeId, CancellationToken cancellationToken = default);
    Task CheckInPlaceAsync(
        Guid placeId, Guid userId, CancellationToken cancellationToken = default);
    Task<PlaceDto> CreatePlaceAsync(
        Guid ownerId, SavePlaceRequest request, CancellationToken cancellationToken = default);
    Task<PlaceDto> UpdatePlaceAsync(
        Guid placeId, Guid actorId, bool isAdmin, SavePlaceRequest request,
        CancellationToken cancellationToken = default);
    Task DeletePlaceAsync(
        Guid placeId, Guid actorId, bool isAdmin, CancellationToken cancellationToken = default);
    Task DeletePlaceVisitAsync(
        Guid visitId, Guid actorId, CancellationToken cancellationToken = default);
    Task<PlaceVisitDto> UpdatePlaceVisitAsync(
        Guid visitId, Guid actorId, string? note, int rating, CancellationToken cancellationToken = default);
}
