namespace Services.Models.Place;

public sealed record PlaceMapDto(
    Guid Id, string Name, string Address, string Note, double Latitude, double Longitude,
    double Rating, string MarkerIcon, string MarkerColor, PlaceOwnerDto Owner);
