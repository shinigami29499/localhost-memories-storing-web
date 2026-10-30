namespace Services.Models.Media;

/// <summary>Photo coordinates in decimal degrees (WGS 84).</summary>
public sealed record MediaLocationDto(double Latitude, double Longitude);
