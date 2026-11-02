using Services.Models.Users;

namespace Services.Models.Place;

public sealed record PlaceDto(
    Guid Id,
    string Name,
    string Address,
    string Note,
    double Latitude,
    double Longitude,
    double Rating,
    string MarkerIcon,
    string MarkerColor,
    UserSummaryDto Owner,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    IReadOnlyList<Guid> MediaIds);
