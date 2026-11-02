using Services.Models.Place;
using Services.Models.Users;

namespace Services.Mappings;

internal static class PlaceMappings
{
    internal static PlaceDto ToDto(PlaceSource source) => new(
        source.Place.Id,
        source.Place.Name,
        source.Place.Address,
        source.Place.Note,
        source.Place.Latitude,
        source.Place.Longitude,
        source.AverageRating,
        source.Place.MarkerIcon,
        source.Place.MarkerColor,
        new UserSummaryDto(source.Owner.Id, source.Owner.Username, source.Owner.AvatarSeed),
        source.Place.CreatedAt,
        source.Place.UpdatedAt,
        source.MediaIds);

    internal static PlaceVisitDto ToDto(PlaceVisitSource source) => new(
        source.Id,
        source.PlaceId,
        source.PlaceName,
        source.PlaceAddress,
        source.MarkerIcon,
        source.MarkerColor,
        source.VisitedAt,
        source.UserId,
        source.Username,
        source.AvatarSeed,
        source.Note,
        source.Rating);
}
