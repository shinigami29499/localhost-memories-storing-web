namespace Services.Requests.Media;

/// <summary>Sets photo coordinates, or removes them when both values are null.</summary>
public sealed record SetMediaLocationRequest(double? Latitude, double? Longitude);
