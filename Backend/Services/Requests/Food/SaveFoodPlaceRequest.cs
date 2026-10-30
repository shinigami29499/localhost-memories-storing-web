namespace Services.Requests.Food;

public sealed record SaveFoodPlaceRequest(
    string Name,
    string? Note,
    double Latitude,
    double Longitude,
    int Rating,
    string? MarkerIcon,
    string? MarkerColor,
    // Null keeps the current images; otherwise replaces them in this order (first is the cover).
    IReadOnlyList<Guid>? MediaIds = null,
    string? Address = null);
