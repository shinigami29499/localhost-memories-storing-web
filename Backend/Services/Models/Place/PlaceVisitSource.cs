namespace Services.Models.Place;

public sealed record PlaceVisitSource(
    Guid Id,
    Guid PlaceId,
    string PlaceName,
    string PlaceAddress,
    string MarkerIcon,
    DateTime VisitedAt,
    Guid UserId,
    string Username,
    string? AvatarSeed);
