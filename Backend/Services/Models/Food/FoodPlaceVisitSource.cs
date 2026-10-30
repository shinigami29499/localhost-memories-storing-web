namespace Services.Models.Food;

public sealed record FoodPlaceVisitSource(
    Guid Id,
    Guid FoodPlaceId,
    string FoodPlaceName,
    string FoodPlaceAddress,
    string MarkerIcon,
    DateTime VisitedAt);
