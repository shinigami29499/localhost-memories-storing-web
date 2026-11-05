using Services.Models.Place;
using Services.Responses.Place;
using Services.Requests.Place;

namespace Services.Interfaces;

public interface IPlaceService
{
    Task<IReadOnlyList<PlaceDto>> GetPlacesAsync(CancellationToken cancellationToken = default);
    Task<PlacePageResponse<PlaceDto>> GetPlacesPageAsync(int page, int limit,
        string? search, int minimumRating, CancellationToken cancellationToken = default);
    Task<PlacePageResponse<PlaceVisitDto>> GetVisitPageAsync(int page, int limit,
        Guid? userId, Guid? placeId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<PlaceMapDto>> GetMapPlacesAsync(CancellationToken cancellationToken = default);
    Task<PlacePageResponse<PlaceMapDto>> GetMapPlacesPageAsync(int page, int limit,
        PlaceMapBounds bounds, CancellationToken cancellationToken = default);
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
