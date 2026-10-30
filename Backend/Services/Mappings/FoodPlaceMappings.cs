using Services.Models.Food;
using Services.Models.Users;

namespace Services.Mappings;

internal static class FoodPlaceMappings
{
    internal static FoodPlaceDto ToDto(FoodPlaceSource source) => new(
        source.Place.Id,
        source.Place.Name,
        source.Place.Address,
        source.Place.Note,
        source.Place.Latitude,
        source.Place.Longitude,
        source.Place.Rating,
        source.Place.MarkerIcon,
        source.Place.MarkerColor,
        new UserSummaryDto(source.Owner.Id, source.Owner.Username, source.Owner.AvatarSeed),
        source.Place.CreatedAt,
        source.Place.UpdatedAt,
        source.MediaIds);

    internal static FoodPlaceVisitDto ToDto(FoodPlaceVisitSource source) => new(
        source.Id,
        source.FoodPlaceId,
        source.FoodPlaceName,
        source.FoodPlaceAddress,
        source.MarkerIcon,
        source.VisitedAt);
}
