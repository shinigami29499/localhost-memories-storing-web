using Services.Models.Users;

namespace Services.Models.Place;

public sealed record PlaceDto(
    Guid Id,
    string Name,
    string Address,
    string Note,
    double Latitude,
    double Longitude,
    int Rating,
    string MarkerIcon,
    string MarkerColor,
    UserSummaryDto Owner,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    IReadOnlyList<Guid> MediaIds);
